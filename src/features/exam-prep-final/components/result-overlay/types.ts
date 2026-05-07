/**
 * @file types.ts
 * @description 테스트 종료 오버레이(Phase1~5) 공용 타입
 * @module features/exam-prep-final/components/result-overlay
 * @dependencies gamificationService, examPrepService
 */

export type MasteryState = 'learning' | 'skilled' | 'master'

/** 풀이 시작 시점에 동결한 사전 상태 — Phase1 모션 출발점 / Phase3·4 분기 / Phase5 비교에 사용 */
export interface PreSnapshot {
  /** question_id → state. 풀이 시작 직후 fetchTestMasterySummary 결과. */
  byQuestionMastery: Record<string, MasteryState>
  /** KST yyyy-mm-dd. null = 한 번도 푼 적 없음 */
  lastStudyDateKst: string | null
  totalXp: number
  rankCode: string
  currentStreak: number
  masterySummary: { learning: number; skilled: number; master: number }
}

/** 한 문항의 풀이 전후 변화 */
export interface QuestionDelta {
  seq: number
  questionId: string
  before: MasteryState
  after: MasteryState
  /** 채점 기록이 있으면 정/오답 — 없으면 null (마스터 잠금 등으로 이번 풀이에서 채점 안함) */
  isCorrect: boolean | null
  hintUsed: boolean
}

/** Phase5 + 오버레이 전체에 넘겨주는 종합 결과 데이터 */
export interface FinalResultData {
  pre: PreSnapshot
  /** 풀이 종료 후 백엔드 누적 상태(refresh 결과). 일부 필드는 fallback 으로 pre 값 사용 가능. */
  postTotalXp: number
  postRankCode: string
  postCurrentStreak: number
  postMasterySummary: { learning: number; skilled: number; master: number }
  /** seq → 변화. before === after 라도 포함 (Phase5 OX 그리드용) */
  questionDeltas: QuestionDelta[]
  /** 이번 풀이로 새로 master 도달한 문항 수 × 10 */
  masterXpEarned: number
  /** 풀이 시작 시점 last_study_date !== KST 오늘  ⇒ 오늘 첫 학습 */
  isFirstTestToday: boolean
  /** 오늘 첫 학습이면 streak 기반 10/20/30 — 그 외 0 */
  dailyXpEarned: number
  /** 풀이 직후 카운터 (오늘 N번째). 백엔드 attempt-counts 응답 (course_id 필터). */
  todayTestCount: number
  /** 캘린더 윈도우 (offset -3..+3) 의 날짜별 테스트 풀이 수.
   *  BookshelfStage 의 셀별 책(=풀이 수) 시각화에 사용. offset=0 = today. */
  calendarTestCounts: Record<number, number>
  /** 이번 attempt 풀이 시간(초) */
  totalTimeSec: number
  correctCount: number
  total: number
  testType: 'core' | 'mid' | 'final'
  /** core: lecture_no (예: 14) / mid: segment_index (1~3) / final: null */
  testNumber: number | null
  /** core: "3주차 02차시 · 유전질환" / mid: "세트 N 중간 테스트" / final: "최종 테스트" */
  testTitle: string
  /** core: "1주차 02차시" 또는 빈 문자열 / mid: "세트 N 중간 테스트" / final: "최종 테스트" */
  sessionLabel: string
  lectureTitle: string
}
