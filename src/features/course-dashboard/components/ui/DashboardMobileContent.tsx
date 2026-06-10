/**
 * @file DashboardMobileContent.tsx
 * @description 과목 대시보드 모바일(<768px) 뷰 — ScaledCanvas 대신 네이티브 세로 스크롤 스택.
 *   Figma(785:3844) 구성 참고: 핵심 주제 학습(히어로) → 회차별 학습 → 대화형 학습
 *   → 문제 만들기·내 퀴즈 저장소(2열) → 캘린더. 데스크톱 DashboardScaledContent 와 동일 i18n/톤 재사용.
 * @module features/course-dashboard/components/ui
 * @dependencies ExamPrepHeroCard, domain/calendar(resolveDayTone), domain/dday(resolveDdayTone), lucide-react
 */

'use client'

import { Bookmark, ChevronRight, PencilLine } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import type { LucideIcon } from 'lucide-react'

import { ExamPrepHeroCard } from './ExamPrepHeroCard'
import { resolveDayTone, type MonthGrid } from '../../domain/calendar'
import { resolveDdayTone } from '../../domain/dday'

interface DashboardMobileContentProps {
  monthGrid: MonthGrid
  examDday: number | null
  currentStreak: number
  onHero: () => void
  onWeekly: () => void
  onDialogue: () => void
  onCreate: () => void
  onMyQuiz: () => void
}

export function DashboardMobileContent({
  monthGrid,
  examDday,
  currentStreak,
  onHero,
  onWeekly,
  onDialogue,
  onCreate,
  onMyQuiz,
}: DashboardMobileContentProps) {
  const t = useTranslations()

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 py-5">
        {/* 1) 핵심 주제 학습 — 히어로 (반응형 카드 그대로 재사용) */}
        <ExamPrepHeroCard
          title={t('courseDashboard.modeExam.title')}
          subtitle={t('courseDashboard.modeExam.heroSubtitle')}
          onClick={onHero}
        />

        {/* 2) 회차별 학습 */}
        <MobileStudyCard
          eyebrow={t('courseDashboard.modeWeekly.eyebrow')}
          title={t('courseDashboard.modeWeekly.title')}
          desc={t('courseDashboard.weeklyShortDescription')}
          onClick={onWeekly}
        />

        {/* 3) 대화형 학습 */}
        <MobileStudyCard
          eyebrow={t('courseDashboard.modeDialogue.eyebrow')}
          title={t('courseDashboard.modeDialogue.title')}
          desc={t('courseDashboard.dialogueShortDescription')}
          onClick={onDialogue}
        />

        {/* 4) 문제 만들기 / 내 퀴즈 저장소 (2열, 흰 박스 없음) */}
        <div className="grid grid-cols-2 gap-3 px-1 py-1">
          <MobileQuickAction
            icon={PencilLine}
            label={t('courseNav.createQuestion')}
            onClick={onCreate}
          />
          <MobileQuickAction
            icon={Bookmark}
            label={t('courseDashboard.myQuizSaved')}
            onClick={onMyQuiz}
          />
        </div>

        {/* 5) 캘린더 */}
        <MobileCalendarCard
          monthGrid={monthGrid}
          examDday={examDday}
          currentStreak={currentStreak}
        />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   회차별 / 대화형 학습 카드 — 모바일 컴팩트 (StudyCard 모바일판)
   ───────────────────────────────────────────────────────────── */
function MobileStudyCard({
  eyebrow,
  title,
  desc,
  onClick,
}: {
  eyebrow: string
  title: string
  desc: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-2xl bg-white px-5 py-4 text-left shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-shadow active:shadow-[0_8px_28px_rgba(15,23,42,0.1)]"
      style={{ fontFamily: 'Pretendard, sans-serif' }}
    >
      <span className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-xs font-bold text-[#ababab]">{eyebrow}</span>
        <span className="truncate text-xl font-bold leading-tight text-black">{title}</span>
        <span className="truncate text-sm font-medium text-black">{desc}</span>
      </span>
      <ChevronRight className="ml-3 h-7 w-7 shrink-0 text-[#383698]" strokeWidth={2.5} />
    </button>
  )
}

/* ─────────────────────────────────────────────────────────────
   문제 만들기 / 내 퀴즈 저장소 — 모바일 컴팩트 (QuickAction 모바일판)
   ───────────────────────────────────────────────────────────── */
function MobileQuickAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 text-left"
      style={{ fontFamily: 'Pretendard, sans-serif' }}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#DEDEF8]">
        <Icon className="h-6 w-6 text-[#6361E0]" strokeWidth={2.2} />
      </span>
      <span className="min-w-0 truncate text-sm font-bold text-black">{label}</span>
    </button>
  )
}

/* ─────────────────────────────────────────────────────────────
   캘린더 — 모바일 컴팩트. 9핀 + 라벤더 프레임 + 흰 종이 + 7열 정사각 셀.
   resolveDayTone / resolveDdayTone 데스크톱과 동일 재사용.
   ───────────────────────────────────────────────────────────── */
function MobileCalendarCard({
  monthGrid,
  examDday,
  currentStreak,
}: {
  monthGrid: MonthGrid
  examDday: number | null
  currentStreak: number
}) {
  const t = useTranslations()
  const locale = useLocale()
  const ddayTone = resolveDdayTone(examDday)
  const ddayLabel = examDday == null ? 'D-?' : examDday === 0 ? 'D-day' : `D-${examDday}`
  const monthDisplay =
    locale === 'ko'
      ? t('courseDashboard.monthLabel', { month: monthGrid.month })
      : new Date(2024, monthGrid.month - 1, 1).toLocaleString('en-US', { month: 'long' })

  return (
    <div className="relative w-full pt-3">
      {/* 9 핀 — 프레임 위로 솟음 */}
      <div className="absolute left-0 right-0 z-10 flex justify-evenly px-6" style={{ top: 0 }} aria-hidden>
        {Array.from({ length: 9 }).map((_, i) => (
          <span key={i} className="block rounded-full bg-[#6361E0]" style={{ width: 6, height: 22 }} />
        ))}
      </div>
      {/* 라벤더 프레임 */}
      <div className="rounded-2xl bg-[#DBDAFB] p-2" style={{ marginTop: 10 }}>
        {/* 흰 종이 */}
        <div className="rounded-xl bg-white p-4">
          {/* 헤더 */}
          <div className="flex items-center justify-between">
            <span
              className="font-bold leading-none"
              style={{ fontSize: 22, color: '#383698', fontFamily: 'Pretendard, sans-serif' }}
            >
              {monthDisplay}
            </span>
            <div className="flex items-center gap-2">
              {currentStreak > 0 && (
                <span
                  className="whitespace-nowrap rounded-full font-semibold"
                  style={{ fontSize: 11, padding: '4px 10px', backgroundColor: ddayTone.bg, color: ddayTone.text }}
                >
                  {t('courseDashboard.streakInProgress', { days: currentStreak })}
                </span>
              )}
              <span
                className="rounded-full font-bold"
                style={{ fontSize: 13, padding: '5px 12px', backgroundColor: '#DBDAFB', color: '#000', fontFamily: 'Pretendard, sans-serif' }}
              >
                {ddayLabel}
              </span>
            </div>
          </div>
          {/* 날짜 그리드 — 7열 정사각 셀 */}
          <div className="mt-4 grid grid-cols-7 gap-1.5">
            {monthGrid.cells.map((cell, i) => (
              <MobileDayCell key={i} cell={cell} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function MobileDayCell({ cell }: { cell: MonthGrid['cells'][number] }) {
  if (cell.display === 0) return <div className="aspect-square w-full" aria-hidden />
  const tone = resolveDayTone(cell.state)
  return (
    <div
      className="relative flex aspect-square w-full items-start justify-start overflow-hidden rounded-lg"
      style={{
        padding: 5,
        backgroundColor: tone.bg,
        color: tone.text,
        boxShadow: tone.withStroke ? 'inset 0 0 0 2px #FFFFFF' : 'none',
      }}
    >
      <span className="relative z-20 font-bold leading-none" style={{ fontSize: 12, fontFamily: 'Pretendard, sans-serif' }}>
        {cell.display}
      </span>
    </div>
  )
}
