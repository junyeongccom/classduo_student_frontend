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
 * localStorage — 날짜별 테스트 풀이 수 단일 맵.
 *  키: 'aplus-test-counts-by-date'
 *  값: JSON `{ "yyyy-mm-dd": number }`
 * 책장 시각화에서 캘린더 7개 셀 전부의 책(=풀이 수)을 표시하기 위해 단일 맵으로 통합.
 * 14일 이전 날짜 키는 자동 정리.
 */
const COUNTS_KEY = 'aplus-test-counts-by-date'

interface TestCountMap {
  [iso: string]: number
}

/** 구 키 prefix — 단일 맵으로 통합되기 전 이전 버전이 사용. 첫 read 시 마이그레이션. */
const LEGACY_PREFIX = 'aplus-today-test-count-'

function readTestCountMap(): TestCountMap {
  if (typeof window === 'undefined') return {}
  const m: TestCountMap = {}
  try {
    const raw = window.localStorage.getItem(COUNTS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        Object.entries(parsed as Record<string, unknown>).forEach(([k, v]) => {
          const n = typeof v === 'number' ? v : Number.parseInt(String(v), 10)
          if (Number.isFinite(n) && n > 0) m[k] = n
        })
      }
    }
  } catch {
    // JSON 파싱 실패 시 새 맵 시작
  }

  // ── legacy 키 마이그레이션 ─────────────────────────────────────────
  // `aplus-today-test-count-{yyyy-mm-dd}` 형태의 구 키를 단일 맵으로 합치고 정리.
  // 같은 날짜 키가 양쪽 다 있으면 큰 값을 채택 (프로덕션에선 한 쪽만 있을 가능성 높음).
  let migrated = false
  const legacyKeys: string[] = []
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i)
    if (k && k.startsWith(LEGACY_PREFIX)) legacyKeys.push(k)
  }
  legacyKeys.forEach((k) => {
    const date = k.slice(LEGACY_PREFIX.length)
    const v = Number.parseInt(window.localStorage.getItem(k) ?? '0', 10)
    if (Number.isFinite(v) && v > 0) {
      m[date] = Math.max(m[date] ?? 0, v)
      migrated = true
    }
    window.localStorage.removeItem(k)
  })
  if (migrated) {
    try {
      window.localStorage.setItem(COUNTS_KEY, JSON.stringify(m))
    } catch {
      // quota 초과 등 — 무시
    }
  }
  return m
}

function writeTestCountMap(m: TestCountMap): void {
  if (typeof window === 'undefined') return
  // 14일 이전 키는 정리
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 14)
  cutoff.setHours(0, 0, 0, 0)
  const cutoffKst = new Date(cutoff.getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
  const cleaned: TestCountMap = {}
  Object.entries(m).forEach(([date, count]) => {
    if (date >= cutoffKst) cleaned[date] = count
  })
  window.localStorage.setItem(COUNTS_KEY, JSON.stringify(cleaned))
}

export function getTodayTestCount(): number {
  return readTestCountMap()[getKstTodayIso()] ?? 0
}

export function incrementTodayTestCount(): number {
  if (typeof window === 'undefined') return 1
  const today = getKstTodayIso()
  const map = readTestCountMap()
  const next = (map[today] ?? 0) + 1
  map[today] = next
  writeTestCountMap(map)
  return next
}

/**
 * 캘린더 윈도우 (today 기준 offset -3..+3) 의 날짜별 테스트 풀이 수.
 * BookshelfStage 가 셀별 책 개수를 그리는 데 사용.
 */
export function getCalendarTestCounts(): Record<number, number> {
  const map = readTestCountMap()
  const today = new Date()
  const out: Record<number, number> = {}
  for (let off = -3; off <= 3; off++) {
    const d = new Date(today)
    d.setDate(today.getDate() + off)
    const iso = new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
    out[off] = map[iso] ?? 0
  }
  return out
}

/**
 * 한 달 전체 (year, monthZeroBased) 의 날짜별 테스트 풀이 수.
 * dashboard 캘린더가 월 단위로 책을 표시할 때 사용.
 */
export function getMonthTestCounts(
  year: number,
  monthZeroBased: number,
): Map<string, number> {
  const map = readTestCountMap()
  const result = new Map<string, number>()
  const lastDay = new Date(year, monthZeroBased + 1, 0).getDate()
  for (let d = 1; d <= lastDay; d += 1) {
    const date = new Date(year, monthZeroBased, d)
    const iso = new Date(date.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const count = map[iso] ?? 0
    if (count > 0) result.set(iso, count)
  }
  return result
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
