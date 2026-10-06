/* Pure display/update rules shared by the desktop host and interface. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FrontlinesShellState = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const VERSION = (typeof module === 'object' && module.exports ? require('./build-info.js') : globalThis.FrontlinesBuild).version;
  function preferences(value) {
    const saved = value && typeof value === 'object' ? value : {};
    const volume=(key,fallback)=>Number.isFinite(saved[key])?Math.max(0,Math.min(1,saved[key])):fallback;
    return { animationSpeed: saved.animationSpeed === 'fast' ? 'fast' : 'normal',
      presentation:['full','reduced','minimal'].includes(saved.presentation)?saved.presentation:'full',
      reducedEffects: saved.reducedEffects === true, reducedShake: saved.reducedShake === true,
      sound: saved.sound === true, masterVolume: volume('masterVolume',.7),
      musicVolume:volume('musicVolume',.3),uiVolume:volume('uiVolume',.65),cardEffectsVolume:volume('cardEffectsVolume',.8),battlefieldVolume:volume('battlefieldVolume',.7),
      aiDifficulty:['easy','normal','hard','expert'].includes(saved.aiDifficulty)?saved.aiDifficulty:'normal',
      aiSpeed:['fast','normal','deliberate'].includes(saved.aiSpeed)?saved.aiSpeed:'normal',
      tutorialHints:saved.tutorialHints!==false,actionExplanations:saved.actionExplanations!==false,
      displayName:typeof saved.displayName==='string'?saved.displayName.replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,24)||'Commander':'Commander',
      multiplayerFaction:typeof saved.multiplayerFaction==='string'?saved.multiplayerFaction:'stonewall',
      multiplayerDeckId:typeof saved.multiplayerDeckId==='string'?saved.multiplayerDeckId:'stonewall-starter' };
  }
  function fullscreenShortcut(input) {
    return input.type === 'keyDown' && !input.isAutoRepeat && !input.control && !input.meta &&
      ((!input.alt && input.key === 'F11') || (input.alt === true && input.key === 'Enter'));
  }
  function canInstall(update, activeMatch) { return !!update && update.status === 'ready' && !activeMatch; }
  function updateText(update) {
    const version = update && typeof update.version === 'string' ? update.version : '';
    switch (update && update.status) {
      case 'checking': return 'Checking for updates…';
      case 'available': return 'Frontlines update available' + (version ? ' · v' + version : '');
      case 'downloading': return 'Downloading' + (version ? ' v' + version : ' update') + ' · ' + Math.max(0, Math.min(100, Math.round(update.percent || 0))) + '%';
      case 'ready': return 'Update ready — restart Frontlines to install' + (version ? ' v' + version : '') + '.';
      case 'current': return 'Frontlines is up to date.';
      case 'error': return 'Update check unavailable. You can try again later.';
      default: return 'Updates are available in the installed Windows build.';
    }
  }
  function windowBounds(saved, workArea) {
    const input = saved && typeof saved === 'object' ? saved : {};
    const width = Math.min(workArea.width, Math.max(Math.min(900, workArea.width), Number.isFinite(input.width) ? input.width : 1280));
    const height = Math.min(workArea.height, Math.max(Math.min(600, workArea.height), Number.isFinite(input.height) ? input.height : 800));
    return {width:Math.round(width), height:Math.round(height),
      x: Math.round(Math.max(workArea.x, Math.min(workArea.x + workArea.width - width, Number.isFinite(input.x) ? input.x : workArea.x + (workArea.width - width) / 2))),
      y: Math.round(Math.max(workArea.y, Math.min(workArea.y + workArea.height - height, Number.isFinite(input.y) ? input.y : workArea.y + (workArea.height - height) / 2)))};
  }
  return { VERSION, preferences, fullscreenShortcut, canInstall, updateText, windowBounds };
});
