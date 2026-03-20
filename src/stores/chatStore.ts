import { create } from 'zustand'
import { ChatMessage } from '../types/models'

interface ChatStore {
  messages: Record<string, ChatMessage[]>
  loading: boolean
  setLoading: (v: boolean) => void
  addMessage: (compartmentId: string, msg: ChatMessage) => void
  clearMessages: (compartmentId: string) => void
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: {},
  loading: false,
  setLoading: (v) => set({ loading: v }),
  addMessage: (compartmentId, msg) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [compartmentId]: [...(s.messages[compartmentId] ?? []), msg],
      },
    })),
  clearMessages: (compartmentId) =>
    set((s) => ({ messages: { ...s.messages, [compartmentId]: [] } })),
}))
