import { useEffect, useRef, useState } from 'react'
import { Compartment } from '../../types/models'
import { useCompartmentStore } from '../../stores/compartmentStore'
import { useSettingsStore } from '../../stores/settingsStore'
import './Sidebar.css'

function hashColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 35%, 38%)`
}

function getDaysUntilExam(examDate: string | null): number | null {
  if (!examDate) return null
  const now = new Date()
  const exam = new Date(examDate)
  return Math.ceil((exam.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

interface CompartmentFolderProps {
  comp: Compartment
  isActive: boolean
  onClick: () => void
}

function CompartmentFolder({ comp, isActive, onClick }: CompartmentFolderProps) {
  const accentColor = hashColor(comp.name)
  const days = getDaysUntilExam(comp.exam_date)
  const daysText = days !== null ? `${days}j` : ''
  const daysClass = days !== null
    ? days < 7 ? 'exam-danger' : days < 14 ? 'exam-warning' : 'exam-ok'
    : ''

  return (
    <div
      className={`folder-wrapper ${isActive ? 'folder-active' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <div className="folder-tab" style={{ background: isActive ? 'var(--color-folder-tab-bg)' : accentColor }}>
        <span className="folder-tab-name">{comp.name.substring(0, 10)}</span>
      </div>
      <div className="folder-body" style={{ borderLeftColor: isActive ? 'var(--color-folder-active-border)' : '' }}>
        {comp.contradiction_count > 0 && (
          <span className="contradiction-dot" title="Contradictions non lues" />
        )}
        <div className="folder-course-name">{comp.subject.substring(0, 40)}</div>
        <div className="folder-prof">{comp.professor_name}</div>
        <div className="folder-meta">
          <span>{comp.document_count} doc{comp.document_count !== 1 ? 's' : ''}</span>
          {days !== null && (
            <span className={`folder-exam-date ${daysClass}`}>{daysText}</span>
          )}
        </div>
      </div>
    </div>
  )
}

interface SidebarProps {
  onNewCompartment: () => void
  onOpenSettings: () => void
}

export default function Sidebar({ onNewCompartment, onOpenSettings }: SidebarProps) {
  const { compartments, activeCompartmentId, setActiveCompartment } = useCompartmentStore()
  const { theme, mode, setMode, providerLabel, provider } = useSettingsStore()

  const providerColors: Record<string, string> = {
    groq: '#F55036',
    gemini: '#4285F4',
    openai: '#10A37F',
    anthropic: '#CC785C',
  }
  const providerColor = providerColors[provider] ?? '#888780'

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span>EDEN</span>
        <span className="logo-garden">GARDEN</span>
      </div>

      <button className="new-compartment-btn" onClick={onNewCompartment}>
        <span>+ Nouveau compartiment</span>
      </button>

      <div className="sidebar-section-label">COURS</div>
      <div className="sidebar-compartments">
        {compartments.length === 0 && (
          <p className="sidebar-empty">Aucun cours. Créez votre premier compartiment.</p>
        )}
        {compartments.map((comp) => (
          <CompartmentFolder
            key={comp.id}
            comp={comp}
            isActive={activeCompartmentId === comp.id}
            onClick={() => setActiveCompartment(comp.id)}
          />
        ))}
      </div>

      <div className="sidebar-divider" />

      <div className="sidebar-section-label">OUTILS</div>
      <button className="sidebar-settings-btn" onClick={onOpenSettings}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"/><path d="M19.1 4.9C15.2 1 8.8 1 4.9 4.9S1 15.2 4.9 19.1 15.2 23 19.1 19.1 23 8.8 19.1 4.9z"/>
        </svg>
        Paramètres
      </button>

      <div className="sidebar-bottom">
        <div className="theme-toggle" onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')} title="Toggle theme">
          <span className={mode === 'light' ? 'theme-icon active' : 'theme-icon'}>⏾</span>
          <div className={`theme-pill ${mode === 'light' ? 'light-mode' : ''}`}>
            <div className="theme-thumb" />
          </div>
          <span className={mode === 'dark' ? 'theme-icon active' : 'theme-icon'}>☀</span>
        </div>
        <div
          className={`model-badge ${provider === 'unknown' ? 'model-badge-none' : ''}`}
          style={{ '--provider-color': providerColor } as React.CSSProperties}
          onClick={provider === 'unknown' ? onOpenSettings : undefined}
        >
          {providerLabel}
        </div>
      </div>
    </aside>
  )
}
