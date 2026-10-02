/* Shared command interface. Navigation leaves the authoritative engine alone. */
(function (root) {
  'use strict';
  const S = root.FrontlinesShellState, native = root.FrontlinesDesktop;
  const STORAGE = 'frontlines.settings.v1';
  const escape = text => String(text == null ? '' : text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let prefs, desktop = {version:S.VERSION, fullscreen:false, update:{status:'disabled'}}, activeMatch = false;
  let overlay = null, focusBefore = null, settingsTab = 'display', dismissedUpdate = '', inertNodes = [];
  try { prefs = S.preferences(JSON.parse(localStorage.getItem(STORAGE))); } catch (_) { prefs = S.preferences(); }
  function applyPreferences() {
    document.body.classList.toggle('reduce-effects', prefs.reducedEffects || root.matchMedia('(prefers-reduced-motion: reduce)').matches);
    document.body.classList.toggle('reduce-shake', prefs.reducedShake);
    document.body.dataset.animationSpeed = prefs.animationSpeed;
    root.FrontlinesEffects?.configure(prefs);
  }
  function savePreferences(values) {
    prefs = S.preferences({...prefs, ...values});
    try { const prior = JSON.parse(localStorage.getItem(STORAGE) || '{}');localStorage.setItem(STORAGE, JSON.stringify({...prior,...prefs})); } catch (_) {}
    applyPreferences();root.dispatchEvent(new CustomEvent('frontlines-settings', {detail:{...prefs}}));
  }
  function closeSettings() {
    if (!overlay) return;
    overlay.remove();overlay = null;
    for (const [node, old] of inertNodes) node.inert = old;
    inertNodes = [];focusBefore?.focus();root.dispatchEvent(new CustomEvent('frontlines-settings-closed'));
  }
  function settingsBody() {
    if (settingsTab === 'display') return '<h3>Display</h3><label for="display-mode">Display mode</label><select id="display-mode"><option value="windowed" '+(!desktop.fullscreen?'selected':'')+'>Windowed</option><option value="fullscreen" '+(desktop.fullscreen?'selected':'')+'>Fullscreen</option></select><p class="shell-help">'+(native?'F11 or Alt + Enter toggles true desktop fullscreen. Your display preference is remembered.':'Fullscreen uses your browser’s display controls. F11 is available in desktop browsers.')+'</p><p class="shell-help">Escape closes an overlay or returns from a submenu. It does not quit the game.</p>';
    if (settingsTab === 'interface') return '<h3>Interface</h3><label for="shell-animation">Animation speed</label><select id="shell-animation"><option value="normal" '+(prefs.animationSpeed==='normal'?'selected':'')+'>Normal</option><option value="fast" '+(prefs.animationSpeed==='fast'?'selected':'')+'>Fast</option></select><label class="shell-check"><input type="checkbox" data-pref="reducedEffects" '+(prefs.reducedEffects?'checked':'')+'>Reduced motion and visual effects</label><label class="shell-check"><input type="checkbox" data-pref="reducedShake" '+(prefs.reducedShake?'checked':'')+'>Reduced screen shake</label><p class="shell-help">Your system’s reduced-motion preference is also respected.</p>';
    if (settingsTab === 'audio') return '<h3>Audio</h3><label class="shell-check"><input type="checkbox" data-pref="sound" '+(prefs.sound?'checked':'')+'>Enable effects audio</label><label for="shell-volume">Master / effects volume <output id="shell-volume-value">'+Math.round(prefs.masterVolume*100)+'%</output></label><input id="shell-volume" type="range" min="0" max="100" step="5" value="'+Math.round(prefs.masterVolume*100)+'"><p class="shell-help">Frontlines currently uses short synthesized effects. No music channel is included.</p>';
    return '<h3>About & advanced</h3><p class="shell-version">Frontlines v'+escape(desktop.version || S.VERSION)+'</p><p class="shell-help">War Room provides deck testing. Its Advanced Lab keeps seeds, profiles, traces and detailed diagnostics available.</p><button class="command secondary" data-shell-action="advanced-lab">Open Advanced Lab</button><div class="shell-update-settings"><h3>Updates</h3><p id="settings-update-text">'+escape(S.updateText(desktop.update))+'</p><button class="command secondary" data-shell-action="check-update" '+(!native||['checking','downloading'].includes(desktop.update?.status)?'disabled':'')+'>Check for updates</button><button class="command primary" data-shell-action="restart-update" '+(!S.canInstall(desktop.update,activeMatch)?'disabled':'')+'>Restart & update</button><p class="shell-help">'+(activeMatch?'Finish or leave the active match before restarting.':'Updates never restart an active match automatically.')+'</p></div>';
  }
  function renderSettings() {
    if (!overlay) return;
    overlay.innerHTML = '<section class="shell-settings" role="dialog" aria-modal="true" aria-labelledby="shell-settings-title"><header><div><span class="shell-eyebrow">COMMAND / PREFERENCES</span><h2 id="shell-settings-title">Settings</h2></div><button class="command tertiary" data-shell-action="close-settings" aria-label="Close settings">Close ×</button></header><div class="shell-settings-layout"><nav aria-label="Settings categories">'+['display','interface','audio','advanced'].map(tab=>'<button class="command '+(tab===settingsTab?'selected':'tertiary')+'" data-settings-tab="'+tab+'" aria-pressed="'+(tab===settingsTab)+'">'+({display:'Display',interface:'Interface',audio:'Audio',advanced:'About & advanced'}[tab])+'</button>').join('')+'</nav><div class="shell-settings-content">'+settingsBody()+'</div></div><footer><span>Preferences save automatically on this device.</span><button class="command primary" data-shell-action="close-settings">Return to command</button></footer></section>';
  }
  function openSettings(tab) {
    if (overlay) return;
    settingsTab = ['display','interface','audio','advanced'].includes(tab) ? tab : 'display';focusBefore = document.activeElement;
    overlay = document.createElement('div');overlay.className = 'shell-overlay';overlay.dataset.shellOverlay = 'settings';
    inertNodes = [...document.body.children].map(n=>[n,n.inert]);for(const [n] of inertNodes)n.inert=true;
    document.body.appendChild(overlay);renderSettings();overlay.querySelector('button')?.focus();
    root.dispatchEvent(new CustomEvent('frontlines-settings-opened'));
  }
  function pageFor(screen) { return {home:'index.html',play:'index.html?screen=play',arsenal:'deck-builder.html',warroom:'simulator.html',advanced:'simulator.html?view=advanced'}[screen]; }
  function navigate(screen) {
    if (screen === 'settings') {openSettings();return;}
    closeSettings();
    const game = root.FrontlinesApp;
    if (game && ['home','play'].includes(screen)) {game.showScreen(screen);return;}
    const target = pageFor(screen);if(!target)return;
    if(root.FrontlinesDeckBuilder?.hasUnsavedChanges?.() && !root.FrontlinesDeckBuilder.confirmLeave())return;
    if(activeMatch && !root.confirm('Leave this match? Its battlefield will be cleared. Saved decks are kept.'))return;
    location.assign(target);
  }
  async function fullscreen(value) {
    try {
      if(native)desktop=await native.setFullscreen(value);
      else if(value && !document.fullscreenElement)await document.documentElement.requestFullscreen();
      else if(!value && document.fullscreenElement)await document.exitFullscreen();
      if(!native)desktop.fullscreen=!!document.fullscreenElement;
      const control=document.getElementById('display-mode');if(control)control.value=desktop.fullscreen?'fullscreen':'windowed';
    } catch (_) { const control=document.getElementById('display-mode');if(control)control.value=desktop.fullscreen?'fullscreen':'windowed';root.alert('Fullscreen is unavailable in this environment. Use your browser’s F11 control or the Windows build.'); }
  }
  function renderUpdateNotice() {
    document.getElementById('shell-update-notice')?.remove();
    const update=desktop.update || {}, key=update.status+':'+(update.version||'');
    const text=document.getElementById('settings-update-text');if(text)text.textContent=S.updateText(update);
    const check=document.querySelector('.shell-settings [data-shell-action="check-update"]');if(check)check.disabled=!native||['checking','downloading'].includes(update.status);
    const restart=document.querySelector('.shell-settings [data-shell-action="restart-update"]');if(restart)restart.disabled=!S.canInstall(update,activeMatch);
    if(activeMatch||root.FrontlinesApp?.getUIState?.().screen==='match'||dismissedUpdate===key||!['available','downloading','ready'].includes(update.status))return;
    const node=document.createElement('aside');node.id='shell-update-notice';node.className='shell-update-notice';node.setAttribute('role','status');
    node.innerHTML='<span>'+escape(S.updateText(update))+'</span>'+(update.status==='ready'?'<button class="command primary" data-shell-action="restart-update">Restart & update</button>':'')+'<button class="command tertiary" data-shell-action="dismiss-update">Later</button>';document.body.appendChild(node);
    if(overlay){inertNodes.push([node,false]);node.inert=true;}
  }
  function notifyMatch(active) {
    activeMatch=!!active;native?.setMatchActive(activeMatch).catch(()=>{});renderUpdateNotice();
  }
  document.addEventListener('click', async event=>{
    const tab=event.target.closest('[data-settings-tab]');if(tab){settingsTab=tab.dataset.settingsTab;renderSettings();overlay.querySelector('[data-settings-tab="'+settingsTab+'"]')?.focus();return;}
    const button=event.target.closest('[data-shell-action]');if(!button||button.disabled)return;
    event.preventDefault();const action=button.dataset.shellAction;
    if(action==='close-settings')closeSettings();
    else if(action==='settings')openSettings();
    else if(action==='home')navigate('home');
    else if(action==='advanced-lab')navigate('advanced');
    else if(action==='quit'){if(!activeMatch||root.confirm('Quit Frontlines and leave this match?')){if(native)await native.quit();else root.alert('Close this browser tab to quit Frontlines.');}}
    else if(action==='check-update' && native){desktop=await native.checkUpdate();renderUpdateNotice();}
    else if(action==='restart-update' && native && S.canInstall(desktop.update,activeMatch)){await native.restartUpdate();}
    else if(action==='dismiss-update'){dismissedUpdate=(desktop.update.status||'')+':'+(desktop.update.version||'');renderUpdateNotice();}
  });
  document.addEventListener('change',event=>{
    if(event.target.id==='display-mode')fullscreen(event.target.value==='fullscreen');
    if(event.target.id==='shell-animation')savePreferences({animationSpeed:event.target.value});
    if(event.target.dataset.pref){savePreferences({[event.target.dataset.pref]:event.target.checked});root.FrontlinesEffects?.unlockAudio(event);}
  });
  document.addEventListener('input',event=>{if(event.target.id==='shell-volume'){savePreferences({masterVolume:Number(event.target.value)/100});document.getElementById('shell-volume-value').textContent=event.target.value+'%';}});
  document.addEventListener('keydown',event=>{
    if(!native&&event.altKey&&event.key==='Enter'){event.preventDefault();fullscreen(!desktop.fullscreen);}
    if(!overlay)return;
    if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();closeSettings();return;}
    if(event.key==='Tab'){
      const items=[...overlay.querySelectorAll('button:not(:disabled),input,select,a[href]')].filter(n=>n.offsetParent!==null),first=items[0],last=items[items.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }
  },true);
  document.addEventListener('fullscreenchange',()=>{if(!native){desktop.fullscreen=!!document.fullscreenElement;const n=document.getElementById('display-mode');if(n)n.value=desktop.fullscreen?'fullscreen':'windowed';}});
  native?.onState(next=>{desktop=next;renderUpdateNotice();const n=document.getElementById('display-mode');if(n)n.value=desktop.fullscreen?'fullscreen':'windowed';});
  native?.onNavigate(navigate);
  native?.getState().then(next=>{desktop=next;renderUpdateNotice();}).catch(()=>{});
  applyPreferences();
  root.FrontlinesShell = {version:S.VERSION,navigate,goHome:()=>navigate('home'),openSettings,closeSettings,notifyMatch,
    getState:()=>({preferences:{...prefs},desktop:JSON.parse(JSON.stringify(desktop)),activeMatch,settingsOpen:!!overlay}),savePreferences,
    toggleFullscreen:()=>fullscreen(!desktop.fullscreen)};
})(window);
