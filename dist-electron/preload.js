"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  getApiKey: () => electron.ipcRenderer.invoke("get-api-key"),
  setApiKey: (key) => electron.ipcRenderer.invoke("set-api-key", key),
  getBackendPort: () => electron.ipcRenderer.invoke("get-backend-port"),
  getTheme: () => electron.ipcRenderer.invoke("get-theme"),
  setTheme: (theme) => electron.ipcRenderer.invoke("set-theme", theme)
});
