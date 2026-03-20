import { useEffect, useState } from 'react'
import { useCompartmentStore } from '../../stores/compartmentStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { contradictionsApi } from '../../api/client'
import { Contradiction } from '../../types/models'
import './ContradictionsPage.css'

interface Props { compartmentId: string }

export default function ContradictionsPage({ compartmentId }: Props) {
  const [items, setItems] = useState<Contradiction[]>([])
  const [loading, setLoading] = useState(false)
  const { compartments } = useCompartmentStore()
  const { addToast } = useSettingsStore()

  const load = async () => {
    setLoading(true)
    try {
      const data = await contradictionsApi.list(compartmentId)
      setItems(data)
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { load() }, [compartmentId])

  const markRead = async (id: string) => {
    try {
      await contradictionsApi.markRead(id)
      setItems((prev) => prev.filter((i) => i.id !== id))
      addToast('success', 'Contradiction marquée comme lue.')
    } catch (e) {
      addToast('danger', `Erreur : ${(e as Error).message}`)
    }
  }

  const getCompName = (id: string) => {
    const c = compartments.find((c) => c.id === id)
    return c ? c.name : 'Inconnu'
  }

  if (!loading && items.length === 0) {
    return (
      <div className="contradictions-empty">
        <div className="empty-icon">✓</div>
        <div className="empty-title">Aucune contradiction détectée</div>
        <div className="empty-sub">Les cours de vos professeurs sont cohérents.</div>
      </div>
    )
  }

  return (
    <div className="contradictions-page">
      {items.map((item) => (
        <div key={item.id} className="contra-card">
          <div className="contra-header">
            <span className="contra-term">{item.term}</span>
            <span className="badge badge-danger">CONTRADICTION</span>
          </div>
          
          <div className="contra-columns">
            <div className="contra-col">
              <div className="contra-col-title">{getCompName(item.compartment_a_id)}</div>
              <div className="contra-def">{item.definition_a}</div>
            </div>
            
            <div className="contra-divider" />
            
            <div className="contra-col">
              <div className="contra-col-title">{getCompName(item.compartment_b_id)}</div>
              <div className="contra-def">{item.definition_b}</div>
            </div>
          </div>

          <div className="contra-footer">
            <span className="contra-score">DIVERGENCE {(item.severity * 100).toFixed(0)}%</span>
            <button className="btn-outline contra-read-btn" onClick={() => markRead(item.id)}>
              Marquer comme lu
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
