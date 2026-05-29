/**
 * @file AttendanceCalendarCard.tsx
 * @description 5월 캘린더 + D-day 배지 + N일 연속 라벨
 * @module features/course-dashboard/components/ui
 * @dependencies CalendarDayCell, domain/dday
 */

'use client'

import { useLocale, useTranslations } from 'next-intl'
import { resolveDdayTone } from '../../domain/dday'
import { CalendarDayCell } from './CalendarDayCell'
import type { MonthGrid } from '../../domain/calendar'

interface AttendanceCalendarCardProps {
  monthGrid: MonthGrid
  examDday: number | null
  currentStreak: number
}

export function AttendanceCalendarCard({
  monthGrid,
  examDday,
  currentStreak,
}: AttendanceCalendarCardProps) {
  const t = useTranslations()
  const locale = useLocale()
  const ddayTone = resolveDdayTone(examDday)
  const ddayLabel =
    examDday == null ? 'D-?' : examDday === 0 ? 'D-day' : `D-${examDday}`

  // 월 표시 — 영어는 월 이름 ("May"), 한국어는 "{N}월" 키
  const monthDisplay =
    locale === 'ko'
      ? t('courseDashboard.monthLabel', { month: monthGrid.month })
      : new Date(2024, monthGrid.month - 1, 1).toLocaleString('en-US', {
          month: 'long',
        })

  // 7열 × N행
  const rows: typeof monthGrid.cells[] = []
  for (let i = 0; i < monthGrid.cells.length; i += 7) {
    rows.push(monthGrid.cells.slice(i, i + 7))
  }

  return (
    // 바깥 — 연보라 클립보드 프레임 (Figma: bg #DBDAFB)
    <section className="mx-auto w-[calc(320.46px*var(--u))] rounded-[calc(8px*var(--u))] bg-[#DBDAFB] p-[calc(6px*var(--u))] md:w-full md:rounded-2xl md:p-2 dark:bg-violet-950/30">
      {/* 핀 — 8개 가로 정렬 */}
      <div
        className="flex justify-around px-2 pb-[calc(6px*var(--u))] pt-0.5 md:pb-2"
        aria-hidden
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <span
            key={i}
            className="block h-[calc(17.64px*var(--u))] w-[calc(3.92px*var(--u))] rounded-full bg-[#6361E0] md:h-5 md:w-2.5"
          />
        ))}
      </div>

      {/* 안쪽 — 흰 캘린더 + 보더 */}
      <div className="rounded-[calc(6.46px*var(--u))] border-[2px] border-[#DBDAFB] bg-white p-[calc(12px*var(--u))] md:rounded-xl md:p-4 dark:bg-gray-900">
        {/* 상단 — 월/streak/D-day */}
        <header className="mb-3 flex items-start justify-between">
          <h2
            className="text-[calc(21.52px*var(--u))] font-semibold leading-none md:text-3xl"
            style={{ color: '#383698', fontFamily: 'Pretendard, sans-serif' }}
          >
            {monthDisplay}
          </h2>
          <div className="flex items-center gap-[calc(6px*var(--u))] md:gap-2">
            {currentStreak > 0 && (
              <span
                className="rounded-full px-[calc(8px*var(--u))] py-[calc(3px*var(--u))] text-[calc(7.84px*var(--u))] font-semibold md:px-2.5 md:py-1 md:text-[11px]"
                style={{ backgroundColor: ddayTone.bg, color: ddayTone.text }}
              >
                {t('courseDashboard.streakInProgress', { days: currentStreak })}
              </span>
            )}
            <span
              className="rounded-full px-[calc(10px*var(--u))] py-[calc(3px*var(--u))] text-[calc(11.48px*var(--u))] font-semibold md:px-3 md:py-1 md:text-sm"
              style={{ backgroundColor: '#DBDAFB', color: '#000', fontFamily: 'Pretendard, sans-serif' }}
            >
              {ddayLabel}
            </span>
          </div>
        </header>

        {/* 캘린더 그리드 — 요일 정렬 없이 1일부터 차례로 (Figma 시안) */}
        <div className="flex flex-col gap-1.5">
          {rows.map((row, ri) => (
            <div key={ri} className="grid grid-cols-7 gap-1.5">
              {row.map((cell, ci) => (
                <CalendarDayCell key={`${ri}-${ci}`} cell={cell} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
