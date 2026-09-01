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
  /** 서빙 문항 수 (주차 리스트 진행 표기용) */
  questionCount: number
  /** 학생의 Master 문항 수 */
  masteredQuestionCount: number
  status: CoreTestStatus
  /** 우측 미터링 도트 카운트 (gray=틀림 / cyan=시도 / green=정답 같은 의미) */
  metaCounts: { gray: number; cyan: number; green: number }
  /** 학생-test 단위 master 도달 여부 (모든 문항 master 후 잠금) — 우상단 배지 표시용 */
  isTestMastered: boolean
  /** 주제명 (목록 모달 프리페치용) — 목록 API가 주면 채워짐. 없으면 모달이 상세 폴백. */
  topicTitle?: string
  /** 영문 주제명 (한영 토글) */
  topicTitleEng?: string
  /** 학생의 이 테스트 최근 응시 시각 (ISO) — 추천 학습 판정용. 미응시면 null */
  lastAttemptedAt: string | null
}

export interface ExamPrepData {
  /** ISO date — 기말고사 일자 */
  examDate: string
  /** 오늘부터 examDate까지 일수 */
  ddays: number
  totalCoreTests: number
  masteredCount: number
  /** 추천 학습 — 최근 응시 미마스터 테스트, 없으면 가장 오래된 회차의 미마스터 테스트 */
  recommendedTest: CoreTest | null
  coreTests: CoreTest[]
}

export type TestSetTab = 1 | 2 | 3 | 'final'
