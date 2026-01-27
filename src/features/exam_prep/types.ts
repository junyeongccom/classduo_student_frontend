export type ExamPrepTab = 'summary' | 'quiz' | 'memorize' | 'notes' | 'aiTutor'

export interface ExamPrepMaterial {
  id: string
  title: string
  fileType?: string
  signedUrl?: string | null
}

export interface ExamPrepCourse {
  id: string
  title: string
  professorName?: string | null
  termLabel?: string
  section?: string | null
}

export interface ExamPrepSummaryTable {
  title?: string | null
  headers: string[]
  rows: string[][]
}

export interface ExamPrepSummarySection {
  title: string
  bullets: string[]
  tables?: ExamPrepSummaryTable[]
}

export interface ExamPrepSummary {
  overview: string
  sections: ExamPrepSummarySection[]
  recent_issues?: string[]
  exam_points?: string[]
}

export interface ExamPrepGlossaryTerm {
  term_id: string
  term: string
  definition: string
  example?: string | null
  source_page?: number | null
  source_text?: string | null
  created_at?: string | null
}

export type ExamPrepNoteScope = 'single' | 'page'

export interface ExamPrepNoteItem {
  noteScope: ExamPrepNoteScope
  pageNumber: number
  content: Record<string, unknown>
  updatedAt?: string | null
}

export interface ExamPrepNotesResponse {
  material_id: string
  notes: Array<{
    note_scope: ExamPrepNoteScope
    page_number: number
    content_json: Record<string, unknown>
    updated_at?: string | null
  }>
}

export interface ExamPrepNoteUpsertRequest {
  note_scope: ExamPrepNoteScope
  page_number: number
  content_json: Record<string, unknown>
}

export interface ExamPrepAnnotationItem {
  pageNumber: number
  data: Record<string, unknown>
  updatedAt?: string | null
}

export interface ExamPrepAnnotationsResponse {
  material_id: string
  annotations: Array<{
    page_number: number
    data_json: Record<string, unknown>
    updated_at?: string | null
  }>
}

export interface ExamPrepAnnotationUpsertRequest {
  page_number: number
  data_json: Record<string, unknown>
}

export type ExamPrepQuizType = 'RECALL' | 'STRUCTURE' | 'MISCONCEPTION'

export interface ExamPrepQuizChoice {
  choice_order: number
  choice_text: string
  is_correct: boolean
}

export interface ExamPrepUserAnswer {
  is_correct: boolean
  answer_text?: string | null
  choice_order?: number | null
}

export interface ExamPrepQuizItem {
  quiz_id: string
  quiz_type: ExamPrepQuizType
  question: string
  answer?: string | null
  explanation?: string | null
  choices?: ExamPrepQuizChoice[] | null
  user_answer?: ExamPrepUserAnswer | null
}

export interface ExamPrepQuizSession {
  session_id: string
  generation_batch_id: string
  quiz_count: number
  correct_count: number
  incorrect_count: number
  created_at: string
}

