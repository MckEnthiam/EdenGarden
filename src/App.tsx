import { useEffect, useState } from 'react'
import { getBaseUrl, compartmentsApi } from './api/client'
import { useCompartmentStore } from './stores/compartmentStore'
import { useSettingsStore } from './stores/settingsStore'

import Sidebar from './components/Sidebar/Sidebar'
import WizardModal from './components/WizardModal/WizardModal'
import ToastContainer from './components/Toast/Toast'
import CompartmentView from './pages/CompartmentView/CompartmentView'
import SettingsPage from './pages/SettingsPage/SettingsPage'

export default function App() {
  const { setCompartments, activeCompartmentId, setLoading } = useCompartmentStore()
  const { theme, setTheme, mode, setMode, setApiKey, addToast } = useSettingsStore()

  const [wizardOpen, setWizardOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [backendReady, setBackendReady] = useState(false)

  // Initialization: load theme, API key, and fetch compartment list
  useEffect(() => {
    async function init() {
      // Load initial theme and API key from Electron storage if available
      try {
        if (window.electronAPI) {
          const stored = await window.electronAPI.getTheme()
          if (stored) {
            setTheme(stored.theme as any)
            setMode(stored.mode as any)
          }

          const storedKey = await window.electronAPI.getApiKey()
          if (storedKey) setApiKey(storedKey)
        }
      } catch { /* ignore */ }

      // Wait for backend to be ready via the getBaseUrl helper
      try {
        await getBaseUrl()
        setBackendReady(true)
      } catch {
        addToast('danger', 'Impossible de se connecter au backend local.')
      }
    }
    init()
  }, [])

  // Sync theme to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.setAttribute('data-mode', mode)
    
    // Persist to Electron
    if (window.electronAPI) {
      window.electronAPI.setTheme({ theme, mode })
    }
  }, [theme, mode])

  // Fetch compartments once backend is ready
  useEffect(() => {
    if (!backendReady) return

    async function loadCompartments() {
      setLoading(true)
      try {
        const data = await compartmentsApi.list()
        setCompartments(data)
      } catch (e) {
        addToast('danger', `Erreur de chargement des compartiments: ${(e as Error).message}`)
      }
      setLoading(false)
    }

    loadCompartments()
  }, [backendReady])

  // Top level render before backend is connected
  if (!backendReady) {
    return (
      <div className="app-layout" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div className="skeleton" style={{ width: 48, height: 48, borderRadius: '50%' }} />
          <div className="mono-label">DÉMARRAGE DU MOTEUR PYTHON...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-layout">
      <Sidebar
        onNewCompartment={() => setWizardOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="main-content">
        {settingsOpen ? (
          <SettingsPage onClose={() => setSettingsOpen(false)} />
        ) : activeCompartmentId ? (
          <CompartmentView compartmentId={activeCompartmentId} />
        ) : (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 48, opacity: 0.2 }}>🌱</div>
            <div>Sélectionnez un compartiment ou créez-en un nouveau</div>
          </div>
        )}
      </main>

      {wizardOpen && <WizardModal onClose={() => setWizardOpen(false)} />}
      <ToastContainer />
    </div>
  )
}
