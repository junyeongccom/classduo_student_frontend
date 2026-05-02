/**
 * @file CalendarDayCell.tsx
 * @description 캘린더 1일 셀 — 박스 + (책 스택) + day 텍스트
 * @module features/course-dashboard/components/ui
 * @dependencies domain/calendar
 */

'use client'

import { resolveDayTone, MAX_BOOKS_PER_CELL, type CalendarDay } from '../../domain/calendar'

interface CalendarDayCellProps {
  cell: CalendarDay
}

export function CalendarDayCell({ cell }: CalendarDayCellProps) {
  // 빈 placeholder (이번 달 시작 전 빈 칸)
  if (cell.display === 0) {
    return <div className="h-[60px] w-full" aria-hidden />
  }

  const tone = resolveDayTone(cell.state)
  const isToday = cell.state.kind === 'today'
  const books = Math.min(MAX_BOOKS_PER_CELL, cell.state.books ?? 0)

  return (
    <div
      className="relative flex h-[60px] w-full items-center justify-center rounded-[20px]"
      style={{
        backgroundColor: tone.bg,
        color: tone.text,
        boxShadow: tone.withStroke ? 'inset 0 0 0 2px #FFFFFF' : 'none',
      }}
    >
      {/* 책 스택 — 박스 하단부터 위로 누적 */}
      {tone.bookColor && books > 0 && (
        <div
          className="pointer-events-none absolute inset-x-2 bottom-2 flex flex-col-reverse gap-1"
          aria-hidden
        >
          {Array.from({ length: books }).map((_, i) => (
            <span
              key={i}
              className="block h-[6px] rounded-full"
              style={{ backgroundColor: tone.bookColor ?? undefined }}
            />
          ))}
        </div>
      )}

      {/* day 텍스트 — Today면 위로 살짝 올림 */}
      <span
        className={`relative z-10 text-sm font-semibold ${isToday ? 'mt-[-22px]' : ''}`}
      >
        {cell.display}
      </span>

      {isToday && (
        <span
          className="absolute -top-4 right-0 text-[10px] font-bold"
          style={{ color: '#383698' }}
        >
          Today
        </span>
      )}
    </div>
  )
}
