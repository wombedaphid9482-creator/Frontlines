'use strict';
const {app, BrowserWindow, Menu, ipcMain, screen} = require('electron');
const {autoUpdater} = require('electron-updater');
const path = require('node:path'), fs = require('node:fs'), os = require('node:os');
const Shell = require('./shell-state.js');
const smoke = process.argv.includes('--smoke-test'), shellSmoke = process.argv.includes('--smoke-shell');
const windows = new Set(), matchActive = new Map();
let update = {status:'disabled'}, displayPath, savedDisplay = {};
if (smoke) {
  const profile = path.join(os.tmpdir(), `frontlines-smoke-${process.pid}`);
  fs.mkdirSync(profile, {recursive:true});app.setPath('userData', profile);app.setPath('sessionData', profile);
}
function snapshot(win) {return {version:app.getVersion(),fullscreen:win.isFullScreen(),update:{...update},activeMatch:!!matchActive.get(win)};}
function broadcast() {for(const win of windows)if(!win.isDestroyed())win.webContents.send('frontlines:state-changed', snapshot(win));}
function saveDisplay(win) {
  if(smoke || win.isDestroyed())return;
  savedDisplay = {fullscreen:win.isFullScreen(),bounds:win.getNormalBounds()};
  try {fs.writeFileSync(displayPath, JSON.stringify(savedDisplay));} catch (_) { /* Read-only profiles must not prevent play. */ }
}
function trustedWindow(event) {
  const win = BrowserWindow.fromWebContents(event.sender);
  if(!win || !windows.has(win) || event.senderFrame !== event.sender.mainFrame)throw Error('Untrusted desktop request');
  const url = new URL(event.senderFrame.url), file = decodeURIComponent(url.pathname);
  const allowed = ['index.html','deck-builder.html','simulator.html','collection.html'].map(name=>path.resolve(__dirname,name).replaceAll('\\','/').toLowerCase());
  if(url.protocol !== 'file:' || !allowed.includes(file.replace(/^\/(\w:)/,'$1').toLowerCase()))throw Error('Untrusted game page');
  return win;
}
ipcMain.handle('frontlines:state',event=>snapshot(trustedWindow(event)));
ipcMain.handle('frontlines:fullscreen',(event,value)=>{const win=trustedWindow(event);win.setFullScreen(value===true);return snapshot(win);});
ipcMain.handle('frontlines:match',(event,value)=>{const win=trustedWindow(event);matchActive.set(win,value===true);return snapshot(win);});
ipcMain.handle('frontlines:quit',event=>{trustedWindow(event);app.quit();return true;});
ipcMain.handle('frontlines:check-update',async event=>{
  const win=trustedWindow(event);if(!app.isPackaged || smoke)return snapshot(win);
  if(!['checking','downloading'].includes(update.status)) {
    try {await autoUpdater.checkForUpdates();}catch(error){update={status:'error'};broadcast();console.error('FRONTLINES_UPDATE',error.message);}
  }
  return snapshot(win);
});
ipcMain.handle('frontlines:restart-update',event=>{
  trustedWindow(event);
  if(!Shell.canInstall(update,[...matchActive.values()].some(Boolean)))return {ok:false,reason:'An active match or incomplete update prevents restart.'};
  autoUpdater.quitAndInstall(false,true);return {ok:true};
});
function configureAutoUpdater() {
  if(!app.isPackaged || smoke)return;
  autoUpdater.autoDownload=true;autoUpdater.autoInstallOnAppQuit=false;
  autoUpdater.on('checking-for-update',()=>{update={status:'checking'};broadcast();});
  autoUpdater.on('update-available',info=>{update={status:'available',version:info.version};broadcast();});
  autoUpdater.on('update-not-available',info=>{update={status:'current',version:info.version};broadcast();});
  autoUpdater.on('download-progress',progress=>{update={...update,status:'downloading',percent:progress.percent};broadcast();});
  autoUpdater.on('update-downloaded',info=>{update={status:'ready',version:info.version};broadcast();});
  autoUpdater.on('error',error=>{update={status:'error'};broadcast();console.error('FRONTLINES_UPDATE',error.message);});
  autoUpdater.checkForUpdates().catch(error=>{update={status:'error'};broadcast();console.error('FRONTLINES_UPDATE',error.message);});
}
function createWindow(page='index.html') {
  const previous=savedDisplay.bounds;
  const rectangle=previous&&['x','y','width','height'].every(key=>Number.isFinite(previous[key]))&&previous.width>0&&previous.height>0
    ? Object.fromEntries(['x','y','width','height'].map(key=>[key,Math.round(previous[key])])) : null;
  const display=rectangle&&screen.getDisplayMatching?screen.getDisplayMatching(rectangle):screen.getPrimaryDisplay();
  const area=display.workArea, bounds=Shell.windowBounds(previous,area);
  const win=new BrowserWindow({...bounds,minWidth:Math.min(900,area.width),minHeight:Math.min(600,area.height),show:!smoke,
    fullscreen:savedDisplay.fullscreen===true && !smoke,icon:path.join(__dirname,'assets/ui/frontlines-icon.ico'),autoHideMenuBar:true,
    webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  windows.add(win);matchActive.set(win,false);
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',(event,url)=>{
    const target=new URL(url), directory=path.resolve(__dirname).replaceAll('\\','/').toLowerCase()+'/';
    if(target.protocol!=='file:' || !decodeURIComponent(target.pathname).replace(/^\/(\w:)/,'$1').toLowerCase().startsWith(directory))event.preventDefault();
  });
  win.webContents.on('before-input-event',(event,input)=>{if(Shell.fullscreenShortcut(input)){event.preventDefault();win.setFullScreen(!win.isFullScreen());}});
  win.on('enter-full-screen',()=>{saveDisplay(win);broadcast();});win.on('leave-full-screen',()=>{saveDisplay(win);broadcast();});
  win.on('close',()=>saveDisplay(win));win.on('closed',()=>{windows.delete(win);matchActive.delete(win);});
  win.webContents.on('did-finish-load',()=>{matchActive.set(win,false);broadcast();});
  win.loadFile(path.join(__dirname,page));
  if(smoke)runSmoke(win);
  return win;
}
function runSmoke(win) {
  const timeout=setTimeout(()=>{console.error('FRONTLINES_SMOKE timeout');app.exit(1);},60000);
  win.webContents.once('did-fail-load',(_event,code,message)=>{clearTimeout(timeout);console.error(`FRONTLINES_SMOKE load ${code}: ${message}`);app.exit(1);});
  win.webContents.once('did-finish-load',async()=>{
    try {
      if(shellSmoke) {
        win.webContents.sendInputEvent({type:'keyDown',keyCode:'F11'});
        win.webContents.sendInputEvent({type:'keyUp',keyCode:'F11'});
        await new Promise(resolve=>setTimeout(resolve,250));
        if(!win.isFullScreen())throw Error('Native fullscreen failed');
        const result=await win.webContents.executeJavaScript(`(async()=>{
          if(!document.querySelector('[data-action="open-play"]'))throw Error('Main menu missing');
          FrontlinesShell.openSettings();if(!document.getElementById('display-mode'))throw Error('Display settings missing');
          FrontlinesShell.closeSettings();FrontlinesApp.showScreen('play');
          if(!document.querySelector('[data-action="start"]'))throw Error('Play setup missing');
          FrontlinesApp.startTutorial(false);FrontlinesApp.tutorial.next();
          const lesson=FrontlinesApp.getTutorialState();
          document.querySelector('[data-action="hand"][data-uid="'+lesson.refs.deploy+'"]').click();
          document.querySelector('.territory[data-territory="2"] .territory-header').click();
          if(!FrontlinesApp.getTutorialState().complete)throw Error('Packaged playable tutorial deployment failed');
          FrontlinesApp.tutorial.exit('skip');
          localStorage.setItem(FrontlinesTutorial.STORAGE_KEY,JSON.stringify({version:2,index:11,started:true,complete:false,completedLessons:[0,1,2,3,4,5,6,7,8,9,10]}));
          FrontlinesApp.startTutorial(true);document.querySelector('[data-action="commander"][data-player="0"]').click();
          const commanderLesson=FrontlinesApp.getTutorialState();document.querySelector('[data-action="unit"][data-uid="'+commanderLesson.refs.activeAlly+'"]').click();
          if(!FrontlinesApp.getState().players[0].commander.used||!FrontlinesApp.getTutorialState().complete)throw Error('Packaged Commander tutorial activation failed');
          FrontlinesApp.tutorial.exit('skip');FrontlinesApp.showScreen('home');
          const host=await FrontlinesDesktop.getState();
          if(FrontlinesBuild.version!==host.version||!document.querySelector('[data-game-version]').textContent.includes('v'+host.version))throw Error('Installed version indicator mismatch');
          return {page:'shell',home:true,play:true,settings:true,tutorialDeployment:true,commanderTutorialActivation:true,installedVersionVisible:true,fullscreen:host.fullscreen};
        })()`);
        win.webContents.sendInputEvent({type:'keyDown',keyCode:'Enter',modifiers:['alt']});
        win.webContents.sendInputEvent({type:'keyUp',keyCode:'Enter',modifiers:['alt']});
        await new Promise(resolve=>setTimeout(resolve,150));
        if(win.isFullScreen())throw Error('Return to windowed failed');
        clearTimeout(timeout);console.log('FRONTLINES_SMOKE '+JSON.stringify({version:app.getVersion(),...result,windowed:true,shortcuts:['F11','Alt+Enter']}));app.exit(0);return;
      }
      const result=await win.webContents.executeJavaScript(`(async()=>{
        if(location.pathname.endsWith('collection.html')) {
          const profile=FrontlinesCollection.load(),summary=FrontlinesCollection.summary(profile);
          if(!document.querySelector('#collection-app')||!profile||profile.credits<0)throw Error('Collection launch failed');
          if(summary.commanders.owned!==10||summary.uniqueOwned!==63||summary.copiesOwned!==171)throw Error('Commander collection grant failed');
          return {page:'collection',summary,packs:Object.keys(FrontlinesCollection.PACKS).length};
        }
        if(location.pathname.endsWith('deck-builder.html')) {
          const deck=FrontlinesDeckBuilder.getDeck(),validation=FrontlinesDecks.forData(FrontlinesData).validate(deck);
          if(!validation.legal)throw Error('Illegal Arsenal starter');
          if(FrontlinesDeckBuilder.getCommanderStarters().length!==10||!deck.commanderId)throw Error('Commander Arsenal failed');
          return {page:'arsenal',commanderId:deck.commanderId,foundations:10,cards:Object.keys(FrontlinesData.CARDS).length,deckSize:deck.cards.length};
        }
        if(location.pathname.endsWith('simulator.html')) {
          FrontlinesSimulatorApp.start({mode:'duel',deckA:'stonewall-starter',deckB:'bruiser-starter',count:2,seed:7317,balanceProfile:FrontlinesBalance.DEFAULT_PROFILE,aiProfiles:['deck','deck']});
          for(let i=0;i<2000;i++) {
            const status=FrontlinesSimulatorApp.getStatus();
            if(status.status==='completed'){const report=FrontlinesSimulatorApp.getReport();if(report.completed!==2||report.summary.errors||report.summary.unfinished)throw Error('Simulator smoke failed');return {page:'warroom',completed:report.completed,errors:report.summary.errors,commanders:report.summary.byCommander.map(c=>({id:c.id,activeUses:c.activeUses,passiveTriggers:c.passiveTriggers})),runner:status.runner};}
            if(status.status==='error')throw Error('Simulator runner failed');await new Promise(resolve=>setTimeout(resolve,20));
          }
          throw Error('Simulator timeout');
        }
        const templates=FrontlinesDecks.forData(FrontlinesData).presets(),expanded=[templates.find(d=>d.archetype==='planned-exposure'),templates.find(d=>d.archetype==='field-improvisation')];
        FrontlinesApp.startMatch({mode:'hotseat',factions:['nightwalker','rogue'],...(expanded.every(Boolean)?{decks:expanded}:{}),seed:7317,developer:true,bothHands:true});
        let decisions=0;while(FrontlinesApp.getState().winner===null&&decisions<3000){const action=FrontlinesAI.chooseAction(FrontlinesApp.getState());if(!action)throw Error('No AI action');FrontlinesApp.dispatch(action);decisions++;}
        const final=FrontlinesApp.getState();if(final.winner===null)throw Error('Game did not finish');
        return {page:'game',winner:final.winner,turns:final.turn,decisions,units:final.units.length,cards:Object.keys(FrontlinesData.CARDS).length,decks:final.players.map(p=>p.deckMeta.id),commanders:final.players.map(p=>({id:p.commander.id,used:p.commander.used}))};
      })()`);
      clearTimeout(timeout);console.log('FRONTLINES_SMOKE '+JSON.stringify({version:app.getVersion(),...result}));app.exit(0);
    }catch(error){clearTimeout(timeout);console.error('FRONTLINES_SMOKE '+error.message);app.exit(1);}
  });
}
app.whenReady().then(()=>{
  displayPath=path.join(app.getPath('userData'),'display.json');
  try {savedDisplay=JSON.parse(fs.readFileSync(displayPath,'utf8'));if(!savedDisplay||typeof savedDisplay!=='object')savedDisplay={};}catch(_){savedDisplay={};}
  function navigate(page){const win=BrowserWindow.getFocusedWindow() || [...windows][0];if(win)win.webContents.send('frontlines:navigate',page);}
  Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'Frontlines',submenu:[
    {label:'Command menu',click:()=>navigate('home')},{label:'Arsenal',click:()=>navigate('arsenal')},{label:'Collection / Pack Shop',click:()=>navigate('collection')},{label:'War Room / Balance Lab',click:()=>navigate('warroom')},
    {label:'Settings',click:()=>navigate('settings')},{type:'separator'},{role:'quit'}]},
    {label:'Display',submenu:[{label:'Toggle fullscreen',accelerator:'F11',click:()=>{const win=BrowserWindow.getFocusedWindow();if(win)win.setFullScreen(!win.isFullScreen());}},{role:'minimize'}]}]));
  createWindow(process.argv.includes('--collection')?'collection.html':process.argv.includes('--simulator')?'simulator.html':process.argv.includes('--arsenal')?'deck-builder.html':'index.html');
  configureAutoUpdater();app.on('activate',()=>{if(!windows.size)createWindow();});
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
