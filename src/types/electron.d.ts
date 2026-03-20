// Type definitions for the global window.electronAPI
export interface ElectronAPI {
  getApiKey: () => Promise<string>
  setApiKey: (key: string) => Promise<void>
  getBackendPort: () => Promise<number>
  getTheme: () => Promise<{ theme: string, mode: string }>
  setTheme: (theme: { theme: string, mode: string }) => Promise<void>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
