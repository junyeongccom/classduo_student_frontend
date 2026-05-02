/**
 * @file calendar.ts
 * @description 캘린더 그리드 상태/색상 매핑 — streak 기반 출석 표시
 * @module features/course-dashboard/domain
 * @dependencies none
 */

export type DayStateKind = 'completed' | 'today' | 'missed' | 'future' | 'next-month'

export interface DayState {
  kind: DayStateKind
  /** 해당 날짜에 쌓인 책 권수 (completed/today만). UI는 5권까지 표시. */
  books?: number
  /** 해당 시점의 streak 일차 (1, 2~4, 5+) — 박스 컬러 결정 */
  streakDay?: number
}

export interface CalendarDay {
  /** 1~31 (next-month는 1, 2... 회색으로 표시) */
  display: number
  /** 박스 안에서 보여줄 day 텍스트가 다음달이면 true */
  isNextMonth: boolean
  /** ISO yyyy-mm-dd (해당 셀의 실제 날짜) */
  iso: string
  state: DayState
}

export interface MonthGrid {
  /** 1~12 */
  month: number
  year: number
  /** 7열 × N행 (N = 4~6). 첫 주 앞쪽은 이전월/없으면 빈셀, 마지막 주 뒤쪽은 다음월 표시 */
  cells: CalendarDay[]
}

export interface AttendanceRecord {
  /** 'YYYY-MM-DD' */
  date: string
  books: number
  streakDay: number
}

export interface BuildMonthGridInput {
  today: Date
  attendance: AttendanceRecord[]
}

const DAY_MS = 86_400_000

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/**
 * 일요일을 0으로 두는 7열 캘린더 그리드를 만든다.
 * 첫 주 빈 칸은 이전 달 마지막 날짜를 next-month 톤으로 채우지 않고,
 * 디자인 시안과 동일하게 비워 둔다. 단 마지막 주 뒤쪽은 다음 달 1, 2... 회색으로 채운다.
 */
export function buildMonthGrid(input: BuildMonthGridInput): MonthGrid {
  const { today, attendance } = input
  const year = today.getFullYear()
  const month = today.getMonth() // 0-based
  const todayIso = isoOf(today)

  const attendanceMap = new Map<string, AttendanceRecord>()
  for (const rec of attendance) attendanceMap.set(rec.date, rec)

  const firstDay = new Date(year, month, 1)
  const firstWeekday = firstDay.getDay() // 0=Sun
  const lastDay = new Date(year, month + 1, 0)
  const totalDays = lastDay.getDate()

  const cells: CalendarDay[] = []

  // 앞쪽 빈 칸 — 이전월 사용하지 않고 빈 placeholder (display=0)
  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push({
      display: 0,
      isNextMonth: false,
      iso: '',
      state: { kind: 'next-month' },
    })
  }

  // 이번 달 1~last
  for (let d = 1; d <= totalDays; d += 1) {
    const cur = new Date(year, month, d)
    const iso = isoOf(cur)
    const rec = attendanceMap.get(iso)
    let state: DayState
    if (iso === todayIso) {
      state = rec
        ? { kind: 'today', books: rec.books, streakDay: rec.streakDay }
        : { kind: 'today', books: 0, streakDay: 0 }
    } else if (rec) {
      state = { kind: 'completed', books: rec.books, streakDay: rec.streakDay }
    } else if (cur.getTime() < today.getTime() - DAY_MS) {
      state = { kind: 'missed' }
    } else {
      state = { kind: 'future' }
    }
    cells.push({ display: d, isNextMonth: false, iso, state })
  }

  // 마지막 주 뒤쪽 → 다음 달 1, 2...
  const trailing = (7 - (cells.length % 7)) % 7
  let nextDay = 1
  for (let i = 0; i < trailing; i += 1) {
    const next = new Date(year, month + 1, nextDay)
    cells.push({
      display: nextDay,
      isNextMonth: true,
      iso: isoOf(next),
      state: { kind: 'next-month' },
    })
    nextDay += 1
  }

  return { month: month + 1, year, cells }
}

export interface DayCellTone {
  bg: string
  text: string
  /** Today 표시용 흰색 stroke 필요 여부 */
  withStroke: boolean
  /** 책 그래픽 색 (rounded bar). null이면 책 미표시 */
  bookColor: string | null
}

export function resolveDayTone(state: DayState): DayCellTone {
  if (state.kind === 'next-month') {
    return { bg: '#F0F0F0', text: '#BFBFBF', withStroke: false, bookColor: null }
  }
  if (state.kind === 'missed') {
    return { bg: '#F0F0F0', text: '#676767', withStroke: false, bookColor: null }
  }
  if (state.kind === 'future') {
    return { bg: '#F0F0F0', text: '#676767', withStroke: false, bookColor: null }
  }
  // completed | today — streakDay 기반 색
  const day = state.streakDay ?? 0
  if (day >= 5) {
    return {
      bg: '#383698',
      text: '#FFFFFF',
      withStroke: state.kind === 'today',
      bookColor: '#FFFFFF',
    }
  }
  if (day >= 2) {
    return {
      bg: '#8F8DF0',
      text: '#4A49A1',
      withStroke: state.kind === 'today',
      bookColor: '#FFFFFF',
    }
  }
  if (day === 1) {
    return {
      bg: '#DEDEF8',
      text: '#4A49A1',
      withStroke: state.kind === 'today',
      bookColor: '#FFFFFF',
    }
  }
  // today인데 미참여 (streakDay=0)
  return {
    bg: '#F0F0F0',
    text: '#383698',
    withStroke: state.kind === 'today',
    bookColor: null,
  }
}

/** 한 셀에 표시할 책 권수 cap */
export const MAX_BOOKS_PER_CELL = 5
