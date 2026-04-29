/**
 * @file types.ts
 * @description 기말 대비 학습 도메인 타입
 * @module features/exam-prep-final
 */

export type CoreTestStatus = 'locked' | 'available' | 'mastered'

export interface CoreTest {
  /** 안정 ID */
  id: string
  /** 1~26 */
  number: number
  /** 1 | 2 | 3 (Final 제외) */
  setNumber: 1 | 2 | 3
  weekNo: number
  sessionNo: number
  lectureTitle: string
  /** 0~1 — 마스터 도달율 */
  masteryLevel: number
  status: CoreTestStatus
  /** 우측 미터링 도트 카운트 (gray=틀림 / cyan=시도 / green=정답 같은 의미) */
  metaCounts: { gray: number; cyan: number; green: number }
}

export interface MidTest {
  setNumber: 1 | 2 | 3
  minutes: number
  questions: number
  /** 해당 세트의 핵심 테스트 개수 (불꽃 슬롯 수) */
  totalCoreInSet: number
  /** 마스터된 핵심 테스트 수 (앞에서부터 보라 불꽃) */
  masteredCount: number
  unlocked: boolean
}

export interface FinalTest {
  minutes: number
  questions: number
  unlocked: boolean
  /** 1, 2, 3세트별 중간 테스트 마스터 여부 */
  setMasterStates: [boolean, boolean, boolean]
}

export interface ExamPrepData {
  /** ISO date — 기말고사 일자 */
  examDate: string
  /** 오늘부터 examDate까지 일수 */
  ddays: number
  totalCoreTests: number
  masteredCount: number
  /** 추천 학습 (가장 최근에 시도한 활성 테스트) — null이면 첫 테스트로 fallback */
  recommendedTest: CoreTest | null
  coreTests: CoreTest[]
  midTests: MidTest[]
  finalTest: FinalTest
}

export type TestSetTab = 1 | 2 | 3 | 'final'
