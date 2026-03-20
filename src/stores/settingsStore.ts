import { create } from 'zustand'
import { Toast } from '../types/models'

interface SettingsStore {
  apiKey: string
  provider: string
  providerLabel: string
  theme: 'garden' | 'ocean' | 'serious' | 'icecream'
  mode: 'light' | 'dark'
  toasts: Toast[]
  setApiKey: (key: string) => void
  setProvider: (p: string, label: string) => void
  setTheme: (t: 'garden' | 'ocean' | 'serious' | 'icecream') => void
  setMode: (m: 'light' | 'dark') => void
  addToast: (type: Toast['type'], message: string) => void
  removeToast: (id: string) => void
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  apiKey: '',
  provider: 'unknown',
  providerLabel: 'NO MODEL',
  theme: 'garden',
  mode: 'light',
  toasts: [],
  setApiKey: (key) => set({ apiKey: key }),
  setProvider: (p, label) => set({ provider: p, providerLabel: label }),
  setTheme: (t) => set({ theme: t }),
  setMode: (m) => set({ mode: m }),
  addToast: (type, message) =>
    set((s) => ({
      toasts: [
        ...s.toasts,
        { id: crypto.randomUUID(), type, message, timestamp: Date.now() },
      ],
    })),
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
