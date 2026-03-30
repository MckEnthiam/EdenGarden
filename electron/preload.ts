import { contextBridge, ipcRenderer } from 'electron'

export interface ElectronAPI {
  getApiKey: () => Promise<string>
  setApiKey: (key: string) => Promise<void>
  getBackendPort: () => Promise<number>
  getTheme: () => Promise<{ theme: string, mode: string }>
  setTheme: (theme: { theme: string, mode: string }) => Promise<void>
  getSession: () => Promise<any>
  setSession: (session: any) => Promise<void>
  clearSession: () => Promise<void>
  refreshGoogleToken: () => Promise<any>
  startGoogleOAuth: () => Promise<any>
  retryBackend: () => void
  readFileAsBuffer: (filePath: string) => Promise<ArrayBuffer>
  openFileInExplorer: (filePath: string) => Promise<void>
}

contextBridge.exposeInMainWorld('electronAPI', {
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  setApiKey: (key: string) => ipcRenderer.invoke('set-api-key', key),
  getBackendPort: () => ipcRenderer.invoke('get-backend-port'),
  getTheme: () => ipcRenderer.invoke('get-theme'),
  setTheme: (theme: { theme: string, mode: string }) => ipcRenderer.invoke('set-theme', theme),
  getSession: () => ipcRenderer.invoke('get-session'),
  setSession: (session: any) => ipcRenderer.invoke('set-session', session),
  clearSession: () => ipcRenderer.invoke('clear-session'),
  refreshGoogleToken: () => ipcRenderer.invoke('refresh-google-token'),
  startGoogleOAuth: () => ipcRenderer.invoke('start-google-oauth'),
  retryBackend: () => ipcRenderer.send('retry-backend'),
  readFileAsBuffer: (filePath: string) => ipcRenderer.invoke('read-file-as-buffer', filePath),
  openFileInExplorer: (filePath: string) => ipcRenderer.invoke('open-file-in-explorer', filePath),
} satisfies ElectronAPI)

