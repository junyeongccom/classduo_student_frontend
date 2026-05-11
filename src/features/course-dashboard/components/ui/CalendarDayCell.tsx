/**
 * @file CalendarDayCell.tsx
 * @description 캘린더 1일 셀 — 박스 + 책 PNG 스택 + 날짜 텍스트.
 *   책은 /public/calender/캘린더-책.png 사용. 가로 정렬 X — 좌우 jitter 로 지그재그.
 * @module features/course-dashboard/components/ui
 * @dependencies domain/calendar, public/calender/*.png
 */

'use client'

import { useTranslations } from 'next-intl'
import { resolveDayTone, MAX_BOOKS_PER_CELL, type CalendarDay } from '../../domain/calendar'

interface CalendarDayCellProps {
  cell: CalendarDay
}

/** 책 PNG src + 한 권의 시각 두께(px) — 셀 안 행간격 산출용 */
const BOOK_SRC = '/calender/캘린더-책.png'
const BOOK_ROW_HEIGHT = 6 // 한 줄 차지하는 세로 px (이미지 자체는 더 큼 — 겹쳐 쌓임)

export function CalendarDayCell({ cell }: CalendarDayCellProps) {
  const t = useTranslations()
  // 빈 placeholder
  if (cell.display === 0) {
    return <div className="mx-auto w-full max-w-[52px]" style={{ aspectRatio: '7 / 6' }} aria-hidden />
  }

  const tone = resolveDayTone(cell.state)
  const isToday = cell.state.kind === 'today'
  const books = Math.min(MAX_BOOKS_PER_CELL, cell.state.books ?? 0)

  return (
    <div
      className="relative mx-auto flex w-full max-w-[52px] items-start justify-start overflow-visible rounded-[14px] p-2.5"
      style={{
        backgroundColor: tone.bg,
        color: tone.text,
        aspectRatio: '7 / 6',
        boxShadow: tone.withStroke ? 'inset 0 0 0 2px #FFFFFF' : 'none',
      }}
    >
      {/* 책 스택 — PNG 가 셀 하단에서 위로 쌓임. 좌우 jitter (지그재그) 로 자연스러움. */}
      {tone.bookColor && books > 0 && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-1 z-0 flex flex-col-reverse items-center"
          aria-hidden
        >
          {Array.from({ length: books }).map((_, i) => {
            // 짝수/홀수 행 좌우 번갈아 — 지그재그 패턴.
            const dx = i % 2 === 0 ? -3 : 3
            return (
              <img
                key={i}
                src={BOOK_SRC}
                alt=""
                draggable={false}
                className="block w-[88%] select-none"
                style={{
                  marginTop: i === 0 ? 0 : `-${BOOK_ROW_HEIGHT * 0.4}px`,
                  transform: `translateX(${dx}px)`,
                }}
              />
            )
          })}
        </div>
      )}

      {/* day 텍스트 — 좌상단. 책 위로 (z-20). */}
      <span
        className="relative z-20 text-[13px] font-bold leading-none"
        style={{ fontFamily: 'Pretendard, sans-serif' }}
      >
        {cell.display}
      </span>

      {isToday && (
        <span
          className="absolute right-1 top-0.5 z-10 text-[8px] font-bold"
          style={{ color: tone.bookColor === '#FFFFFF' ? '#FFFFFF' : '#383698' }}
        >
          {t('courseDashboard.todayLabel')}
        </span>
      )}
    </div>
  )
}
