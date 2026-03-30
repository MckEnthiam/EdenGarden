import { useState, useEffect } from 'react'
import { useSettingsStore } from '../../stores/settingsStore'
import { llmApi } from '../../api/client'
import './SettingsPage.css'

interface Props { onClose: () => void }

export default function SettingsPage({ onClose }: Props) {
  const { apiKey, setApiKey, setProvider, theme, setTheme, addToast } = useSettingsStore()
  const [localKey, setLocalKey] = useState('')
  const [checking, setChecking] = useState(false)
  const [isLocal, setIsLocal] = useState(false)

  useEffect(() => {
    window.electronAPI?.getSession().then(s => setIsLocal(s?.mode === 'local'))
  }, [])

  const handleSave = async () => {
    setChecking(true)
    try {
      if (!localKey) {
        setApiKey('')
        setProvider('unknown', 'NO MODEL')
        addToast('success', 'Clé API supprimée.')
        onClose()
        return
      }

      const info = await llmApi.detectProvider(localKey)
      setApiKey(localKey)
      setProvider(info.provider, info.label)
      window.electronAPI?.setApiKey(localKey)
      
      addToast('success', `Validé : modèle ${info.label} (${info.model}) activé.`)
      onClose()
    } catch (e) {
      addToast('danger', `Clé non reconnue : ${(e as Error).message}`)
    }
    setChecking(false)
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h2>Paramètres de l'application</h2>
        <button className="btn-outline close-settings" onClick={onClose}>Fermer</button>
      </div>

      <div className="settings-section">
        <h3 className="section-title">Modèle d'Intelligence Artificielle</h3>
        <p className="section-desc">
          Eden Garden supporte Groq (Llama), Gemini, OpenAI (GPT) et Anthropic (Claude). 
          Collez votre clé API ; le modèle sera détecté automatiquement. 
          Votre clé est stockée localement.
        </p>
        <div className="api-key-row">
          <input
            type="password"
            placeholder="sk-..."
            value={localKey}
            onChange={(e) => setLocalKey(e.target.value)}
          />
          <button className="btn-accent" onClick={handleSave} disabled={checking}>
            {checking ? 'Vérification…' : 'Enregistrer'}
          </button>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="section-title">Apparence</h3>
        <p className="section-desc">Choisissez l'univers visuel de votre Eden Garden.</p>
        <div className="theme-grid">
          {[
            { id: 'garden', name: 'Garden', color: '#3DAA4A' },
            { id: 'ocean', name: 'Ocean', color: '#0096C7' },
            { id: 'serious', name: 'Serious', color: '#5C5C5C' },
            { id: 'icecream', name: 'Ice Cream', color: '#C68642' },
          ].map((t) => (
            <div
              key={t.id}
              className={`theme-card ${theme === t.id ? 'active' : ''}`}
              onClick={() => {
                setTheme(t.id as any);
                window.electronAPI?.setTheme({ theme: t.id, mode: useSettingsStore.getState().mode });
              }}
            >
              <div className="theme-preview" style={{ background: t.color }}>
                <div className="theme-preview-inner" />
              </div>
              <div className="theme-name">{t.name}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <h3 className="section-title">Compte</h3>
        {isLocal ? (
          <div>
            <span style={{ display: 'inline-block', background: 'var(--color-border)', padding: '4px 8px', borderRadius: 4, fontSize: 13, fontWeight: 500, marginBottom: 8, color: 'var(--color-text)' }}>Mode local</span>
            <p className="section-desc">Vous utilisez l'application sans compte en local.</p>
          </div>
        ) : (
          <p className="section-desc">Déconnectez-vous de votre compte Google.</p>
        )}
        <button
          className="btn-outline"
          onClick={async () => {
            await window.electronAPI?.clearSession()
            window.location.reload()
          }}
        >
          Se déconnecter
        </button>
      </div>
    </div>
  )
}
