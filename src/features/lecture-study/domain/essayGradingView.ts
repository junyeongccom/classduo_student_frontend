/**
 * @file essayGradingView.ts
 * @description 서술형 채점 API 응답 → 화면이 쓰는 표시 모델 변환 (순수 함수)
 * @module features/lecture-study/domain
 * @dependencies shared/components/quiz
 */

import type { EssayGradingCriterion, EssayGradingView } from '@/shared/components/quiz'

/** 폴링 간격. 채점은 보통 수 초 안에 끝나므로 2초면 체감 지연 없이 요청 수도 적다. */
export const ESSAY_POLL_INTERVAL_MS = 2000
/** 폴링 상한. 넘으면 서버가 아직 돌고 있더라도 화면은 안내로 전환한다. */
export const ESSAY_POLL_TIMEOUT_MS = 30000

/** 채점 결과 조회 응답에서 표시 모델이 읽는 부분만 (서비스 타입과 구조적으로 호환) */
export interface EssayGradingSource {
  grading_status?: string | null
  score?: number | null
  grading?: {
    criteria?: EssayGradingCriterion[] | null
    feedback?: string | null
  } | null
}

/** 화면이 아는 상태 집합. 서버가 모르는 값을 주면 '채점 중'으로 본다(결과를 지어내지 않는다). */
const KNOWN_STATUS = new Set(['pending', 'graded', 'failed'])

/**
 * 채점 응답을 표시 모델로 옮긴다.
 *
 * `graded` 인데 criteria 가 비어 있으면(구행·부분 저장) 체크리스트로 보여줄 게 없으므로
 * 'failed' 로 낮춰 "채점을 못 했어요 + 모범답안" 경로를 태운다 — 빈 목록을 채점 결과인 양
 * 내보이는 것보다 정직하다.
 */
export function toEssayGradingView(source: EssayGradingSource): EssayGradingView {
  const rawStatus = (source.grading_status ?? '').trim()
  const status = KNOWN_STATUS.has(rawStatus) ? rawStatus : 'pending'

  if (status !== 'graded') {
    return {
      status: status === 'failed' ? 'failed' : 'pending',
      score: null,
      criteria: [],
      feedback: null,
    }
  }

  const criteria = (source.grading?.criteria ?? []).filter(
    (item): item is EssayGradingCriterion =>
      item != null && typeof item === 'object' && typeof item.key === 'string',
  )
  if (criteria.length === 0) {
    return { status: 'failed', score: null, criteria: [], feedback: null }
  }

  const rawScore = source.score
  return {
    status: 'graded',
    score: typeof rawScore === 'number' && Number.isFinite(rawScore) ? rawScore : null,
    criteria,
    feedback: source.grading?.feedback?.trim() || null,
  }
}

/** 폴링을 계속해야 하는 상태인지 — graded·failed 는 최종값이라 더 물어볼 이유가 없다 */
export function isEssayGradingSettled(status: string | null | undefined): boolean {
  return status === 'graded' || status === 'failed'
}

/**
 * 루브릭 채점 기록이 있는 행인지.
 *
 * grading_status 가 NULL 인 서술형 행은 채점 도입 이전 경로(PATCH .../correct)로 들어온
 * 자가평가 제출이다 — is_correct=true 센티널이 박혀 있어 채점 결과가 아니다.
 * 이런 행에 채점 UI 를 그리면 0점짜리 답안이 "충분해요"로 보인다. 반드시 걸러낸다.
 */
export function hasEssayGradingRecord(status: string | null | undefined): boolean {
  return status === 'pending' || status === 'graded' || status === 'failed'
}
