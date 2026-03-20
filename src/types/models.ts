export interface Compartment {
  id: string
  name: string
  subject: string
  professor_name: string
  professor_style: string
  exam_date: string | null
  same_prof_as: string[] | null
  created_at: string
  document_count: number
  contradiction_count: number
  mastery_score: number
}

export interface Document {
  id: string
  compartment_id: string
  filename: string
  source_type: 'pdf_upload' | 'scan'
  page_count: number
  indexed_at: string
}

export interface SourceChunk {
  page: number
  excerpt: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: SourceChunk[]
  timestamp: number
}

export interface QuizQuestion {
  question: string
  type: 'qcm' | 'open'
  options?: string[] | null
  expected_answer: string
  source_page: number
}

export interface QuizSession {
  session_id: string
  questions: QuizQuestion[]
}

export interface QuizAnswer {
  question: string
  expected: string
  given: string
  correct: boolean
  source_page: number
}

export interface QuizResult {
  score: number
  total: number
  correct: number
  answers: QuizAnswer[]
}

export interface ExamQuestion {
  question: string
  type: string
  points: number
  expected_answer: string
  source_page: number
}

export interface Exam {
  questions: ExamQuestion[]
  total_points: number
  estimated_duration: number
}

export interface Contradiction {
  id: string
  term: string
  compartment_a_id: string
  compartment_b_id: string
  definition_a: string
  definition_b: string
  severity: number
  detected_at: string
  is_read: boolean
}

export interface Toast {
  id: string
  type: 'success' | 'warning' | 'danger' | 'info'
  message: string
  timestamp: number
}
