import { useState } from 'react'
import { quizApi } from '../../api/client'
import { useSettingsStore } from '../../stores/settingsStore'
import { QuizSession, QuizResult, QuizQuestion } from '../../types/models'
import './QuizPage.css'

interface Props { compartmentId: string }

export default function QuizPage({ compartmentId }: Props) {
  const [session, setSession] = useState<QuizSession | null>(null)
  const [result, setResult] = useState<QuizResult | null>(null)
  const [nQuestions, setNQuestions] = useState(5)
  const [quizType, setQuizType] = useState('mixed')
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(false)
  const { apiKey, addToast } = useSettingsStore()

  const generate = async () => {
    setLoading(true)
    setSession(null)
    setResult(null)
    setAnswers({})
    try {
      const qs = await quizApi.generate(compartmentId, nQuestions, quizType, apiKey)
      setSession(qs)
    } catch (e) {
      addToast('danger', `Erreur de génération : ${(e as Error).message}`)
    }
    setLoading(false)
  }

  const submit = async () => {
    if (!session) return
    setLoading(true)
    try {
      const payload = session.questions.map((_, i) => ({
        question_index: i,
        user_answer: answers[i] ?? '',
      }))
      const res = await quizApi.submit(session.session_id, payload, apiKey)
      setResult(res)
    } catch (e) {
      addToast('danger', `Erreur de correction : ${(e as Error).message}`)
    }
    setLoading(false)
  }

  if (result) {
    const scoreClass = result.score >= 70 ? 'score-success' : result.score >= 40 ? 'score-warning' : 'score-danger'
    return (
      <div className="quiz-result-page">
        <div className={`score-circle ${scoreClass}`}>{result.score.toFixed(0)}%</div>
        <div className="score-label">{result.correct} / {result.total} correctes</div>
        
        <div className="result-list">
          {result.answers.map((r, i) => (
            <div key={i} className={`result-card ${r.correct ? 'res-correct' : 'res-incorrect'}`}>
              <div className="res-q">Q_{String(i + 1).padStart(2, '0')} // {r.question}</div>
              <div className="res-expected">Correct : {r.expected}</div>
              <div className="res-given">Vous : {r.given || '—'}</div>
              <div className="res-source">Source : p.{r.source_page}</div>
            </div>
          ))}
        </div>
        <button className="btn-accent mt-4" onClick={() => setResult(null)}>Nouveau Quiz</button>
      </div>
    )
  }

  return (
    <div className="quiz-page">
      {!session ? (
        <div className="quiz-setup">
          <div className="quiz-header">
            <h2 className="quiz-title">Générer un quiz</h2>
            <div className="quiz-controls">
              <select value={nQuestions} onChange={(e) => setNQuestions(Number(e.target.value))}>
                <option value={5}>5 questions</option>
                <option value={10}>10 questions</option>
                <option value={20}>20 questions</option>
              </select>
              <select value={quizType} onChange={(e) => setQuizType(e.target.value)}>
                <option value="mixed">Mixte</option>
                <option value="qcm">QCM uniquement</option>
                <option value="open">Ouvert uniquement</option>
              </select>
              <button className="btn-accent" onClick={generate} disabled={loading}>
                {loading ? 'Génération…' : 'Générer'}
              </button>
            </div>
          </div>
          {loading && (
            <div className="quiz-skeleton">
              <div className="skeleton" style={{ height: 160, borderRadius: 10 }} />
              <div className="skeleton" style={{ height: 160, borderRadius: 10 }} />
            </div>
          )}
        </div>
      ) : (
        <div className="quiz-active">
          {session.questions.map((q, i) => (
            <div key={i} className="quiz-card">
              <div className="quiz-q-num">Q_{String(i + 1).padStart(2, '0')} //</div>
              <div className="quiz-q-text">{q.question}</div>
              {q.options && q.options.length > 0 ? (
                <div className="quiz-options">
                  {q.options.map((opt, j) => (
                    <label key={j} className={`quiz-option ${answers[i] === opt ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name={`q-${i}`}
                        value={opt}
                        checked={answers[i] === opt}
                        onChange={(e) => setAnswers({ ...answers, [i]: e.target.value })}
                        style={{ display: 'none' }}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <textarea
                  className="quiz-textarea"
                  rows={3}
                  placeholder="Votre réponse…"
                  value={answers[i] ?? ''}
                  onChange={(e) => setAnswers({ ...answers, [i]: e.target.value })}
                />
              )}
            </div>
          ))}
          <div className="quiz-submit-row">
            <button className="btn-accent" onClick={submit} disabled={loading}>
              {loading ? 'Correction en cours…' : 'Soumettre mes réponses'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
