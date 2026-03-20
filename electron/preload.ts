import { contextBridge, ipcRenderer } from 'electron'

export interface ElectronAPI {
  getApiKey: () => Promise<string>
  setApiKey: (key: string) => Promise<void>
  getBackendPort: () => Promise<number>
  getTheme: () => Promise<'dark' | 'light'>
  setTheme: (theme: 'dark' | 'light') => Promise<void>
}

contextBridge.exposeInMainWorld('electronAPI', {
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  setApiKey: (key: string) => ipcRenderer.invoke('set-api-key', key),
  getBackendPort: () => ipcRenderer.invoke('get-backend-port'),
  getTheme: () => ipcRenderer.invoke('get-theme'),
  setTheme: (theme: 'dark' | 'light') => ipcRenderer.invoke('set-theme', theme),
} satisfies ElectronAPI)
