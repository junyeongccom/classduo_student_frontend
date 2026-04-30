/**
 * @file midFinalService.ts
 * @description exam-prep mid/final 슬롯 read + retry API 클라이언트 (b2b20260430 §FR-5)
 * @module features/exam-prep-final/services
 * @dependencies shared/lib/api
 */

import { apiRequest } from '@/shared/lib/api'

export type MidFinalStatus =
  | 'locked'
  | 'generating'
  | 'available'
  | 'mastered'
  | 'failed'

export interface MidTestMetaDto {
  test_id: string | null
  segment_index: 1 | 2 | 3
  status: MidFinalStatus
  mastered_at: string | null
  /** [start, end] 회차 번호 범위 (백엔드가 N 기반 동적 산출) */
  range_session_nos: [number, number]
}

export interface MidTestListResponseDto {
  course_id: string
  items: MidTestMetaDto[]
}

export interface FinalTestMetaDto {
  course_id: string
  test_id: string | null
  status: MidFinalStatus
  mastered_at: string | null
}

export interface MidFinalQuestionItemDto {
  seq: number
  stem: string
  options: string[]
  /** "0"~"3" 문자열 */
  answer: string
  explanation: Record<string, string>
  hint?: string | null
  source_ref?: Record<string, unknown> | null
  difficulty?: number | null
}

export interface MidFinalTestDetailDto {
  test_id: string
  course_id: string | null
  test_type: 'mid' | 'final'
  segment_index: number | null
  questions: MidFinalQuestionItemDto[]
}

// ─────────────────────────────────────────
// list APIs
// ─────────────────────────────────────────

export async function getMidTests(
  courseId: string,
): Promise<{ data: MidTestListResponseDto | null; error: string | null }> {
  const result = await apiRequest<MidTestListResponseDto>(
    `/exam-prep/courses/${courseId}/mid-tests`,
    { auth: true },
  )
  if (result.error) return { data: null, error: result.error.message }
  return { data: result.data ?? null, error: null }
}

export async function getFinalTest(
  courseId: string,
): Promise<{ data: FinalTestMetaDto | null; error: string | null }> {
  const result = await apiRequest<FinalTestMetaDto>(
    `/exam-prep/courses/${courseId}/final-test`,
    { auth: true },
  )
  if (result.error) return { data: null, error: result.error.message }
  return { data: result.data ?? null, error: null }
}

// ─────────────────────────────────────────
// detail APIs
// ─────────────────────────────────────────

export async function getMidTestDetail(
  testId: string,
): Promise<{ data: MidFinalTestDetailDto | null; error: string | null }> {
  const result = await apiRequest<MidFinalTestDetailDto>(
    `/exam-prep/mid-tests/${testId}`,
    { auth: true },
  )
  if (result.error) return { data: null, error: result.error.message }
  return { data: result.data ?? null, error: null }
}

export async function getFinalTestDetail(
  testId: string,
): Promise<{ data: MidFinalTestDetailDto | null; error: string | null }> {
  const result = await apiRequest<MidFinalTestDetailDto>(
    `/exam-prep/final-tests/${testId}`,
    { auth: true },
  )
  if (result.error) return { data: null, error: result.error.message }
  return { data: result.data ?? null, error: null }
}

// ─────────────────────────────────────────
// retry APIs
// ─────────────────────────────────────────

export async function retryMidTest(
  courseId: string,
  segmentIndex: 1 | 2 | 3,
): Promise<{ ok: boolean; error: string | null }> {
  const result = await apiRequest<unknown>(`/exam-prep/mid-tests/retry`, {
    method: 'POST',
    auth: true,
    body: { course_id: courseId, segment_index: segmentIndex },
  })
  if (result.error) return { ok: false, error: result.error.message }
  return { ok: true, error: null }
}

export async function retryFinalTest(
  courseId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const result = await apiRequest<unknown>(`/exam-prep/final-test/retry`, {
    method: 'POST',
    auth: true,
    body: { course_id: courseId },
  })
  if (result.error) return { ok: false, error: result.error.message }
  return { ok: true, error: null }
}

// ─────────────────────────────────────────
// [DEBUG ONLY — 출시 전 삭제] mid 강제 트리거
// ─────────────────────────────────────────

export async function debugTriggerMidTest(
  courseId: string,
  segmentIndex: 1 | 2 | 3,
): Promise<{ ok: boolean; error: string | null }> {
  const result = await apiRequest<unknown>(`/exam-prep/mid-tests/debug-trigger`, {
    method: 'POST',
    auth: true,
    body: { course_id: courseId, segment_index: segmentIndex },
  })
  if (result.error) return { ok: false, error: result.error.message }
  return { ok: true, error: null }
}

export async function debugTriggerFinalTest(
  courseId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const result = await apiRequest<unknown>(`/exam-prep/final-test/debug-trigger`, {
    method: 'POST',
    auth: true,
    body: { course_id: courseId },
  })
  if (result.error) return { ok: false, error: result.error.message }
  return { ok: true, error: null }
}
