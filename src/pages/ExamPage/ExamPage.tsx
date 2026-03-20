import { useState } from 'react'
import { examApi } from '../../api/client'
import { useSettingsStore } from '../../stores/settingsStore'
import { Exam } from '../../types/models'
import './ExamPage.css'

interface Props { compartmentId: string }

export default function ExamPage({ compartmentId }: Props) {
  const [exam, setExam] = useState<Exam | null>(null)
  const [loading, setLoading] = useState(false)
  const { apiKey, addToast } = useSettingsStore()

  const generate = async () => {
    setLoading(true)
    setExam(null)
    try {
      const ex = await examApi.generate(compartmentId, apiKey)
      setExam(ex)
    } catch (e) {
      addToast('danger', `Erreur de génération : ${(e as Error).message}`)
    }
    setLoading(false)
  }

  return (
    <div className="exam-page">
      {!exam && !loading && (
        <div className="exam-setup">
          <div className="exam-banner">
            Cet examen est généré en analysant les patterns de votre professeur et vos points faibles issus des quiz.
          </div>
          <button className="btn-accent exam-generate-btn" onClick={generate}>
            Générer l'examen prédictif
          </button>
        </div>
      )}

      {loading && (
        <div className="exam-skeleton">
          <div className="exam-banner">Analyse des documents et des patterns du professeur en cours…</div>
          <div className="skeleton" style={{ height: 120, borderRadius: 10 }} />
          <div className="skeleton" style={{ height: 120, borderRadius: 10 }} />
        </div>
      )}

      {exam && (
        <div className="exam-active">
          <div className="exam-header-infos">
            <span className="exam-meta-pill">DURÉE ESTIMÉE : {exam.estimated_duration} MIN</span>
            <span className="exam-meta-pill">TOTAL : {exam.total_points} PTS</span>
          </div>

          <div className="exam-q-list">
            {exam.questions.map((q, i) => (
              <div key={i} className="exam-q-card">
                <div className="exam-q-header">
                  <span className="exam-q-num">Q_{String(i + 1).padStart(2, '0')}</span>
                  <span className="exam-q-pts">/ {q.points} pt{q.points > 1 ? 's' : ''}</span>
                </div>
                <div className="exam-q-text">{q.question}</div>
                <div className="exam-q-answer">
                  <div className="exam-q-answer-label">Corrigé attendu :</div>
                  {q.expected_answer}
                </div>
                <div className="exam-q-source">Source : page {q.source_page}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
