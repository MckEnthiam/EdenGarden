import React, { Component, ErrorInfo, ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'

class RootErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; message?: string }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, message: undefined }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message ?? String(error) }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log in devtools to aider le debug
    console.error('Uncaught renderer error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-layout" style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 520, textAlign: 'center' }}>
            <div style={{ fontSize: 40, opacity: 0.5 }}>🌑</div>
            <div style={{ fontWeight: 600 }}>Une erreur est survenue dans l’interface.</div>
            {this.state.message && (
              <div style={{ fontSize: 13, opacity: 0.8, wordBreak: 'break-word' }}>
                <code>{this.state.message}</code>
              </div>
            )}
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              Ouvre les DevTools (Ctrl+Shift+I) pour plus de détails et partage-moi le message ci‑dessus si le problème persiste.
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
)
