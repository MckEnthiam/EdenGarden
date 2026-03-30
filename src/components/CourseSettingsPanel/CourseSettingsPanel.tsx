import { useEffect, useMemo, useState, useRef } from 'react'
import { compartmentsApi, documentsApi } from '../../api/client'
import { useCompartmentStore } from '../../stores/compartmentStore'
import { useSettingsStore } from '../../stores/settingsStore'
import type { Compartment, Document } from '../../types/models'
import './CourseSettingsPanel.css'

interface Props {
  compartmentId: string
  open: boolean
  onClose: () => void
}

type ProfessorStyleFlag = 'qcm' | 'open' | 'cases' | 'technical'

export default function CourseSettingsPanel({ compartmentId, open, onClose }: Props) {
  const { compartments, updateCompartment, removeCompartment, setActiveCompartment } = useCompartmentStore()
  const { apiKey, addToast } = useSettingsStore()
  const comp = useMemo<Compartment | undefined>(
    () => compartments.find((c) => c.id === compartmentId),
    [compartments, compartmentId],
  )

  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [professorName, setProfessorName] = useState('')
  const [professorStyleText, setProfessorStyleText] = useState('')
  const [styleFlags, setStyleFlags] = useState<Record<ProfessorStyleFlag, boolean>>({
    qcm: false,
    open: false,
    cases: false,
    technical: false,
  })
  const [sameProfAs, setSameProfAs] = useState<string | null>(null)
  const [examDate, setExamDate] = useState<string>('')

  const [documents, setDocuments] = useState<Document[]>([])
  const [stats, setStats] = useState<{
    quiz_count: number
    average_score: number
    contradiction_count: number
    created_at: string
    chunk_count: number
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [dangerLoading, setDangerLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open || !comp) return
    setName(comp.name)
    setSubject(comp.subject)
    setProfessorName(comp.professor_name)
    setProfessorStyleText(comp.professor_style)
    setExamDate(comp.exam_date ?? '')
    setSameProfAs(comp.same_prof_as && comp.same_prof_as.length ? comp.same_prof_as[0] : null)

    const styleLower = comp.professor_style.toLowerCase()
    setStyleFlags({
      qcm: /qcm/.test(styleLower),
      open: /ouverte|ouvertes/.test(styleLower),
      cases: /cas pratiques?/.test(styleLower),
      technical: /technique|exercices/.test(styleLower),
    })

    const loadSideData = async () => {
      try {
        const [docs, s] = await Promise.all([
          documentsApi.list(compartmentId),
          compartmentsApi.stats(compartmentId),
        ])
        setDocuments(docs)
        setStats(s)
      } catch {
        /* ignore for now */
      }
    }
    loadSideData()
  }, [open, comp, compartmentId])

  const effectiveProfessorStyle = useMemo(() => {
    const parts: string[] = []
    if (styleFlags.qcm) parts.push('QCM')
    if (styleFlags.open) parts.push('Questions ouvertes')
    if (styleFlags.cases) parts.push('Cas pratiques')
    if (styleFlags.technical) parts.push('Exercices techniques')
    const flagText = parts.join(' / ')
    if (!professorStyleText.trim()) return flagText
    if (!flagText) return professorStyleText
    return professorStyleText
  }, [styleFlags, professorStyleText])

  const original = comp
  const dirty =
    !!original &&
    (name !== original.name ||
      subject !== original.subject ||
      professorName !== original.professor_name ||
      effectiveProfessorStyle !== original.professor_style ||
      (original.exam_date ?? '') !== examDate ||
      (original.same_prof_as && original.same_prof_as[0]) !== sameProfAs)

  if (!open || !comp) return null

  const otherCompartments = compartments.filter((c) => c.id !== comp.id)

  const handleToggleFlag = (flag: ProfessorStyleFlag) => {
    setStyleFlags((prev) => ({ ...prev, [flag]: !prev[flag] }))
  }

  const handleSave = async () => {
    if (!dirty) return
    setLoading(true)
    try {
      const payload: Partial<Compartment> = {
        name,
        subject,
        professor_name: professorName,
        professor_style: effectiveProfessorStyle,
        exam_date: examDate || null,
        same_prof_as: sameProfAs ? [sameProfAs] : [],
      }
      const updated = await compartmentsApi.update(comp.id, payload)
      updateCompartment(updated)
      addToast('success', 'Cours mis à jour.')
    } catch (e) {
      addToast('danger', `Erreur : ${(e as Error).message}`)
    }
    setLoading(false)
  }

  const handleDeleteDocument = async (docId: string) => {
    if (!window.confirm('Supprimer ce document ? Cette action est irréversible.')) return
    try {
      await documentsApi.delete(docId)
      setDocuments((prev) => prev.filter((d) => d.id !== docId))
      addToast('success', 'Document supprimé.')
    } catch (e) {
      addToast('danger', `Erreur : ${(e as Error).message}`)
    }
  }

  const handleUploadFiles = async (files: FileList | null) => {
    const arr = Array.from(files ?? [])
    for (const file of arr) {
      try {
        addToast('info', `Indexation de "${file.name}"…`)
        const doc = await documentsApi.uploadPdf(comp.id, file, apiKey)
        setDocuments((prev) => [doc, ...prev])
        addToast('success', `"${file.name}" indexé avec succès.`)
      } catch (e) {
        addToast('danger', `Erreur : ${(e as Error).message}`)
      }
    }
  }

  const fmtDate = (d: string | null | undefined) =>
    d ? new Date(d).toLocaleDateString('fr-FR') : '—'

  const handleResetQuiz = async () => {
    if (!window.confirm('Réinitialiser tout l’historique des quiz pour ce cours ? Cette action est irréversible.')) {
      return
    }
    setDangerLoading(true)
    try {
      await compartmentsApi.resetQuizHistory(comp.id)
      addToast('success', 'Historique des quiz réinitialisé.')
      if (stats) setStats({ ...stats, quiz_count: 0, average_score: 0 })
    } catch (e) {
      addToast('danger', `Erreur : ${(e as Error).message}`)
    }
    setDangerLoading(false)
  }

  const handleDeleteAllDocs = async () => {
    if (
      !window.confirm(
        'Supprimer tous les documents de ce compartiment ? Les chunks indexés seront également supprimés.',
      )
    ) {
      return
    }
    setDangerLoading(true)
    try {
      await compartmentsApi.deleteAllDocuments(comp.id)
      setDocuments([])
      if (stats) setStats({ ...stats, chunk_count: 0 })
      addToast('success', 'Tous les documents ont été supprimés.')
    } catch (e) {
      addToast('danger', `Erreur : ${(e as Error).message}`)
    }
    setDangerLoading(false)
  }

  const handleDeleteCompartment = async () => {
    if (!window.confirm('Supprimer ce compartiment et toutes les données associées ?')) return
    const confirmName = window.prompt(
      `Tapez le nom exact du cours pour confirmer la suppression :\n\n${comp.name}`,
    )
    if (confirmName !== comp.name) {
      addToast('warning', 'Nom incorrect, suppression annulée.')
      return
    }
    setDangerLoading(true)
    try {
      await compartmentsApi.delete(comp.id)
      removeCompartment(comp.id)
      setActiveCompartment(null)
      addToast('success', 'Compartiment supprimé.')
      onClose()
    } catch (e) {
      addToast('danger', `Erreur : ${(e as Error).message}`)
    }
    setDangerLoading(false)
  }

  return (
    <div className={`course-settings-overlay ${open ? 'open' : ''}`} onClick={onClose}>
      <aside
        className="course-settings-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="course-settings-header">
          <div>
            <div className="course-settings-title">{comp.name}</div>
            <div className="course-settings-subject">{comp.subject}</div>
          </div>
          <button className="cs-close-btn" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="course-settings-body">
          <section className="cs-section">
            <div className="cs-section-label">Identité</div>
            <div className="cs-field">
              <label>Nom du cours</label>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="cs-field">
              <label>Matière complète</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="cs-field">
              <label>Couleur d’onglet</label>
              <div className="cs-color-preview">
                <div className="cs-color-dot" />
                <span>Prévisualisation basée sur “{name || comp.name}”</span>
              </div>
            </div>
          </section>

          <section className="cs-section">
            <div className="cs-section-label">Profil professeur</div>
            <div className="cs-field">
              <label>Nom du professeur</label>
              <input value={professorName} onChange={(e) => setProfessorName(e.target.value)} />
            </div>
            <div className="cs-field">
              <label>Style de notation</label>
              <div className="cs-checkbox-row">
                <label>
                  <input
                    type="checkbox"
                    checked={styleFlags.qcm}
                    onChange={() => handleToggleFlag('qcm')}
                  />
                  QCM
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={styleFlags.open}
                    onChange={() => handleToggleFlag('open')}
                  />
                  Questions ouvertes
                </label>
              </div>
              <div className="cs-checkbox-row">
                <label>
                  <input
                    type="checkbox"
                    checked={styleFlags.cases}
                    onChange={() => handleToggleFlag('cases')}
                  />
                  Cas pratiques
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={styleFlags.technical}
                    onChange={() => handleToggleFlag('technical')}
                  />
                  Exercices techniques
                </label>
              </div>
              <textarea
                className="cs-textarea"
                value={professorStyleText}
                onChange={(e) => setProfessorStyleText(e.target.value)}
                placeholder="Notes libres sur le style de notation…"
              />
            </div>
            <div className="cs-field">
              <label>Même professeur que…</label>
              <select
                value={sameProfAs ?? ''}
                onChange={(e) => setSameProfAs(e.target.value || null)}
              >
                <option value="">Aucun lien</option>
                {otherCompartments.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="cs-field">
              <label>Date d’examen</label>
              <input
                type="date"
                value={examDate ?? ''}
                onChange={(e) => setExamDate(e.target.value)}
              />
            </div>
          </section>

          <section className="cs-section">
            <div className="cs-section-label">Documents</div>
            <div className="cs-docs-list">
              {documents.map((doc) => (
                <div key={doc.id} className="cs-doc-row">
                  <div className="cs-doc-main">
                    <div className="cs-doc-name">{doc.filename}</div>
                    <div className="cs-doc-meta">
                      <span>{doc.source_type === 'scan' ? 'SCAN' : 'PDF'}</span>
                      <span>{fmtDate(doc.indexed_at)}</span>
                    </div>
                  </div>
                  <button
                    className="cs-doc-delete"
                    onClick={() => handleDeleteDocument(doc.id)}
                  >
                    Supprimer
                  </button>
                </div>
              ))}
              {documents.length === 0 && (
                <div className="cs-doc-empty">Aucun document pour ce cours.</div>
              )}
            </div>
            <div className="cs-doc-actions">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => handleUploadFiles(e.target.files)}
              />
              <button
                className="cs-btn-outline"
                onClick={() => fileInputRef.current?.click()}
              >
                Ajouter des documents (PDF)
              </button>
            </div>
          </section>

          <section className="cs-section">
            <div className="cs-section-label">Statistiques</div>
            <div className="cs-stats-grid">
              <div className="cs-stat-item">
                <div className="cs-stat-label">Quiz effectués</div>
                <div className="cs-stat-value">{stats?.quiz_count ?? 0}</div>
              </div>
              <div className="cs-stat-item">
                <div className="cs-stat-label">Score moyen</div>
                <div className="cs-stat-value">
                  {stats ? `${stats.average_score.toFixed(1)} %` : '0.0 %'}
                </div>
              </div>
              <div className="cs-stat-item">
                <div className="cs-stat-label">Contradictions détectées</div>
                <div className="cs-stat-value">{stats?.contradiction_count ?? 0}</div>
              </div>
              <div className="cs-stat-item">
                <div className="cs-stat-label">Date de création</div>
                <div className="cs-stat-value">{fmtDate(stats?.created_at ?? comp.created_at)}</div>
              </div>
              <div className="cs-stat-item">
                <div className="cs-stat-label">Chunks indexés</div>
                <div className="cs-stat-value">{stats?.chunk_count ?? 0}</div>
              </div>
            </div>
          </section>

          <section className="cs-section cs-danger-zone">
            <div className="cs-section-label">Danger zone</div>
            <div className="cs-danger-actions">
              <button
                className="cs-btn-danger-outline"
                onClick={handleResetQuiz}
                disabled={dangerLoading}
              >
                Réinitialiser les quiz
              </button>
              <button
                className="cs-btn-danger-outline"
                onClick={handleDeleteAllDocs}
                disabled={dangerLoading}
              >
                Supprimer tous les documents
              </button>
              <button
                className="cs-btn-danger"
                onClick={handleDeleteCompartment}
                disabled={dangerLoading}
              >
                Supprimer ce compartiment
              </button>
            </div>
          </section>
        </div>

        <div className="course-settings-footer">
          <button
            className="cs-btn-save"
            onClick={handleSave}
            disabled={!dirty || loading}
          >
            Sauvegarder
          </button>
        </div>
      </aside>
    </div>
  )
}

