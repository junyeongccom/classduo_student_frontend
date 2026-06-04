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
  /** 학생-test 단위 master 도달 여부 (test_user_state.mastered_at) */
  is_mastered: boolean
}

export interface CoreTestListResponseDto {
  course_id: string
  tests: CoreTestSummaryDto[]
}

/** 백엔드 응답 — core test 단일 문항 (정답·해설·hint 포함) */
export interface CoreTestQuestionItemDto {
  /** question_id (UUID) — mastery_summary.by_question 매핑 키 */
  id: string
  seq: number
  stem: string
  /** 영문 stem (한영 토글 시 사용. 백필 전 데이터는 null) */
  stem_eng?: string | null
  options: string[]
  /** 영문 선지 배열 (한국어와 1:1 대응, 정답 인덱스 동일) */
  options_eng?: string[] | null
  /** "0"~"3" 문자열 인덱스 (레거시 단일 4지선다). payload 유형은 미사용. */
  answer: string
  explanation: Record<string, string>
  /** 영문 해설 (선지별 키 opt0~opt3, 한국어와 동일 구조) */
  explanation_eng?: Record<string, string> | null
  /** B2C식 유형. null/undefined = 레거시 단일 4지선다(options/answer 사용). 그 외는 payload 사용 */
  question_format?: string | null
  /** 유형별 구조 데이터 (choices/correct_answer/left_items/right_items/correct_pairs/model_answer 등) */
  payload?: Record<string, unknown> | null
  /** payload 영문 버전 (한영 토글) */
  payload_eng?: Record<string, unknown> | null
  hint?: string | null
  hint_eng?: string | null
  source_ref?: { source_pages?: number[]; source_chunks?: number[] } | null
  /** 강의자료 패널 점프 대상 lecture_id (core: 부모 test 의 lecture, mid: 원본 question lecture, final: LLM 추론) */
  source_lecture_id?: string | null
  difficulty?: number | null
}

/** 백엔드 응답 — test 상세 (메타 + 문항). core/mid/final 통합 shape (b2b20260430 §G18). */
export interface CoreTestDetailDto {
  test_id: string
  /** 'core' | 'mid' | 'final' — 통합 엔드포인트가 채움 */
  test_type?: 'core' | 'mid' | 'final'
  /** core 만 채움. mid/final 은 null */
  lecture_session_id: string | null
  /** core 만 채움 */
  lecture_no: number | null
  lecture_date: string | null
  /** mid 만 채움 (1~3) */
  segment_index?: number | null
  /** core: 회차 제목 / mid: "중간 테스트 N" / final: "최종 테스트" */
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

/** 백엔드 응답 — 과목 내 학생 일자별(KST) 제출 attempt 수 */
export interface CourseAttemptCountsDto {
  course_id: string
  start_date: string  // 'yyyy-mm-dd'
  end_date: string    // 'yyyy-mm-dd'
  /** KST 'yyyy-mm-dd' → 제출 attempt 수 (count > 0 인 키만 포함) */
  counts: Record<string, number>
}

/** 과목 내 학생 일자별 제출 attempt 수 조회.
 *
 * 대시보드 캘린더 + 기말대비학습 책장 "책 권수" 시각화의 데이터 소스.
 * course_id 필터로 다른 과목 풀이 기록이 섞이지 않는다 — 기존 localStorage
 * 단일 키 (`aplus-test-counts-by-date`) 회귀 해결.
 */
export async function fetchCourseAttemptCounts(
  courseId: string,
  startDateIso: string,
  endDateIso: string,
): Promise<{ data: CourseAttemptCountsDto | null; error: string | null }> {
  const qs = new URLSearchParams({ start_date: startDateIso, end_date: endDateIso })
  const result = await apiRequest<CourseAttemptCountsDto>(
    `/exam-prep/courses/${courseId}/attempt-counts?${qs.toString()}`,
    { auth: true },
  )
  if (result.error) {
    return { data: null, error: result.error.message }
  }
  return { data: result.data ?? null, error: null }
}

/** 단일 test 상세 조회 — core/mid/final 통합 (b2b20260430 §G18).
 *
 * 명칭은 historical naming 으로 유지 (CoreTestSolveContainer 와 동일 정책).
 * 경로는 통합 엔드포인트 `/exam-prep/tests/{testId}` 를 사용한다.
 */
export async function fetchCoreTestDetail(
  testId: string,
): Promise<{ data: CoreTestDetailDto | null; error: string | null }> {
  const result = await apiRequest<CoreTestDetailDto>(
    `/exam-prep/tests/${testId}`,
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
  hint_used: boolean | null
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

// ─────────────────────────────────────────
// 즉시 채점 (b2b20260429 r4)
// ─────────────────────────────────────────

export interface MasteryChangeDto {
  question_id: string
  previous_state: 'learning' | 'skilled' | 'master' | string
  new_state: 'learning' | 'skilled' | 'master' | string
  correct_count: number
  incorrect_count: number
  first_master_transition: boolean
}

export interface GradeSingleResponseDto {
  is_correct: boolean
  correct_answer: string  // "0"~"3"
  explanation: Record<string, string> | null
  /** 영문 해설 (백필 전 데이터는 null) */
  explanation_eng?: Record<string, string> | null
  mastery: MasteryChangeDto
  hint_used: boolean
  graded_count: number
  total_count: number
  attempt_completed: boolean
  test_mastered_now: boolean
  test_mastered_at: string | null
}

// ─────────────────────────────────────────
// Mastery summary (풀이 페이지 진입 시 초기 동기화)
// ─────────────────────────────────────────

export interface MasteryStateCountDto {
  learning: number
  skilled: number
  master: number
}

export interface TestMasterySummaryDto {
  test_id: string
  total: number
  summary: MasteryStateCountDto
  /** question_id → state ("learning"/"skilled"/"master") */
  by_question: Record<string, string>
}

/** test 내 모든 문항에 대한 학생 mastery 카운트 + state map.
 * 풀이 페이지에서 mount 시 호출하여 백엔드 누적 mastery 를 초기 카운트로 표시.
 */
export async function fetchTestMasterySummary(
  testId: string,
): Promise<{ data: TestMasterySummaryDto | null; error: string | null }> {
  const result = await apiRequest<TestMasterySummaryDto>(
    `/exam-prep/tests/${testId}/mastery-summary`,
    { auth: true },
  )
  if (result.error) {
    return { data: null, error: result.error.message }
  }
  return { data: result.data ?? null, error: null }
}

/** 단일 문항 즉시 채점.
 *
 * 사용자 정책 (b2b20260429 r4):
 *  - 한 attempt 내 같은 문항은 한 번만 채점 (이미 채점 시 409 RESPONSE_ALREADY_GRADED)
 *  - hint_used=true 면 mastery 카운트 미증가 (응답 행은 저장)
 *  - attempt_completed=true 면 백엔드가 자동 submit 처리 → 결과 화면 진입
 */
export async function gradeAttemptResponse(
  attemptId: string,
  questionId: string,
  selected: string,
  hintUsed: boolean,
): Promise<{ data: GradeSingleResponseDto | null; error: string | null; errorCode: string | null }> {
  const result = await apiRequest<GradeSingleResponseDto>(
    `/exam-prep/attempts/${attemptId}/responses/${questionId}/grade`,
    {
      method: 'POST',
      auth: true,
      body: { selected, hint_used: hintUsed },
    },
  )
  if (result.error) {
    return {
      data: null,
      error: result.error.message,
      errorCode: result.error.error_code ?? null,
    }
  }
  return { data: result.data ?? null, error: null, errorCode: null }
}
