import { useState, useRef, useEffect } from 'react'
import { useChatStore } from '../../stores/chatStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { chatApi } from '../../api/client'
import { ChatMessage } from '../../types/models'
import './ConversationPage.css'

const COMPARTMENT_TAG_RE = /\+([^+]+)\+/g

interface Props { compartmentId: string }

export default function ConversationPage({ compartmentId }: Props) {
  const { messages, addMessage, loading: msgLoading } = useChatStore()
  const { apiKey, addToast } = useSettingsStore()
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const compMessages = messages[compartmentId] ?? []

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [compMessages.length])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    }
    addMessage(compartmentId, userMsg)

    try {
      const resp = await chatApi.send(compartmentId, text.replace(COMPARTMENT_TAG_RE, '$1'), apiKey)
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: resp.answer,
        sources: resp.sources,
        timestamp: Date.now(),
      }
      addMessage(compartmentId, assistantMsg)
    } catch (e) {
      addToast('danger', `Erreur : ${(e as Error).message}`)
    }
    setSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const renderContent = (content: string) => {
    const parts = content.split(COMPARTMENT_TAG_RE)
    return parts.map((part, i) =>
      i % 2 === 1
        ? <span key={i} className="compartment-tag">{part}</span>
        : <span key={i}>{part}</span>
    )
  }

  return (
    <div className="conversation-page">
      <div className="messages-area">
        {compMessages.length === 0 && (
          <div className="empty-conversation">
            <div className="empty-icon">💬</div>
            <div className="empty-title">Commencez la conversation</div>
            <div className="empty-sub">Posez une question sur le cours. Utilisez +nom_compartiment+ pour cibler un cours précis.</div>
          </div>
        )}
        {compMessages.map((msg) => (
          <div key={msg.id} className={`bubble-row ${msg.role === 'user' ? 'user-row' : 'assistant-row'}`}>
            <div className={`bubble ${msg.role === 'user' ? 'user-bubble' : 'assistant-bubble'}`}>
              <div className="bubble-content">{renderContent(msg.content)}</div>
              {msg.sources && msg.sources.length > 0 && (
                <div className="sources-row">
                  {msg.sources.map((s, i) => (
                    <span key={i} className="source-chip" title={s.excerpt}>p.{s.page}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div className="bubble-row assistant-row">
            <div className="bubble assistant-bubble">
              <div className="typing-dots">
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="input-area">
        <div className="input-wrapper">
          <textarea
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Posez une question… (Entrée pour envoyer, Maj+Entrée pour saut de ligne)"
            rows={1}
          />
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={!input.trim() || sending}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
