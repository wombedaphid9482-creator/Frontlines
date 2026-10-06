'use strict';
// Exercise the actual Electron host and preload with isolated local profiles and no network.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {EventEmitter} = require('node:events');
const {pathToFileURL} = require('node:url');
const Shell = require('../shell-state.js');
const base = path.resolve(__dirname, '..');
const resultRoot = path.join(base, 'test-results');
fs.mkdirSync(resultRoot, {recursive:true});
const plain = value => JSON.parse(JSON.stringify(value));

async function host(t, options = {}) {
  const profile = fs.mkdtempSync(path.join(resultRoot, 'desktop-test-'));
  t.after(() => {
    const resolved = path.resolve(profile);
    assert.ok(resolved.startsWith(path.resolve(resultRoot) + path.sep), 'Cleanup remains inside test-results');
    fs.rmSync(resolved, {recursive:true,force:true});
  });
  if (options.saved !== undefined) fs.writeFileSync(path.join(profile,'display.json'), typeof options.saved === 'string' ? options.saved : JSON.stringify(options.saved));
  const app = new EventEmitter();
  const logs = [], handlers = new Map(), allWindows = [], fullscreenCalls = [], checkCalls = [], installs = [], displayRequests = [];
  let focused = null, applicationMenu;
  app.isPackaged = options.packaged === true;
  app.getVersion = () => '0.6.0'; app.whenReady = () => Promise.resolve();
  app.getPath = () => profile; app.setPath = () => {throw Error('Test must not redirect the owner profile');};
  app.quit = () => {app.quits = (app.quits || 0) + 1;};
  app.exit = code => {app.exitCode = code;};
  class WebContents extends EventEmitter {
    constructor(win) {super();this.win=win;this.mainFrame={url:''};this.messages=[];}
    send(channel, value) {this.messages.push({channel,value:plain(value)});}
    setWindowOpenHandler(handler) {this.openHandler=handler;}
  }
  class Window extends EventEmitter {
    constructor(config) {
      super(); this.config=plain(config); this.fullscreen=!!config.fullscreen; this.destroyed=false;
      this.bounds={x:config.x,y:config.y,width:config.width,height:config.height};this.webContents=new WebContents(this);
      allWindows.push(this);focused=this;
    }
    isFullScreen() {return this.fullscreen;}
    setFullScreen(value) {
      fullscreenCalls.push({win:this,value});
      if(this.fullscreen===value)return;
      this.fullscreen=value;this.emit(value?'enter-full-screen':'leave-full-screen');
    }
    getNormalBounds() {return {...this.bounds};}
    isDestroyed() {return this.destroyed;}
    loadFile(file) {this.file=file;this.webContents.mainFrame.url=pathToFileURL(file).href;}
    close() {this.emit('close');this.destroyed=true;this.emit('closed');if(focused===this)focused=null;}
    static fromWebContents(contents) {return allWindows.find(win=>win.webContents===contents);}
    static getFocusedWindow() {return focused;}
  }
  const updater = new EventEmitter();
  updater.checkForUpdates = () => {checkCalls.push(Date.now());return options.checkError ? Promise.reject(Error(options.checkError)) : Promise.resolve({});};
  updater.quitAndInstall = (...args) => {installs.push(args);};
  const electron = {app,BrowserWindow:Window,ipcMain:{handle:(channel,handler)=>handlers.set(channel,handler)},screen:{getPrimaryDisplay:()=>({workArea:options.area||{x:0,y:0,width:1920,height:1040}})},Menu:{buildFromTemplate:template=>template,setApplicationMenu:menu=>{applicationMenu=menu;}}};
  if (options.secondaryArea) electron.screen.getDisplayMatching = rectangle => {displayRequests.push(plain(rectangle));return {workArea:options.secondaryArea};};
  const context = vm.createContext({
    require: id => id==='electron' ? electron : id==='electron-updater' ? {autoUpdater:updater} : id==='./shell-state.js' ? Shell : require(id.startsWith('./')?path.join(base,id):id),
    __dirname:base,__filename:path.join(base,'desktop.js'),process:{argv:['electron','desktop.js'],platform:'win32',pid:process.pid},
    URL,console:{log:(...items)=>logs.push(items.join(' ')),error:(...items)=>logs.push(items.join(' '))},setTimeout,clearTimeout
  });
  vm.runInContext(fs.readFileSync(path.join(base,'desktop.js'),'utf8'),context,{filename:path.join(base,'desktop.js')});
  await Promise.resolve();await Promise.resolve();
  const win=allWindows[0];assert.ok(win,'Actual host opened its initial window');
  const event = (target=win, overrides={}) => ({sender:target.webContents,senderFrame:target.webContents.mainFrame,...overrides});
  const invoke = async (channel,value,target=win,overrides={}) => handlers.get(channel)(event(target,overrides),value);
  return {app,win,windows:allWindows,context,handlers,invoke,event,updater,checkCalls,installs,fullscreenCalls,displayRequests,profile,logs,menu:()=>applicationMenu,create:()=>context.createWindow()};
}

test('desktop IPC accepts only a registered local main frame, including Arsenal and War Room', async t => {
  const h=await host(t);
  assert.deepEqual([...h.handlers.keys()].sort(),['frontlines:check-update','frontlines:fullscreen','frontlines:match','frontlines:quit','frontlines:restart-update','frontlines:state','frontlines:multiplayer','frontlines:multiplayer-state'].sort());
  for(const page of ['index.html','deck-builder.html','simulator.html']) {
    h.win.webContents.mainFrame.url=pathToFileURL(path.join(base,page)).href+'?screen=play#panel';
    assert.equal((await h.invoke('frontlines:state')).version,'0.6.0');
  }
  const channels=[...h.handlers.keys()];
  for(const channel of channels) {
    await assert.rejects(h.invoke(channel,true,h.win,{senderFrame:{url:h.win.webContents.mainFrame.url}}),/Untrusted desktop request/,'Iframe cannot issue '+channel);
    const foreign=new EventEmitter();foreign.mainFrame={url:pathToFileURL(path.join(base,'index.html')).href};
    await assert.rejects(h.invoke(channel,true,h.win,{sender:foreign,senderFrame:foreign.mainFrame}),/Untrusted desktop request/,'Unregistered renderer cannot issue '+channel);
  }
  for(const url of ['https://example.com/index.html',pathToFileURL(path.join(base,'docs','index.html')).href,pathToFileURL(path.join(path.dirname(base),'index.html')).href,pathToFileURL(path.join(base,'engine.js')).href]) {
    h.win.webContents.mainFrame.url=url;
    await assert.rejects(h.invoke('frontlines:fullscreen',true),/Untrusted game page/);
    await assert.rejects(h.invoke('frontlines:restart-update'),/Untrusted game page/);
  }
  assert.equal(h.fullscreenCalls.length,0);assert.equal(h.installs.length,0);assert.equal(h.app.quits||0,0);
  h.win.webContents.mainFrame.url=pathToFileURL(path.join(base,'index.html')).href;
  h.win.close();await assert.rejects(h.invoke('frontlines:state'),/Untrusted desktop request/);
});

test('the actual host keeps native capabilities sandboxed and restricts external navigation', async t => {
  const h=await host(t);
  assert.equal(h.win.config.webPreferences.contextIsolation,true);
  assert.equal(h.win.config.webPreferences.nodeIntegration,false);
  assert.equal(h.win.config.webPreferences.sandbox,true);
  assert.equal(h.win.config.webPreferences.preload,path.join(base,'preload.js'));
  assert.equal(h.win.webContents.openHandler({url:'https://example.com'}).action,'deny');
  for(const [url,blocked] of [[pathToFileURL(path.join(base,'simulator.html')).href,false],['https://example.com',true],[pathToFileURL(path.join(path.dirname(base),'other.html')).href,true]]) {
    let prevented=false;h.win.webContents.emit('will-navigate',{preventDefault:()=>{prevented=true;}},url);assert.equal(prevented,blocked,url);
  }
});

test('native fullscreen shortcuts toggle once, broadcast state and preserve Escape as a game key', async t => {
  const h=await host(t);
  function key(input) {let prevented=false;h.win.webContents.emit('before-input-event',{preventDefault:()=>{prevented=true;}},input);return prevented;}
  assert.equal(key({type:'keyDown',key:'F11'}),true);assert.equal(h.win.isFullScreen(),true);
  assert.equal(key({type:'keyDown',key:'F11',isAutoRepeat:true}),false);assert.equal(key({type:'keyUp',key:'F11'}),false);assert.equal(h.fullscreenCalls.length,1);
  assert.equal(key({type:'keyDown',key:'Enter',alt:true}),true);assert.equal(h.win.isFullScreen(),false);assert.equal(h.fullscreenCalls.length,2);
  for(const input of [{type:'keyDown',key:'Enter'},{type:'keyDown',key:'Escape'},{type:'keyDown',key:'F11',control:true},{type:'keyDown',key:'F11',meta:true}])assert.equal(key(input),false);
  assert.equal(h.app.quits||0,0);
  assert.deepEqual(h.win.webContents.messages.filter(message=>message.channel==='frontlines:state-changed').map(message=>message.value.fullscreen),[true,false]);
  assert.equal((await h.invoke('frontlines:fullscreen',true)).fullscreen,true);
  assert.equal((await h.invoke('frontlines:fullscreen','true')).fullscreen,false,'IPC uses a strict boolean');
});

test('display preferences restore true fullscreen and recover inaccessible bounds before persisting a new window', async t => {
  const h=await host(t,{saved:{fullscreen:true,bounds:{x:7000,y:-3000,width:4000,height:2000}},area:{x:-1366,y:0,width:1366,height:728}});
  assert.equal(h.win.isFullScreen(),true);assert.deepEqual(h.win.bounds,{x:-1366,y:0,width:1366,height:728});
  assert.equal(h.win.config.minWidth,900);assert.equal(h.win.config.minHeight,600);
  h.win.bounds={x:-1280,y:22,width:1100,height:650};await h.invoke('frontlines:fullscreen',false);
  const saved=JSON.parse(fs.readFileSync(path.join(h.profile,'display.json'),'utf8'));
  assert.deepEqual(saved,{fullscreen:false,bounds:h.win.bounds});
  h.win.close();const reopened=h.create();assert.equal(reopened.isFullScreen(),false);assert.deepEqual(reopened.bounds,h.win.bounds);
  const tiny=await host(t,{saved:'{ malformed JSON',area:{x:0,y:0,width:800,height:500}});
  assert.equal(tiny.win.isFullScreen(),false);assert.deepEqual(tiny.win.bounds,{x:0,y:0,width:800,height:500});assert.equal(tiny.win.config.minWidth,800);assert.equal(tiny.win.config.minHeight,500);
});

test('fullscreen restoration selects the remembered secondary display and still recovers missing or off-screen bounds', async t => {
  const secondaryArea={x:1920,y:0,width:2560,height:1400};
  const h=await host(t,{secondaryArea,saved:{fullscreen:true,bounds:{x:2120.4,y:50.3,width:1400.4,height:900.4}}});
  assert.deepEqual(h.displayRequests,[{x:2120,y:50,width:1400,height:900}]);
  assert.deepEqual(h.win.bounds,{x:2120,y:50,width:1400,height:900});assert.equal(h.win.isFullScreen(),true);
  const missing=await host(t,{secondaryArea,saved:{fullscreen:true,bounds:{x:10000,y:-5000,width:5000,height:3000}}});
  assert.equal(missing.displayRequests.length,1);assert.deepEqual(missing.win.bounds,{x:1920,y:0,width:2560,height:1400});assert.equal(missing.win.isFullScreen(),true);
  const malformed=await host(t,{secondaryArea,saved:{fullscreen:true,bounds:{x:'invalid',y:0,width:1280,height:800}}});
  assert.equal(malformed.displayRequests.length,0,'Malformed saved rectangles use the primary display');
  assert.ok(malformed.win.bounds.x>=0&&malformed.win.bounds.x+malformed.win.bounds.width<=1920);
  assert.equal(h.win.config.webPreferences.contextIsolation,true);assert.equal(h.checkCalls.length,0);
});

test('downloaded updates never force a restart, and installation is blocked by a match in any window', async t => {
  const h=await host(t,{packaged:true});
  assert.equal(h.checkCalls.length,1);assert.equal(h.updater.autoDownload,true);assert.equal(h.updater.autoInstallOnAppQuit,false);
  const other=h.create();await h.invoke('frontlines:match',true);
  for(const [name,payload,status] of [['checking-for-update',{},'checking'],['update-available',{version:'0.6.1'},'available'],['download-progress',{percent:40},'downloading']]) {
    h.updater.emit(name,payload);assert.equal((await h.invoke('frontlines:state')).update.status,status);
    assert.equal((await h.invoke('frontlines:restart-update',undefined,other)).ok,false);
  }
  h.updater.emit('update-downloaded',{version:'0.6.1'});
  assert.equal((await h.invoke('frontlines:state')).update.status,'ready');assert.equal(h.installs.length,0);assert.equal(h.app.quits||0,0);
  assert.equal((await h.invoke('frontlines:restart-update',undefined,other)).ok,false,'An idle second window cannot bypass the active match');
  await h.invoke('frontlines:match',false);
  assert.equal((await h.invoke('frontlines:restart-update',undefined,other)).ok,true);assert.deepEqual(h.installs,[[false,true]]);
  await h.invoke('frontlines:match',true);h.win.close();
  assert.equal((await h.invoke('frontlines:restart-update',undefined,other)).ok,true,'Closed windows cannot leave a stale restart lock');
  assert.ok(other.webContents.messages.some(message=>message.channel==='frontlines:state-changed'&&message.value.update.status==='ready'));
});

test('manual update checks avoid duplicate work, failures stay recoverable and development never checks the network', async t => {
  const dev=await host(t);await dev.invoke('frontlines:check-update');assert.equal(dev.checkCalls.length,0);assert.equal(dev.updater.listenerCount('update-downloaded'),0);
  const h=await host(t,{packaged:true});
  h.updater.emit('checking-for-update');await h.invoke('frontlines:check-update');assert.equal(h.checkCalls.length,1);
  h.updater.emit('download-progress',{percent:20});await h.invoke('frontlines:check-update');assert.equal(h.checkCalls.length,1);
  h.updater.emit('update-not-available',{version:'0.6.0'});await h.invoke('frontlines:check-update');assert.equal(h.checkCalls.length,2);
  h.updater.emit('error',Error('Expected offline error'));assert.equal((await h.invoke('frontlines:state')).update.status,'error');assert.equal(h.app.quits||0,0);assert.equal(h.installs.length,0);
  const unavailable=await host(t,{packaged:true,checkError:'Expected startup rejection'});
  await Promise.resolve();assert.equal((await unavailable.invoke('frontlines:state')).update.status,'error');
  await unavailable.invoke('frontlines:check-update');assert.equal(unavailable.checkCalls.length,2);assert.equal(unavailable.app.quits||0,0);
});

test('navigation state clears match activity after a page load and menu navigation preserves the renderer route', async t => {
  const h=await host(t);
  await h.invoke('frontlines:match',true);assert.equal((await h.invoke('frontlines:state')).activeMatch,true);
  h.win.webContents.emit('did-finish-load');assert.equal((await h.invoke('frontlines:state')).activeMatch,false);
  const submenu=h.menu().find(item=>item.label==='Frontlines').submenu;
  for(const [label,route] of [['Command menu','home'],['Arsenal','arsenal'],['War Room / Balance Lab','warroom'],['Settings','settings']]) {
    submenu.find(item=>item.label===label).click();assert.deepEqual(h.win.webContents.messages.at(-1),{channel:'frontlines:navigate',value:route});
  }
  await h.invoke('frontlines:quit');assert.equal(h.app.quits,1);
});

test('the actual preload exposes only fixed desktop requests and removes event subscribers', () => {
  const renderer=new EventEmitter(),calls=[];renderer.invoke=(...args)=>{calls.push(args);return Promise.resolve({});};
  let exposed;
  const context=vm.createContext({require:id=>{assert.equal(id,'electron');return {contextBridge:{exposeInMainWorld:(name,api)=>{assert.equal(name,'FrontlinesDesktop');exposed=api;}},ipcRenderer:renderer};}});
  vm.runInContext(fs.readFileSync(path.join(base,'preload.js'),'utf8'),context,{filename:path.join(base,'preload.js')});
  assert.deepEqual(Object.keys(exposed).sort(),['checkUpdate','getState','onNavigate','onState','quit','restartUpdate','setFullscreen','setMatchActive','multiplayer','getMultiplayerState','onMultiplayer'].sort());
  exposed.getState();exposed.setFullscreen(true);exposed.setFullscreen('true');exposed.setMatchActive(true);exposed.checkUpdate();exposed.restartUpdate();exposed.quit();
  assert.deepEqual(calls,[['frontlines:state'],['frontlines:fullscreen',true],['frontlines:fullscreen',false],['frontlines:match',true],['frontlines:check-update'],['frontlines:restart-update'],['frontlines:quit']]);
  const states=[],routes=[],removeState=exposed.onState(state=>states.push(state)),removeNavigate=exposed.onNavigate(route=>routes.push(route));
  renderer.emit('frontlines:state-changed',{}, {fullscreen:true});renderer.emit('frontlines:navigate',{},'warroom');
  assert.deepEqual(states,[{fullscreen:true}]);assert.deepEqual(routes,['warroom']);
  removeState();removeNavigate();renderer.emit('frontlines:state-changed',{},{});renderer.emit('frontlines:navigate',{},'home');
  assert.equal(states.length,1);assert.equal(routes.length,1);assert.equal(renderer.listenerCount('frontlines:state-changed'),0);assert.equal(renderer.listenerCount('frontlines:navigate'),0);
});
