import { useEffect } from 'react'
import { useSettingsStore } from '../../stores/settingsStore'
import './Toast.css'

export default function ToastContainer() {
  const { toasts, removeToast } = useSettingsStore()

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onRemove }: { toast: { id: string; type: string; message: string; timestamp: number }; onRemove: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 4000)
    return () => clearTimeout(timer)
  }, [toast.id, onRemove])

  const time = new Date(toast.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className={`toast toast-${toast.type}`}>
      <div className="toast-content">
        <span className="toast-message">{toast.message}</span>
        <span className="toast-time">{time}</span>
      </div>
      <button className="toast-close" onClick={() => onRemove(toast.id)}>×</button>
      <div className="toast-progress" />
    </div>
  )
}
