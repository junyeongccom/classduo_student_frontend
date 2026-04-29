/**
 * @file examPrepService.ts
 * @description exam_prep 백엔드 API 클라이언트 (core test 조회 + attempt 라이프사이클)
 * @module features/exam-prep-final/services
 * @dependencies shared/lib/api
 */
import { apiRequest } from '@/shared/lib/api'

// ─── core test 조회 ───

export interface CoreTestSummary {
  test_id: string
  lecture_session_id: string
  lecture_no: number
  lecture_date: string | null
  title: string | null
  question_count: number
}

export interface CoreTestListResponse {
  course_id: string
  tests: CoreTestSummary[]
}

export interface CoreTestQuestionItem {
  seq: number
  stem: string
  options: string[]
  /** "0"~"3" */
  answer: string
  explanation: Record<string, string>
  hint?: string | null
  source_ref?: Record<string, unknown> | null
  difficulty?: number | null
}

export interface CoreTestDetailResponse {
  test_id: string
  lecture_session_id: string
  lecture_no: number
  lecture_date: string | null
  title: string | null
  questions: CoreTestQuestionItem[]
}

export async function listCoreTests(
  courseId: string,
): Promise<{ data: CoreTestListResponse | null; error: string | null }> {
  const result = await apiRequest<CoreTestListResponse>(
    `/exam-prep/courses/${courseId}/core-tests`,
    { method: 'GET', auth: true },
  )
  if (result.error) return { data: null, error: result.error.message }
  return { data: result.data, error: null }
}

export async function getCoreTestDetail(
  testId: string,
): Promise<{ data: CoreTestDetailResponse | null; error: string | null }> {
  const result = await apiRequest<CoreTestDetailResponse>(
    `/exam-prep/core-tests/${testId}`,
    { method: 'GET', auth: true },
  )
  if (result.error) return { data: null, error: result.error.message }
  return { data: result.data, error: null }
}

// ─── attempt 라이프사이클 ───

export interface AttemptStartResponse {
  attempt_id: string
  test_id: string
  status: 'in_progress' | 'submitted'
  question_ids: string[]
  started_at: string | null
  resumed: boolean
}

export interface AttemptResponseItem {
  question_id: string
  selected: string
  is_correct: boolean | null
  answered_at: string | null
}

export interface AttemptDetailResponse {
  attempt_id: string
  test_id: string
  status: string
  question_ids: string[]
  started_at: string | null
  submitted_at: string | null
  responses: AttemptResponseItem[]
}

export interface GradedQuestionItem {
  question_id: string
  selected: string
  is_correct: boolean
  correct_count: number
  incorrect_count: number
  previous_state: 'learning' | 'skilled' | 'master' | string
  new_state: 'learning' | 'skilled' | 'master' | string
  first_master_transition: boolean
}

export interface SubmitAttemptResponse {
  attempt_id: string
  test_id: string
  course_id: string | null
  submitted_at: string | null
  graded: GradedQuestionItem[]
  test_mastered_now: boolean
  test_mastered_at: string | null
}

export async function startOrResumeAttempt(
  testId: string,
): Promise<{ data: AttemptStartResponse | null; error: string | null }> {
  const result = await apiRequest<AttemptStartResponse>(
    `/exam-prep/tests/${testId}/attempts`,
    { method: 'POST', auth: true },
  )
  if (result.error) return { data: null, error: result.error.message }
  return { data: result.data, error: null }
}

export async function getAttempt(
  attemptId: string,
): Promise<{ data: AttemptDetailResponse | null; error: string | null }> {
  const result = await apiRequest<AttemptDetailResponse>(
    `/exam-prep/attempts/${attemptId}`,
    { method: 'GET', auth: true },
  )
  if (result.error) return { data: null, error: result.error.message }
  return { data: result.data, error: null }
}

export async function saveAttemptResponse(
  attemptId: string,
  questionId: string,
  selected: string,
): Promise<{ ok: boolean; error: string | null }> {
  const result = await apiRequest<unknown>(
    `/exam-prep/attempts/${attemptId}/responses`,
    {
      method: 'PATCH',
      auth: true,
      body: { question_id: questionId, selected },
    },
  )
  if (result.error) return { ok: false, error: result.error.message }
  return { ok: true, error: null }
}

export async function submitAttempt(
  attemptId: string,
): Promise<{ data: SubmitAttemptResponse | null; error: string | null }> {
  const result = await apiRequest<SubmitAttemptResponse>(
    `/exam-prep/attempts/${attemptId}/submit`,
    { method: 'POST', auth: true },
  )
  if (result.error) return { data: null, error: result.error.message }
  return { data: result.data, error: null }
}
