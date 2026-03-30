import { useState } from 'react'
import './LoginPage.css'

interface LoginPageProps {
  onLogin: (session: any) => void
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [loading, setLoading] = useState(false)
  const [showLocalConfirm, setShowLocalConfirm] = useState(false)

  const handleLocalLogin = () => {
    onLogin({
      mode: 'local',
      user_id: 'local_user',
      access_token: 'local_user',
      expires_at: 9999999999999
    })
  }

  const handleGoogleLogin = async () => {
    if (!window.electronAPI) return
    setLoading(true)
    try {
      const session = await window.electronAPI.startGoogleOAuth()
      onLogin(session)
    } catch (error) {
      console.error('Login failed:', error)
      alert('Échec de la connexion Google')
    }
    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-content">
        <div className="login-logo">
          <h1>EDEN</h1>
          <h1 className="logo-garden">GARDEN</h1>
        </div>
        <p className="login-tagline">Votre jardin d'études intelligent</p>
        <button
          className="google-login-btn"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loading ? 'Connexion...' : 'Continuer avec Google'}
        </button>
        <button
          className="local-login-btn"
          onClick={() => setShowLocalConfirm(true)}
          disabled={loading}
          style={{ marginTop: 16, padding: '12px 24px', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text-muted)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', fontWeight: 500, transition: 'all 0.2s', width: '100%', maxWidth: '320px' }}
        >
          Continuer sans compte
        </button>
      </div>

      {showLocalConfirm && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24, backdropFilter: 'blur(8px)' }}>
          <div className="modal-content" style={{ background: 'var(--color-background, #131A2E)', padding: 32, borderRadius: 12, maxWidth: 480, border: '1px solid var(--color-border)', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            <h3 style={{ marginTop: 0, marginBottom: 16, color: 'var(--color-text)', fontSize: 20 }}>Mode Local</h3>
            <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: 28, whiteSpace: 'pre-wrap', fontSize: 15 }}>
              Vous êtes sur le point d'utiliser Eden Garden en mode local.{'\n'}
              Vos données seront enregistrées uniquement sur cet appareil{'\n'}
              et ne pourront pas être synchronisées ou récupérées depuis{'\n'}
              un autre appareil.
            </p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
              <button className="btn-outline" onClick={() => setShowLocalConfirm(false)} style={{ flex: 1 }}>Annuler</button>
              <button className="btn-accent" onClick={handleLocalLogin} style={{ flex: 1 }}>Continuer en local</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}