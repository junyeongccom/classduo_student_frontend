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
    <section className="rounded-2xl bg-[#DBDAFB] p-2 dark:bg-violet-950/30">
      {/* 핀 — 8개 가로 정렬 */}
      <div
        className="flex justify-around px-2 pb-2 pt-0.5"
        aria-hidden
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <span
            key={i}
            className="block h-5 w-2.5 rounded-full bg-[#6361E0]"
          />
        ))}
      </div>

      {/* 안쪽 — 흰 캘린더 + 보더 */}
      <div className="rounded-xl border-[2px] border-[#DBDAFB] bg-white p-4 dark:bg-gray-900">
        {/* 상단 — 월/streak/D-day */}
        <header className="mb-3 flex items-start justify-between">
          <h2
            className="text-3xl font-semibold leading-none"
            style={{ color: '#383698', fontFamily: 'Pretendard, sans-serif' }}
          >
            {monthDisplay}
          </h2>
          <div className="flex items-center gap-2">
            {currentStreak > 0 && (
              <span
                className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                style={{ backgroundColor: ddayTone.bg, color: ddayTone.text }}
              >
                {t('courseDashboard.streakInProgress', { days: currentStreak })}
              </span>
            )}
            <span
              className="rounded-full px-3 py-1 text-sm font-semibold"
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
