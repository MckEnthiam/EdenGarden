import { useEffect, useState, useRef } from 'react'
import { documentsApi } from '../../api/client'
import { useSettingsStore } from '../../stores/settingsStore'
import { Document } from '../../types/models'
import './DocumentsPage.css'

interface Props { compartmentId: string }

export default function DocumentsPage({ compartmentId }: Props) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const { apiKey, addToast } = useSettingsStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    try {
      const docs = await documentsApi.list(compartmentId)
      setDocuments(docs)
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { load() }, [compartmentId])

  const handleFiles = async (files: File[]) => {
    for (const file of files) {
      try {
        addToast('info', `Indexation de "${file.name}"…`)
        const doc = await documentsApi.uploadPdf(compartmentId, file, apiKey)
        setDocuments((prev) => [doc, ...prev])
        addToast('success', `"${file.name}" indexé avec succès.`)
      } catch (e) {
        addToast('danger', `Erreur : ${(e as Error).message}`)
      }
    }
  }

  const handleDropzone = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter((f) => f.name.endsWith('.pdf'))
    if (files.length) handleFiles(files)
  }

  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR')

  return (
    <div className="documents-page">
      {loading && <div className="docs-loading">Chargement…</div>}

      {documents.length === 0 && !loading && (
        <div className="docs-empty">
          <div>📄</div>
          <div>Aucun document indexé.</div>
          <div>Uploadez un PDF ou scannez un cahier pour commencer.</div>
        </div>
      )}

      <div className="docs-grid">
        {documents.map((doc) => (
          <div key={doc.id} className="doc-card">
            <div className="doc-card-corner" />
            <div className="doc-icon">{doc.source_type === 'scan' ? '📷' : '📄'}</div>
            <div className="doc-name">{doc.filename}</div>
            <div className="doc-meta">
              <span>{doc.page_count} page{doc.page_count !== 1 ? 's' : ''}</span>
              <span>{fmt(doc.indexed_at)}</span>
            </div>
            <div className={`source-badge ${doc.source_type === 'scan' ? 'badge-scan' : 'badge-pdf'}`}>
              {doc.source_type === 'scan' ? 'SCAN' : 'PDF'}
            </div>
          </div>
        ))}
      </div>

      <div
        className={`dropzone ${dragOver ? 'dragover' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDropzone}
      >
        <span>Déposer un PDF ici pour l'indexer</span>
      </div>

      <div className="upload-btns">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            if (files.length) handleFiles(files)
          }}
        />
        <button className="btn-outline" onClick={() => fileInputRef.current?.click()}>
          Choisir un PDF
        </button>
        <button className="btn-accent" onClick={() => addToast('info', 'Scanner – bientôt disponible')}>
          Scanner un cahier
        </button>
      </div>
    </div>
  )
}
