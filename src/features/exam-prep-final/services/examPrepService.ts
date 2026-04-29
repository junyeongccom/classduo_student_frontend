/**
 * @file examPrepService.ts
 * @description exam-prep 백엔드 API 호출 서비스 (read + attempt 라이프사이클)
 * @module features/exam-prep-final/services
 * @dependencies shared/lib/api
 *
 * 명명: 51713의 Dto / fetch* 패턴을 정식 채택. attempt 라이프사이클은 r3.1 (HEAD).
 */

import { apiRequest } from '@/shared/lib/api'

// ─────────────────────────────────────────
// read API — core test 메타·상세
// ─────────────────────────────────────────

/** 백엔드 응답 — core test 메타 (목록용) */
export interface CoreTestSummaryDto {
  test_id: string
  lecture_session_id: string
  lecture_no: number
  lecture_date: string | null
  title: string | null
  question_count: number
}

export interface CoreTestListResponseDto {
  course_id: string
  tests: CoreTestSummaryDto[]
}

/** 백엔드 응답 — core test 단일 문항 (정답·해설·hint 포함) */
export interface CoreTestQuestionItemDto {
  seq: number
  stem: string
  options: string[]
  /** "0"~"3" 문자열 인덱스 */
  answer: string
  explanation: Record<string, string>
  hint?: string | null
  source_ref?: Record<string, unknown> | null
  difficulty?: number | null
}

/** 백엔드 응답 — core test 상세 (메타 + 문항) */
export interface CoreTestDetailDto {
  test_id: string
  lecture_session_id: string
  lecture_no: number
  lecture_date: string | null
  title: string | null
  questions: CoreTestQuestionItemDto[]
}

/** 과목 내 모든 core test 목록 조회 */
export async function fetchCoreTestsByCourse(
  courseId: string,
): Promise<{ data: CoreTestListResponseDto | null; error: string | null }> {
  const result = await apiRequest<CoreTestListResponseDto>(
    `/exam-prep/courses/${courseId}/core-tests`,
    { auth: true },
  )
  if (result.error) {
    return { data: null, error: result.error.message }
  }
  return { data: result.data ?? null, error: null }
}

/** 단일 core test 상세 조회 */
export async function fetchCoreTestDetail(
  testId: string,
): Promise<{ data: CoreTestDetailDto | null; error: string | null }> {
  const result = await apiRequest<CoreTestDetailDto>(
    `/exam-prep/core-tests/${testId}`,
    { auth: true },
  )
  if (result.error) {
    return { data: null, error: result.error.message }
  }
  return { data: result.data ?? null, error: null }
}

// ─────────────────────────────────────────
// attempt 라이프사이클 (r3.1)
// ─────────────────────────────────────────

export interface AttemptStartResponseDto {
  attempt_id: string
  test_id: string
  status: 'in_progress' | 'submitted'
  question_ids: string[]
  started_at: string | null
  resumed: boolean
}

export interface AttemptResponseItemDto {
  question_id: string
  selected: string
  is_correct: boolean | null
  answered_at: string | null
}

export interface AttemptDetailResponseDto {
  attempt_id: string
  test_id: string
  status: string
  question_ids: string[]
  started_at: string | null
  submitted_at: string | null
  responses: AttemptResponseItemDto[]
}

export interface GradedQuestionItemDto {
  question_id: string
  selected: string
  is_correct: boolean
  correct_count: number
  incorrect_count: number
  previous_state: 'learning' | 'skilled' | 'master' | string
  new_state: 'learning' | 'skilled' | 'master' | string
  first_master_transition: boolean
}

export interface SubmitAttemptResponseDto {
  attempt_id: string
  test_id: string
  course_id: string | null
  submitted_at: string | null
  graded: GradedQuestionItemDto[]
  test_mastered_now: boolean
  test_mastered_at: string | null
}

/** 응시 시작 또는 이어풀기 */
export async function startOrResumeAttempt(
  testId: string,
): Promise<{ data: AttemptStartResponseDto | null; error: string | null }> {
  const result = await apiRequest<AttemptStartResponseDto>(
    `/exam-prep/tests/${testId}/attempts`,
    { method: 'POST', auth: true },
  )
  if (result.error) return { data: null, error: result.error.message }
  return { data: result.data ?? null, error: null }
}

/** attempt 상태 + 임시저장된 응답 조회 (이어풀기 복원용) */
export async function getAttempt(
  attemptId: string,
): Promise<{ data: AttemptDetailResponseDto | null; error: string | null }> {
  const result = await apiRequest<AttemptDetailResponseDto>(
    `/exam-prep/attempts/${attemptId}`,
    { auth: true },
  )
  if (result.error) return { data: null, error: result.error.message }
  return { data: result.data ?? null, error: null }
}

/** 단일 응답 임시저장 (is_correct=NULL) */
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

/** 제출 + 채점 + 마스터리 갱신 + 보상 이벤트 */
export async function submitAttempt(
  attemptId: string,
): Promise<{ data: SubmitAttemptResponseDto | null; error: string | null }> {
  const result = await apiRequest<SubmitAttemptResponseDto>(
    `/exam-prep/attempts/${attemptId}/submit`,
    { method: 'POST', auth: true },
  )
  if (result.error) return { data: null, error: result.error.message }
  return { data: result.data ?? null, error: null }
}
