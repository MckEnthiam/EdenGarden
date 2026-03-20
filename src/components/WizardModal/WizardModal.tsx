import { useState } from 'react'
import { useCompartmentStore } from '../../stores/compartmentStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { compartmentsApi } from '../../api/client'
import './WizardModal.css'

interface WizardModalProps {
  onClose: () => void
}

function hashColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 35%, 38%)`
}

const STYLE_OPTIONS = ['QCM', 'Questions ouvertes', 'Cas pratiques', 'Exercices techniques']

export default function WizardModal({ onClose }: WizardModalProps) {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [profName, setProfName] = useState('')
  const [styles, setStyles] = useState<string[]>([])
  const [sameProfAs, setSameProfAs] = useState('')
  const [examDate, setExamDate] = useState('')
  const [loading, setLoading] = useState(false)

  const { compartments, addCompartment, setActiveCompartment } = useCompartmentStore()
  const { addToast } = useSettingsStore()

  const tabColor = name ? hashColor(name) : '#2E3247'

  const toggleStyle = (s: string) => {
    setStyles((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])
  }

  const handleCreate = async () => {
    if (!name.trim() || !subject.trim()) return
    setLoading(true)
    try {
      const comp = await compartmentsApi.create({
        name: name.trim(),
        subject: subject.trim(),
        professor_name: profName.trim(),
        professor_style: styles.join(', '),
        exam_date: examDate || undefined,
        same_prof_as: sameProfAs ? [sameProfAs] : [],
      })
      addCompartment(comp)
      setActiveCompartment(comp.id)
      addToast('success', `Compartiment "${name}" créé avec succès.`)
      onClose()
    } catch (e) {
      addToast('danger', `Erreur lors de la création : ${(e as Error).message}`)
    }
    setLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-eyebrow">NOUVEAU COMPARTIMENT</div>
          <div className="modal-title">Créer un cours</div>
          <div className="stepper">
            {[1, 2, 3].map((s) => (
              <span key={s}>
                <div className={`step-dot ${step === s ? 'active' : step > s ? 'done' : ''}`} />
                {s < 3 && <div className="step-line" />}
              </span>
            ))}
          </div>
        </div>

        <div className="modal-body">
          {step === 1 && (
            <div className="wizard-step">
              <label>
                <span className="field-label">Nom du cours</span>
                <input placeholder="ex: CSC 242" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
              </label>
              <label>
                <span className="field-label">Matière complète</span>
                <input placeholder="ex: Algorithmes et Programmation" value={subject} onChange={(e) => setSubject(e.target.value)} />
              </label>
              <div className="color-preview">
                <span className="field-label">Couleur générée</span>
                <div className="color-swatch" style={{ background: tabColor }}>
                  <span>{name || '—'}</span>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="wizard-step">
              <label>
                <span className="field-label">Nom du professeur</span>
                <input placeholder="ex: Dr. Martin" value={profName} onChange={(e) => setProfName(e.target.value)} autoFocus />
              </label>
              <div className="field-label" style={{ marginBottom: 8 }}>Style d'évaluation</div>
              <div className="style-pills">
                {STYLE_OPTIONS.map((s) => (
                  <button
                    key={s}
                    className={`style-pill ${styles.includes(s) ? 'active' : ''}`}
                    onClick={() => toggleStyle(s)}
                    type="button"
                  >{s}</button>
                ))}
              </div>
              {compartments.length > 0 && (
                <label>
                  <span className="field-label">Même professeur que… (optionnel)</span>
                  <select value={sameProfAs} onChange={(e) => setSameProfAs(e.target.value)}>
                    <option value="">— aucun —</option>
                    {compartments.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} – {c.professor_name}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="wizard-step">
              <label>
                <span className="field-label">Date de l'examen (optionnel)</span>
                <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
              </label>
              <div className="dropzone-mini">
                <span>📎 Anciens examens (optionnel) — bientôt disponible</span>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-outline" onClick={step === 1 ? onClose : () => setStep(step - 1)}>
            {step === 1 ? 'Annuler' : 'Retour'}
          </button>
          {step < 3 ? (
            <button
              className="btn-accent"
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && (!name.trim() || !subject.trim())}
            >Suivant</button>
          ) : (
            <button className="btn-accent" onClick={handleCreate} disabled={loading}>
              {loading ? 'Création…' : 'Créer'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
