// Type definitions for the global window.electronAPI
export interface ElectronAPI {
  getApiKey: () => Promise<string>
  setApiKey: (key: string) => Promise<void>
  getBackendPort: () => Promise<number>
  getTheme: () => Promise<'dark' | 'light'>
  setTheme: (theme: 'dark' | 'light') => Promise<void>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
