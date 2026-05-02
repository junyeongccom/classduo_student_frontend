/**
 * @file AttendanceCalendarCard.tsx
 * @description 5월 캘린더 + D-day 배지 + N일 연속 라벨
 * @module features/course-dashboard/components/ui
 * @dependencies CalendarDayCell, domain/dday
 */

'use client'

import { resolveDdayTone } from '../../domain/dday'
import { CalendarDayCell } from './CalendarDayCell'
import type { MonthGrid } from '../../domain/calendar'

interface AttendanceCalendarCardProps {
  monthGrid: MonthGrid
  examDday: number | null
  currentStreak: number
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export function AttendanceCalendarCard({
  monthGrid,
  examDday,
  currentStreak,
}: AttendanceCalendarCardProps) {
  const ddayTone = resolveDdayTone(examDday)
  const ddayLabel =
    examDday == null ? 'D-?' : examDday === 0 ? 'D-day' : `D-${examDday}`

  // 7열 × N행
  const rows: typeof monthGrid.cells[] = []
  for (let i = 0; i < monthGrid.cells.length; i += 7) {
    rows.push(monthGrid.cells.slice(i, i + 7))
  }

  return (
    <section className="relative rounded-3xl border-2 border-[#383698]/20 bg-white p-6 shadow-[0_4px_20px_rgba(56,54,152,0.06)] dark:bg-gray-900">
      {/* 상단 — 월/streak/D-day */}
      <header className="mb-5 flex items-start justify-between">
        <h2
          className="text-3xl font-extrabold"
          style={{ color: '#383698' }}
        >
          {monthGrid.month}월
        </h2>
        <div className="flex items-center gap-2">
          {currentStreak > 0 && (
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold"
              style={{ backgroundColor: ddayTone.bg, color: ddayTone.text }}
            >
              {currentStreak}일 연속 학습 중
            </span>
          )}
          <span
            className="rounded-full px-3 py-1 text-sm font-bold"
            style={{ backgroundColor: ddayTone.bg, color: ddayTone.text }}
          >
            {ddayLabel}
          </span>
        </div>
      </header>

      {/* 요일 헤더 (선택) — 디자인엔 없지만 접근성 개선 */}
      <div className="mb-2 grid grid-cols-7 gap-2 px-1">
        {WEEKDAYS.map((d) => (
          <span
            key={d}
            className="text-center text-[11px] font-medium text-gray-400"
          >
            {d}
          </span>
        ))}
      </div>

      {/* 캘린더 그리드 */}
      <div className="flex flex-col gap-2">
        {rows.map((row, ri) => (
          <div key={ri} className="grid grid-cols-7 gap-2">
            {row.map((cell, ci) => (
              <CalendarDayCell key={`${ri}-${ci}`} cell={cell} />
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
