/**
 * @file CalendarDayCell.tsx
 * @description 캘린더 1일 셀 — 박스 + 사선으로 기울어진 책 스택 + day 텍스트
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
    return <div className="mx-auto aspect-square w-full max-w-[42px]" aria-hidden />
  }

  const tone = resolveDayTone(cell.state)
  const isToday = cell.state.kind === 'today'
  const books = Math.min(MAX_BOOKS_PER_CELL, cell.state.books ?? 0)

  return (
    <div
      className="relative mx-auto flex aspect-square w-full max-w-[42px] items-center justify-center overflow-hidden rounded-[12px]"
      style={{
        backgroundColor: tone.bg,
        color: tone.text,
        boxShadow: tone.withStroke ? 'inset 0 0 0 2px #FFFFFF' : 'none',
      }}
    >
      {/* 책 스택 — 45° 회전된 노트/책장 느낌 (디자인 시안 ///) */}
      {tone.bookColor && books > 0 && (
        <div
          className="pointer-events-none absolute inset-1.5 flex flex-col-reverse items-stretch justify-center gap-[2px]"
          style={{ transform: 'rotate(-45deg)' }}
          aria-hidden
        >
          {Array.from({ length: books }).map((_, i) => (
            <span
              key={i}
              className="block h-[2px] rounded-full"
              style={{ backgroundColor: tone.bookColor ?? undefined }}
            />
          ))}
        </div>
      )}

      {/* day 텍스트 — Pretendard Bold */}
      <span
        className={`relative z-10 text-xs font-bold ${isToday ? 'mt-[-10px]' : ''}`}
        style={{ fontFamily: 'Pretendard, sans-serif' }}
      >
        {cell.display}
      </span>

      {isToday && (
        <span
          className="absolute -top-2.5 right-0 z-10 text-[9px] font-bold"
          style={{ color: '#383698' }}
        >
          Today
        </span>
      )}
    </div>
  )
}
