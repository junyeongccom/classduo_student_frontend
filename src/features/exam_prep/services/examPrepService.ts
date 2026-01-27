import { apiRequest } from '@/shared/lib/api'

export interface CourseApiResponse {
  courses: Array<{
    course_id: string
    title: string
    professor_name?: string | null
    academic_year?: string | number
    term_code?: string
    section?: string
  }>
}

export interface ExamPrepMaterialsResponse {
  course_id: string
  materials: Array<{
    material_id: string
    original_filename: string
    file_type: string
    status: string
    signed_url: string | null
  }>
}

export interface ExamPrepSummaryResponse {
  material_id: string
  summary: {
    overview: string
    sections: Array<{
      title: string
      bullets: string[]
      tables?: Array<{
        title?: string | null
        headers: string[]
        rows: string[][]
      }>
    }>
    recent_issues?: string[]
    exam_points?: string[]
  }
  updated_at?: string
}

export interface ExamPrepGlossaryResponse {
  material_id: string
  terms: Array<{
    term_id: string
    term: string
    definition: string
    example?: string | null
    source_page?: number | null
    source_text?: string | null
    created_at?: string | null
  }>
}

export interface ExamPrepNotesResponse {
  material_id: string
  notes: Array<{
    note_scope: 'single' | 'page'
    page_number: number
    content_json: Record<string, unknown>
    updated_at?: string | null
  }>
}

export interface ExamPrepNoteUpsertRequest {
  note_scope: 'single' | 'page'
  page_number: number
  content_json: Record<string, unknown>
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

export interface ExamPrepQuizSessionCreateRequest {
  quiz_types?: Array<'RECALL' | 'STRUCTURE' | 'MISCONCEPTION'>
  count: number
  language: 'ko' | 'en'
}

export interface ExamPrepQuizSessionResponse {
  session_id: string
  material_id: string
  generation_batch_id: string
  status: string
  created_at: string
}

export interface ExamPrepQuizSessionListResponse {
  material_id: string
  sessions: Array<{
    session_id: string
    generation_batch_id: string
    quiz_count: number
    correct_count: number
    incorrect_count: number
    created_at: string
  }>
}

export interface ExamPrepQuizSessionDetailResponse {
  session_id: string
  material_id: string
  quizzes: Array<{
    quiz_id: string
    quiz_type: 'RECALL' | 'STRUCTURE' | 'MISCONCEPTION'
    question: string
    answer?: string | null
    explanation?: string | null
    choices?: Array<{
      choice_order: number
      choice_text: string
      is_correct: boolean
    }> | null
    user_answer?: {
      is_correct: boolean
      answer_text?: string | null
      choice_order?: number | null
    } | null
  }>
}

export interface ExamPrepQuizAnswerRequest {
  quiz_id: string
  answer_text?: string | null
  choice_order?: number | null
}

export interface ExamPrepQuizAnswerResponse {
  quiz_id: string
  is_correct: boolean
  correct_answer?: string | null
  updated_at: string
}

export interface ExamPrepAiTutorChatRequest {
  question: string
  lecture_ids: string[]
  material_ids: string[]
  material_top_k?: number
  chat_history?: Array<{ role: string; content: string }>
  session_id?: string | null
}

export interface ExamPrepAiTutorChatResponse {
  answer: string
  references: Array<{
    type: string
    source_id: string
    content: string
    metadata?: Record<string, unknown>
    citations?: Array<{ start: number; end: number; text: string }>
  }>
  chat_history: Array<{ role: string; content: string }>
}

export const examPrepService = {
  getCourses: () =>
    apiRequest<CourseApiResponse>('/courses/all', {
      method: 'GET',
      auth: true,
    }),
  getCourseMaterials: (courseId: string) =>
    apiRequest<ExamPrepMaterialsResponse>(`/exam-prep/courses/${courseId}/materials`, {
      method: 'GET',
      auth: true,
    }),
  getSummary: (materialId: string, language: 'ko' | 'en') =>
    apiRequest<ExamPrepSummaryResponse>(`/exam-prep/materials/${materialId}/summary?lang=${language}`, {
      method: 'GET',
      auth: true,
    }),
  getGlossary: (materialId: string, language: 'ko' | 'en') =>
    apiRequest<ExamPrepGlossaryResponse>(`/exam-prep/materials/${materialId}/glossary?lang=${language}`, {
      method: 'GET',
      auth: true,
    }),
  getNotes: (materialId: string, noteScope: 'single' | 'page', pageNumber?: number) => {
    const params = new URLSearchParams({ note_scope: noteScope })
    if (pageNumber !== undefined) {
      params.set('page_number', String(pageNumber))
    }
    return apiRequest<ExamPrepNotesResponse>(`/exam-prep/materials/${materialId}/notes?${params.toString()}`, {
      method: 'GET',
      auth: true,
    })
  },
  saveNote: (materialId: string, payload: ExamPrepNoteUpsertRequest) =>
    apiRequest<ExamPrepNotesResponse>(`/exam-prep/materials/${materialId}/notes`, {
      method: 'PUT',
      auth: true,
      body: payload,
    }),
  getAnnotations: (materialId: string, pageNumber?: number) => {
    const params = pageNumber !== undefined ? `?page_number=${pageNumber}` : ''
    return apiRequest<ExamPrepAnnotationsResponse>(`/exam-prep/materials/${materialId}/annotations${params}`, {
      method: 'GET',
      auth: true,
    })
  },
  saveAnnotation: (materialId: string, payload: ExamPrepAnnotationUpsertRequest) =>
    apiRequest<ExamPrepAnnotationsResponse>(`/exam-prep/materials/${materialId}/annotations`, {
      method: 'PUT',
      auth: true,
      body: payload,
    }),
  createQuizSession: (materialId: string, payload: ExamPrepQuizSessionCreateRequest) =>
    apiRequest<ExamPrepQuizSessionResponse>(`/exam-prep/materials/${materialId}/quiz-sessions`, {
      method: 'POST',
      auth: true,
      body: payload,
    }),
  getQuizSessions: (materialId: string) =>
    apiRequest<ExamPrepQuizSessionListResponse>(`/exam-prep/materials/${materialId}/quiz-sessions`, {
      method: 'GET',
      auth: true,
    }),
  getQuizSessionDetail: (sessionId: string) =>
    apiRequest<ExamPrepQuizSessionDetailResponse>(`/exam-prep/quiz-sessions/${sessionId}`, {
      method: 'GET',
      auth: true,
    }),
  getQuizSessionWrong: (sessionId: string) =>
    apiRequest<ExamPrepQuizSessionDetailResponse>(`/exam-prep/quiz-sessions/${sessionId}/wrong`, {
      method: 'GET',
      auth: true,
    }),
  submitQuizAnswer: (sessionId: string, payload: ExamPrepQuizAnswerRequest) =>
    apiRequest<ExamPrepQuizAnswerResponse>(`/exam-prep/quiz-sessions/${sessionId}/answers`, {
      method: 'POST',
      auth: true,
      body: payload,
    }),
  aiTutorChat: (payload: ExamPrepAiTutorChatRequest) =>
    apiRequest<ExamPrepAiTutorChatResponse>('/ai-tutor/chat', {
      method: 'POST',
      auth: true,
      body: payload,
    }),
}

