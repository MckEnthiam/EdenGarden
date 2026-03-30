import { useState, useEffect, useRef, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import type { SourceChunk } from '../../types/models'
import './PdfViewerPanel.css'

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString()

interface Props {
  isOpen: boolean
  source: SourceChunk | null
  onClose: () => void
}

export default function PdfViewerPanel({ isOpen, source, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [zoom, setZoom] = useState(1.0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load PDF when source changes
  useEffect(() => {
    if (!isOpen || !source?.file_path) {
      setPdfDoc(null)
      setTotalPages(0)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    ;(async () => {
      try {
        const buffer = await window.electronAPI?.readFileAsBuffer(source.file_path)
        if (cancelled || !buffer) return

        const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise
        if (cancelled) {
          doc.destroy()
          return
        }

        setPdfDoc(doc)
        setTotalPages(doc.numPages)
        setCurrentPage(Math.min(Math.max(source.page, 1), doc.numPages))
      } catch (err) {
        if (!cancelled) {
          setError(`Impossible de charger le PDF : ${(err as Error).message}`)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [isOpen, source?.file_path, source?.page])

  // Render current page
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return

    try {
      const page = await pdfDoc.getPage(currentPage)
      const viewport = page.getViewport({ scale: zoom * 1.5 })
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = viewport.width
      canvas.height = viewport.height

      await page.render({ canvasContext: ctx, viewport, canvas } as any).promise
    } catch (err) {
      console.error('PDF render error:', err)
    }
  }, [pdfDoc, currentPage, zoom])

  useEffect(() => {
    renderPage()
  }, [renderPage])

  // Cleanup PDF doc on unmount
  useEffect(() => {
    return () => {
      pdfDoc?.destroy()
    }
  }, [pdfDoc])

  const handlePrevPage = () => {
    setCurrentPage(p => Math.max(1, p - 1))
  }

  const handleNextPage = () => {
    setCurrentPage(p => Math.min(totalPages, p + 1))
  }

  const handleZoomIn = () => {
    setZoom(z => Math.min(2.0, +(z + 0.25).toFixed(2)))
  }

  const handleZoomOut = () => {
    setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)))
  }

  const handleOpenExplorer = () => {
    if (source?.file_path) {
      window.electronAPI?.openFileInExplorer(source.file_path)
    }
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  return (
    <>
      {/* Overlay */}
      <div
        className={`pdf-viewer-overlay ${isOpen ? 'open' : ''}`}
        onClick={handleOverlayClick}
      />

      {/* Panel */}
      <div className={`pdf-viewer-panel ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="pdf-panel-header">
          <div className="pdf-panel-title-row">
            <span className="pdf-panel-doc-name">
              {source?.document_name ?? 'Document'}
            </span>

            <div className="pdf-panel-nav">
              <button
                className="pdf-panel-nav-btn"
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                title="Page précédente"
              >
                ‹
              </button>
              <span className="pdf-panel-page-info">
                {currentPage} / {totalPages}
              </span>
              <button
                className="pdf-panel-nav-btn"
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
                title="Page suivante"
              >
                ›
              </button>
            </div>

            <button
              className="pdf-panel-close-btn"
              onClick={onClose}
              title="Fermer"
            >
              ✕
            </button>
          </div>

          {/* RAG chunk excerpt */}
          {source?.chunk_text && (
            <div className="pdf-panel-chunk-excerpt">
              {source.chunk_text}
            </div>
          )}
        </div>

        {/* Canvas area */}
        {loading && (
          <div className="pdf-panel-loading">Chargement du PDF…</div>
        )}
        {error && (
          <div className="pdf-panel-error">{error}</div>
        )}
        {!loading && !error && (
          <div className="pdf-panel-canvas-wrapper">
            <canvas ref={canvasRef} />
          </div>
        )}

        {/* Footer */}
        <div className="pdf-panel-footer">
          <div className="pdf-panel-zoom-controls">
            <button
              className="pdf-panel-zoom-btn"
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
              title="Zoom arrière"
            >
              −
            </button>
            <span className="pdf-panel-zoom-label">
              {Math.round(zoom * 100)}%
            </span>
            <button
              className="pdf-panel-zoom-btn"
              onClick={handleZoomIn}
              disabled={zoom >= 2.0}
              title="Zoom avant"
            >
              +
            </button>
          </div>

          <button
            className="pdf-panel-open-explorer"
            onClick={handleOpenExplorer}
          >
            📂 Ouvrir dans l'explorateur
          </button>
        </div>
      </div>
    </>
  )
}
