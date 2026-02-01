import { apiRequest } from '@/shared/lib/api'
import {
  getSupabaseClient,
  getErrorMessage,
  handleJWTExpiration,
  isJWTExpiredError,
} from '@/shared/lib/supabase'

const normalizeStoragePath = (path?: string | null) => {
  if (!path) return null
  const normalized = path.replace(/^\/+/, '')
  const prefixes = ['materials_pdf_originals/', 'materials/']
  for (const prefix of prefixes) {
    if (normalized.startsWith(prefix)) {
      return normalized.slice(prefix.length)
    }
  }
  return normalized
}

const sanitizeFilename = (filename: string) => {
  if (!filename) return 'unnamed.pdf'
  if (filename.includes('.')) {
    const lastIndex = filename.lastIndexOf('.')
    const base = filename.slice(0, lastIndex)
    const ext = filename.slice(lastIndex + 1)
    let safeBase = base.replace(/[^A-Za-z0-9._-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '')
    if (!safeBase) safeBase = 'unnamed'
    const safeExt = ext.replace(/[^A-Za-z0-9]/g, '')
    return safeExt ? `${safeBase}.${safeExt}` : safeBase
  }
  const safeName = filename.replace(/[^A-Za-z0-9._-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '')
  return safeName || 'unnamed'
}

const buildOriginalPdfFilename = (originalFilename: string, fileType: string) => {
  if (fileType === 'pdf') {
    return sanitizeFilename(originalFilename)
  }
  const baseName = originalFilename.includes('.') ? originalFilename.slice(0, originalFilename.lastIndexOf('.')) : originalFilename
  return sanitizeFilename(`${baseName}.pdf`)
}

const buildSignedUrlForMaterial = async (
  material: {
    material_id: string
    original_filename: string | null
    file_type: string | null
    status: string | null
    original_pdf_path?: string | null
  },
  expiresIn = 600
) => {
  const status = material.status ?? ''
  const materialId = material.material_id
  if (!materialId || ['FAILED', 'ERROR'].includes(status)) {
    return null
  }

  const fileType = (material.file_type ?? '').toLowerCase()
  const originalFilename = material.original_filename || 'unnamed.pdf'
  const candidates: Array<{ bucket: string; path: string }> = []

  const normalizedPath = normalizeStoragePath(material.original_pdf_path)
  if (normalizedPath) {
    candidates.push({ bucket: 'materials_pdf_originals', path: normalizedPath })
  }

  const filename = buildOriginalPdfFilename(originalFilename, fileType)
  if (filename) {
    candidates.push({ bucket: 'materials_pdf_originals', path: `raw/${materialId}/${filename}` })
  }

  candidates.push({ bucket: 'materials', path: `raw/${materialId}/source.pdf` })
  candidates.push({ bucket: 'materials', path: `source/${materialId}/source.pdf` })

  const supabase = getSupabaseClient()
  for (const candidate of candidates) {
    try {
      const { data, error } = await supabase.storage
        .from(candidate.bucket)
        .createSignedUrl(candidate.path, expiresIn)
      if (data?.signedUrl && !error) {
        return data.signedUrl
      }
    } catch {
      // ignore and try next candidate
    }
  }

  return null
}

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
  // 프론트에서는 유형/문항 수를 선택하지 않는다. (백엔드에서 정책적으로 결정)
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
    title?: string | null
    status: string
    quiz_count: number
    correct_count: number
    incorrect_count: number
    created_at: string
  }>
}

export interface ExamPrepQuizSessionRenameRequest {
  title: string
}

export interface ExamPrepQuizSessionRenameResponse {
  session_id: string
  title?: string | null
  updated_at?: string | null
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
  getCourseMaterialsDirect: async (courseId: string) => {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('lecture_materials')
        .select('material_id, original_filename, file_type, status, original_pdf_path')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false })

      if (error) {
        if (isJWTExpiredError(error)) {
          const refreshed = await handleJWTExpiration()
          if (!refreshed) {
            return { data: null, error: new Error('세션이 만료되었습니다. 다시 로그인해주세요.') }
          }
          return { data: null, error: new Error('세션이 만료되어 갱신되었습니다. 다시 시도해주세요.') }
        }
        return { data: null, error: new Error(getErrorMessage(error)) }
      }

      const materials = await Promise.all(
        (data ?? []).map(async (material) => ({
          material_id: material.material_id,
          original_filename: material.original_filename || 'unnamed.pdf',
          file_type: (material.file_type || '').toLowerCase(),
          status: material.status || '',
          signed_url: await buildSignedUrlForMaterial(material),
        }))
      )

      return {
        data: {
          course_id: courseId,
          materials,
        },
        error: null,
      }
    } catch (error) {
      if (isJWTExpiredError(error)) {
        const refreshed = await handleJWTExpiration()
        if (!refreshed) {
          return { data: null, error: new Error('세션이 만료되었습니다. 다시 로그인해주세요.') }
        }
        return { data: null, error: new Error('세션이 만료되어 갱신되었습니다. 다시 시도해주세요.') }
      }
      return { data: null, error: error instanceof Error ? error : new Error(getErrorMessage(error)) }
    }
  },
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
  renameQuizSession: (sessionId: string, payload: ExamPrepQuizSessionRenameRequest) =>
    apiRequest<ExamPrepQuizSessionRenameResponse>(`/exam-prep/quiz-sessions/${sessionId}`, {
      method: 'PATCH',
      auth: true,
      body: payload,
    }),
  deleteQuizSession: (sessionId: string) =>
    apiRequest<null>(`/exam-prep/quiz-sessions/${sessionId}`, {
      method: 'DELETE',
      auth: true,
    }),
  aiTutorChat: (payload: ExamPrepAiTutorChatRequest) =>
    apiRequest<ExamPrepAiTutorChatResponse>('/ai-tutor/chat', {
      method: 'POST',
      auth: true,
      body: payload,
    }),
}

