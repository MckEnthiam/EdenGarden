import { contextBridge, ipcRenderer } from 'electron'

export interface ElectronAPI {
  getApiKey: () => Promise<string>
  setApiKey: (key: string) => Promise<void>
  getBackendPort: () => Promise<number>
  getTheme: () => Promise<{ theme: string, mode: string }>
  setTheme: (theme: { theme: string, mode: string }) => Promise<void>
}

contextBridge.exposeInMainWorld('electronAPI', {
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  setApiKey: (key: string) => ipcRenderer.invoke('set-api-key', key),
  getBackendPort: () => ipcRenderer.invoke('get-backend-port'),
  getTheme: () => ipcRenderer.invoke('get-theme'),
  setTheme: (theme: { theme: string, mode: string }) => ipcRenderer.invoke('set-theme', theme),
} satisfies ElectronAPI)
