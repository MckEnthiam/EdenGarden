// Type definitions for the global window.electronAPI
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
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
