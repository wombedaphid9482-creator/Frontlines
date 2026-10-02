/* Pure display/update rules shared by the desktop host and interface. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FrontlinesShellState = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const VERSION = '0.6.0';
  function preferences(value) {
    const saved = value && typeof value === 'object' ? value : {};
    return { animationSpeed: saved.animationSpeed === 'fast' ? 'fast' : 'normal',
      reducedEffects: saved.reducedEffects === true, reducedShake: saved.reducedShake === true,
      sound: saved.sound === true, masterVolume: Number.isFinite(saved.masterVolume) ? Math.max(0, Math.min(1, saved.masterVolume)) : .7 };
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
