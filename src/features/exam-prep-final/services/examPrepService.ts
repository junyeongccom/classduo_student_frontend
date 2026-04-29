/**
 * @file examPrepService.ts
 * @description 백엔드 exam-prep core test read API 호출 서비스
 * @module features/exam-prep-final/services
 * @dependencies shared/lib/api
 */

import { apiRequest } from '@/shared/lib/api'

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

/** 백엔드 응답 — core test 단일 문항 */
export interface CoreTestQuestionItemDto {
  seq: number
  stem: string
  options: string[]
  /** "0"~"3" 문자열 인덱스 */
  answer: string
  explanation: Record<string, string>
  source_ref: Record<string, unknown> | null
  difficulty: number | null
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

/** 단일 core test 상세 조회 (lecture_session_id 또는 test_id 로) */
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
