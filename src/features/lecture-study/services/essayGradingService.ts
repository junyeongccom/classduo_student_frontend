/**
 * @file essayGradingService.ts
 * @description 서술형 답안 제출(202) · 루브릭 채점 결과 폴링 조회 API 서비스
 * @module features/lecture-study/services
 * @dependencies shared/lib/api, shared/components/quiz
 */

import { apiRequest } from '@/shared/lib/api'
import type { EssayGradingCriterion } from '@/shared/components/quiz'

/** POST 응답 — 답안은 저장됐고 채점은 뒤따른다 */
export interface EssaySubmissionResponse {
  response_id: string
  quiz_id: string
  quiz_source: string
  grading_status: string
}

/** 채점 결과 payload. 서버가 필드를 추가할 수 있어 알려진 것만 좁게 읽는다. */
export interface EssayGradingPayload {
  criteria?: EssayGradingCriterion[]
  feedback?: string | null
  model?: string | null
}

/** GET 응답 (폴링) */
export interface EssayGradingResponse {
  response_id: string
  quiz_id: string
  /** pending | graded | failed */
  grading_status: string
  score: number | null
  is_correct: boolean | null
  grading: EssayGradingPayload | null
  answer_text: string | null
}

/**
 * 서술형 답안 제출. 답안은 즉시 저장되고(202) 채점은 백그라운드로 돈다 —
 * 응답의 response_id 로 getEssayGrading 을 폴링해 결과를 받는다.
 *
 * 기존 PATCH /quiz-status/{source}/{id}/correct 경로(객관식·리셋)는 그대로 두고
 * 서술형 제출만 이 경로를 쓴다. 정오답 판정은 서버가 점수에서 파생하므로 보내지 않는다.
 */
export function submitEssayAnswer(
  quizId: string,
  lectureId: string,
  answerText: string,
  durationMs?: number | null,
) {
  return apiRequest<EssaySubmissionResponse>(
    `/learning/quizzes/${encodeURIComponent(quizId)}/essay-submissions`,
    {
      method: 'POST',
      auth: true,
      body: {
        answer_text: answerText,
        lecture_id: lectureId,
        duration_ms: durationMs ?? null,
      },
    },
  )
}

/** 채점 결과 조회 (폴링). grading_status: pending | graded | failed */
export function getEssayGrading(quizId: string, responseId: string) {
  return apiRequest<EssayGradingResponse>(
    `/learning/quizzes/${encodeURIComponent(quizId)}/essay-grading?response_id=${encodeURIComponent(responseId)}`,
    { method: 'GET', auth: true },
  )
}
