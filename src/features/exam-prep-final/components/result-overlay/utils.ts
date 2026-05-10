/**
 * @file utils.ts
 * @description 테스트 종료 오버레이 공용 헬퍼 — KST 날짜, 등급 임계, 책장 tier
 * @module features/exam-prep-final/components/result-overlay
 * @dependencies StudentCourseStateDto
 */

/** KST 기준 오늘 ISO (yyyy-mm-dd) — RewardWidget 과 동일 정의 */
export function getKstTodayIso(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

/**
 * 백엔드 RANK_BRACKETS 미러 (rank_schema.py).
 * 핵심테스트 15→10 문항 변경에 따른 재조정 (×2/3).
 *   max master XP = 30 tests × 10 Q × 10 XP = 3000 → 새 A 목표.
 */
export const RANK_THRESHOLDS: ReadonlyArray<{ from: string; to: string; total: number }> = [
  { from: 'F',  to: 'D',  total: 100 },
  { from: 'D',  to: 'D+', total: 300 },
  { from: 'D+', to: 'C',  total: 650 },
  { from: 'C',  to: 'C+', total: 1100 },
  { from: 'C+', to: 'B',  total: 1700 },
  { from: 'B',  to: 'B+', total: 2300 },
  { from: 'B+', to: 'A',  total: 3000 },
  { from: 'A',  to: 'A+', total: 3750 },
]

export function getRankProgress(rankCode: string, totalXp: number) {
  const step = RANK_THRESHOLDS.find((t) => t.from === rankCode)
  if (!step) return { isMax: true, ratio: 1, prevTotal: totalXp, nextTotal: totalXp }
  const prevTotal = RANK_THRESHOLDS.find((t) => t.to === rankCode)?.total ?? 0
  const span = step.total - prevTotal
  const earned = Math.max(0, totalXp - prevTotal)
  const ratio = span > 0 ? Math.min(1, earned / span) : 0
  return { isMax: false, ratio, prevTotal, nextTotal: step.total }
}

/**
 * 누적 totalXp 만으로 등급 코드(F~A+) 산출 — 백엔드 rank.code 가 stale/null 인 경우 fallback.
 * A/A+ 의 master_xp/stamp_xp 추가 조건은 frontend 에서 검증 어려우므로 totalXp 임계만 사용.
 */
export function deriveRankFromXp(totalXp: number): string {
  if (totalXp < RANK_THRESHOLDS[0].total) return RANK_THRESHOLDS[0].from // 'F'
  // 가장 큰 임계부터 내려가며 totalXp 가 통과한 가장 높은 to-rank 반환
  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i -= 1) {
    if (totalXp >= RANK_THRESHOLDS[i].total) return RANK_THRESHOLDS[i].to
  }
  return 'F'
}

/** 출석 streak 별 책장 / 색상 / 일일 참여 XP 단계 */
export interface StreakTier {
  bookshelf: string
  /** 책장 + 카운터 강조 색 */
  color: string
  /** 일일 참여 XP (DAY 1=10, 2~4=20, 5~=30) */
  dailyXp: number
  /** 카드 표시 라벨 (Phase 3 스트릭 카드용) */
  label: string
}

export function resolveStreakTier(streak: number): StreakTier {
  // 백엔드 STAMP_XP_DAY_* 와 동일 (rank_schema.py): 1=20, 2~4=30, 5+=40
  if (streak <= 0) {
    return { bookshelf: '/upba/0일차 책장.png', color: '#C7BEF8', dailyXp: 20, label: 'DAY 1' }
  }
  if (streak === 1) {
    return { bookshelf: '/upba/1일차 책장.png', color: '#C7BEF8', dailyXp: 20, label: 'DAY 1' }
  }
  if (streak <= 4) {
    return { bookshelf: '/upba/2~4일차 책장.png', color: '#B2A4F0', dailyXp: 30, label: 'DAY 2~4' }
  }
  return { bookshelf: '/upba/5일차 책장.png', color: '#2D2461', dailyXp: 40, label: 'DAY 5~' }
}

/**
 * 일자별 테스트 풀이 수는 백엔드 `/exam-prep/courses/{course_id}/attempt-counts`
 * 가 단일 source of truth (course_id 필터 보장).
 * 과거 localStorage 키(`aplus-test-counts-by-date`, `aplus-today-test-count-*`)는
 * course_id 차원이 없어 과목 간 카운트 누설 버그의 원인이었으므로 제거됨.
 * 첫 진입 시 남아있는 stale 키를 정리한다.
 */
const LEGACY_COUNTS_KEY = 'aplus-test-counts-by-date'
const LEGACY_PER_DAY_PREFIX = 'aplus-today-test-count-'

export function purgeLegacyTestCountStorage(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(LEGACY_COUNTS_KEY)
    const toRemove: string[] = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i)
      if (k && k.startsWith(LEGACY_PER_DAY_PREFIX)) toRemove.push(k)
    }
    toRemove.forEach((k) => window.localStorage.removeItem(k))
  } catch {
    // localStorage 차단 환경 — 무시
  }
}

/** "걸린 시간"을 mm:ss 로 포맷 */
export function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Yellow / Purple 이벤트 큐를 무작위로 섞되, 같은 question 의 yellow→purple 순서는 유지 */
export interface XpEvent {
  qSeq: number
  type: 'yellow' | 'purple' | 'skill-down'
  /** 'skill-down' 의 도착 색상 — 'learning' or 'skilled' */
  fallTo?: 'learning' | 'skilled'
}

export function shuffleEventsPreservingPerQuestionOrder(
  groups: Map<number, XpEvent[]>,
  rng: () => number = Math.random,
): XpEvent[] {
  const remaining = new Map<number, XpEvent[]>()
  groups.forEach((evts, qSeq) => {
    if (evts.length > 0) remaining.set(qSeq, [...evts])
  })
  const out: XpEvent[] = []
  while (remaining.size > 0) {
    const keys = Array.from(remaining.keys())
    const pickKey = keys[Math.floor(rng() * keys.length)]
    const list = remaining.get(pickKey)!
    out.push(list.shift()!)
    if (list.length === 0) remaining.delete(pickKey)
  }
  return out
}
