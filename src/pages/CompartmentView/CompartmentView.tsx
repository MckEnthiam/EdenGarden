import { useState } from 'react'
import { useCompartmentStore } from '../../stores/compartmentStore'
import ConversationPage from '../ConversationPage/ConversationPage'
import DocumentsPage from '../DocumentsPage/DocumentsPage'
import QuizPage from '../QuizPage/QuizPage'
import ExamPage from '../ExamPage/ExamPage'
import ContradictionsPage from '../ContradictionsPage/ContradictionsPage'
import './CompartmentView.css'

interface Props { compartmentId: string }

type Tab = 'conversation' | 'documents' | 'quiz' | 'exam' | 'contradictions' | 'summary'

export default function CompartmentView({ compartmentId }: Props) {
  const { compartments } = useCompartmentStore()
  const comp = compartments.find((c) => c.id === compartmentId)
  const [activeTab, setActiveTab] = useState<Tab>('conversation')

  if (!comp) return null

  const getDaysUntilExam = (date: string | null) => {
    if (!date) return null
    return Math.ceil((new Date(date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  }

  const days = getDaysUntilExam(comp.exam_date)
  const daysText = days !== null ? `J-${days}` : ''
  const daysClass = days !== null ? (days < 7 ? 'badge-danger' : days < 14 ? 'badge-warning' : 'badge-success') : ''

  return (
    <div className="compartment-view">
      <div className="cv-header">
        <div className="cv-watermark">{comp.name.replace(/[^A-Z0-9]/gi, '_').toUpperCase()}</div>
        <div className="cv-header-content">
          <div className="cv-title-row">
            <h1>{comp.name}</h1>
            <div className="cv-badges">
              <span className="badge badge-accent">{comp.subject}</span>
              {days !== null && <span className={`badge ${daysClass}`}>{daysText}</span>}
            </div>
          </div>
          <div className="cv-subtitle">
            <span className="cv-prof-name">{comp.professor_name}</span>
            <span className="cv-sep"> // </span>
            <span className="cv-prof-style">{comp.professor_style}</span>
          </div>
          
          <div className="cv-mastery-row">
            <span className="cv-mastery-label">MAÎTRISE</span>
            <div className="cv-mastery-track">
              <div className="cv-mastery-fill" style={{ width: `${comp.mastery_score}%` }} />
            </div>
            <span className="cv-mastery-value">{comp.mastery_score}%</span>
          </div>
        </div>
      </div>

      <div className="cv-tabs-container">
        <div className="cv-tabs">
          <button className={`cv-tab ${activeTab === 'conversation' ? 'active' : ''}`} onClick={() => setActiveTab('conversation')}>Conversation</button>
          <button className={`cv-tab ${activeTab === 'quiz' ? 'active' : ''}`} onClick={() => setActiveTab('quiz')}>Quiz</button>
          <button className={`cv-tab ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>Résumé</button>
          <button className={`cv-tab ${activeTab === 'exam' ? 'active' : ''}`} onClick={() => setActiveTab('exam')}>Examen</button>
          <button className={`cv-tab ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => setActiveTab('documents')}>Documents</button>
          <button className={`cv-tab ${activeTab === 'contradictions' ? 'active' : ''}`} onClick={() => setActiveTab('contradictions')}>
            Contradictions
            {comp.contradiction_count > 0 && <span className="tab-badge">{comp.contradiction_count}</span>}
          </button>
        </div>
      </div>

      <div className="cv-content">
        {activeTab === 'conversation' && <ConversationPage compartmentId={compartmentId} />}
        {activeTab === 'documents' && <DocumentsPage compartmentId={compartmentId} />}
        {activeTab === 'quiz' && <QuizPage compartmentId={compartmentId} />}
        {activeTab === 'exam' && <ExamPage compartmentId={compartmentId} />}
        {activeTab === 'contradictions' && <ContradictionsPage compartmentId={compartmentId} />}
        {activeTab === 'summary' && (
          <div className="cv-summary-placeholder">
            Résumé automatique du cours en construction…
          </div>
        )}
      </div>
    </div>
  )
}
