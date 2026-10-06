'use strict';
const {contextBridge, ipcRenderer} = require('electron');
// No filesystem, generic IPC, or Node access is exposed to game pages.
contextBridge.exposeInMainWorld('FrontlinesDesktop', {
  getState: () => ipcRenderer.invoke('frontlines:state'),
  setFullscreen: value => ipcRenderer.invoke('frontlines:fullscreen', value === true),
  setMatchActive: value => ipcRenderer.invoke('frontlines:match', value === true),
  checkUpdate: () => ipcRenderer.invoke('frontlines:check-update'),
  restartUpdate: () => ipcRenderer.invoke('frontlines:restart-update'),
  quit: () => ipcRenderer.invoke('frontlines:quit'),
  multiplayer: (command, payload = {}) => ipcRenderer.invoke('frontlines:multiplayer', {command, payload}),
  getMultiplayerState: () => ipcRenderer.invoke('frontlines:multiplayer-state'),
  onMultiplayer: callback => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('frontlines:multiplayer-changed', listener);
    return () => ipcRenderer.removeListener('frontlines:multiplayer-changed', listener);
  },
  onState: callback => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('frontlines:state-changed', listener);
    return () => ipcRenderer.removeListener('frontlines:state-changed', listener);
  },
  onNavigate: callback => {
    const listener = (_event, page) => callback(page);
    ipcRenderer.on('frontlines:navigate', listener);
    return () => ipcRenderer.removeListener('frontlines:navigate', listener);
  }
});
