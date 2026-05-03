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

/** 셀 안에서 책 한 권의 두께 / 사이 갭 — Phase 2 BookshelfStage 와 동일 (이슈 3-2) */
const BOOK_BAR_HEIGHT = 3
const BOOK_BAR_GAP = 1

export function CalendarDayCell({ cell }: CalendarDayCellProps) {
  // 빈 placeholder (이번 달 시작 전 빈 칸) — 셀 비율 7:6 (이슈 3-3)
  if (cell.display === 0) {
    return <div className="mx-auto w-full max-w-[52px]" style={{ aspectRatio: '7 / 6' }} aria-hidden />
  }

  const tone = resolveDayTone(cell.state)
  const isToday = cell.state.kind === 'today'
  // 책 무제한 (이슈 3-2 — Phase 2 와 동일하게 셀 위로 넘침)
  // 셀당 책 표시는 MAX_BOOKS_PER_CELL (=5) 까지만 — 그 이상은 스택 cap 으로 노출 X
  const books = Math.min(MAX_BOOKS_PER_CELL, cell.state.books ?? 0)

  return (
    <div
      className="relative mx-auto flex w-full max-w-[52px] items-start justify-start overflow-visible rounded-[14px] p-1.5"
      style={{
        backgroundColor: tone.bg,
        color: tone.text,
        aspectRatio: '7 / 6',
        boxShadow: tone.withStroke ? 'inset 0 0 0 2px #FFFFFF' : 'none',
      }}
    >
      {/* 책 스택 — Phase 2 BookshelfStage 와 동일 패턴 (이슈 3-2): 셀 하단에서 위로 평행 막대.
          무제한일 때 셀 위로 자연스럽게 넘침 (overflow-visible). */}
      {tone.bookColor && books > 0 && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-1.5 flex flex-col-reverse items-center gap-[1px]"
          aria-hidden
        >
          {Array.from({ length: books }).map((_, i) => (
            <span
              key={i}
              className="block w-[78%] rounded-[1px]"
              style={{
                height: `${BOOK_BAR_HEIGHT}px`,
                backgroundColor: tone.bookColor ?? undefined,
                marginTop: i === 0 ? 0 : `${BOOK_BAR_GAP}px`,
              }}
            />
          ))}
        </div>
      )}

      {/* day 텍스트 — 좌상단 (이슈 3-1) */}
      <span
        className="relative z-10 text-[13px] font-extrabold leading-none"
        style={{ fontFamily: 'Pretendard, sans-serif' }}
      >
        {cell.display}
      </span>

      {isToday && (
        <span
          className="absolute right-1 top-0.5 z-10 text-[8px] font-bold"
          style={{ color: tone.bookColor === '#FFFFFF' ? '#FFFFFF' : '#383698' }}
        >
          Today
        </span>
      )}
    </div>
  )
}
