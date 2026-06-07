/**
 * @file DashboardScaledContent.tsx
 * @description 과목 대시보드 본문 — Figma(991:3348) content 프레임(2103×1477) 좌표 그대로 절대배치.
 *   ScaledCanvas 안에서 contain-스케일되어 항상 한 화면 fit + 시안 비율 유지.
 *   좌: 핵심주제학습 히어로 / 회차별·대화형 카드 / 문제만들기·내퀴즈. 우: 캘린더 / 예상학점.
 * @module features/course-dashboard/components/ui
 * @dependencies ExamPrepHeroCard, domain/calendar(resolveDayTone), domain/grade, lucide-react
 */

'use client'

import { Bookmark, ChevronRight, PencilLine } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import type { LucideIcon } from 'lucide-react'

import { ExamPrepHeroCard } from './ExamPrepHeroCard'
import { resolveDayTone, MAX_BOOKS_PER_CELL, type MonthGrid } from '../../domain/calendar'
import { resolveDdayTone } from '../../domain/dday'

export const DASH_DESIGN_W = 2103
export const DASH_DESIGN_H = 1477

interface DashboardScaledContentProps {
  monthGrid: MonthGrid
  examDday: number | null
  currentStreak: number
  displayName: string
  xp: number
  rankCode: string
  courseTitle?: string
  isExamPrepLocked: boolean
  examPrepLockedTooltip: string
  onHero: () => void
  onWeekly: () => void
  onDialogue: () => void
  onCreate: () => void
  onMyQuiz: () => void
}

/** content 프레임 기준 절대좌표 박스. */
function Slot({
  left,
  top,
  width,
  height,
  children,
}: {
  left: number
  top: number
  width: number
  height: number
  children: React.ReactNode
}) {
  return (
    <div className="absolute" style={{ left, top, width, height }}>
      {children}
    </div>
  )
}

export function DashboardScaledContent(props: DashboardScaledContentProps) {
  const {
    monthGrid,
    examDday,
    currentStreak,
    isExamPrepLocked,
    examPrepLockedTooltip,
    onHero,
    onWeekly,
    onDialogue,
    onCreate,
    onMyQuiz,
  } = props
  const t = useTranslations()

  return (
    <div className="relative" style={{ width: DASH_DESIGN_W, height: DASH_DESIGN_H }}>
      {/* ── 좌측 ── */}
      <Slot left={139.5} top={102} width={663} height={479}>
        <ExamPrepHeroCard
          title={t('courseDashboard.modeExam.title')}
          isLocked={isExamPrepLocked}
          lockedTooltip={examPrepLockedTooltip}
          onClick={onHero}
        />
      </Slot>

      <Slot left={118} top={641} width={706} height={248}>
        <StudyCard
          eyebrow={t('courseDashboard.modeWeekly.eyebrow')}
          title={t('courseDashboard.modeWeekly.title')}
          desc={t('courseDashboard.weeklyShortDescription')}
          onClick={onWeekly}
        />
      </Slot>

      <Slot left={118} top={921} width={706} height={248}>
        <StudyCard
          eyebrow={t('courseDashboard.modeDialogue.eyebrow')}
          title={t('courseDashboard.modeDialogue.title')}
          desc={t('courseDashboard.dialogueShortDescription')}
          onClick={onDialogue}
        />
      </Slot>

      {/* ── 우측 ── */}
      <Slot left={1040.875} top={124} width={899.25} height={688.875}>
        <CalendarCard monthGrid={monthGrid} examDday={examDday} currentStreak={currentStreak} />
      </Slot>

      {/* 예상학점 카드 자리 — 문제 만들기 / 내 퀴즈 저장소 2장 (세로 스택, 987×480) */}
      <Slot left={997} top={872.875} width={987} height={480}>
        <div className="flex h-full w-full flex-col gap-[28px]">
          <div className="flex-1 rounded-[20px] bg-white px-[48px] shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-shadow hover:shadow-[0_6px_28px_rgba(15,23,42,0.1)]">
            <QuickAction icon={PencilLine} label={t('courseNav.createQuestion')} onClick={onCreate} />
          </div>
          <div className="flex-1 rounded-[20px] bg-white px-[48px] shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-shadow hover:shadow-[0_6px_28px_rgba(15,23,42,0.1)]">
            <QuickAction icon={Bookmark} label={t('courseDashboard.myQuizSaved')} onClick={onMyQuiz} />
          </div>
        </div>
      </Slot>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   회차별 / 대화형 학습 카드 (706×248) — Figma 991:3373
   ───────────────────────────────────────────────────────────── */
function StudyCard({
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
      className="flex h-full w-full items-center justify-between rounded-[20px] bg-white pr-[60px] text-left shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-shadow hover:shadow-[0_8px_28px_rgba(15,23,42,0.1)]"
      style={{ fontFamily: 'Pretendard, sans-serif' }}
    >
      <span className="flex flex-col gap-[10px] overflow-hidden px-[60px] py-[20px]">
        <span className="truncate text-[24px] font-bold text-[#ababab]">{eyebrow}</span>
        <span className="truncate text-[60px] font-bold leading-[1.2] text-black">{title}</span>
        <span className="truncate text-[30px] font-medium text-black">{desc}</span>
      </span>
      <ChevronRight className="shrink-0 text-[#383698]" style={{ width: 86, height: 86 }} strokeWidth={2.5} />
    </button>
  )
}

/* ─────────────────────────────────────────────────────────────
   문제 만들기 / 내 퀴즈 저장소 (350×146)
   ───────────────────────────────────────────────────────────── */
function QuickAction({
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
      className="flex h-full w-full items-center gap-[28px] text-left"
      style={{ fontFamily: 'Pretendard, sans-serif' }}
    >
      <span className="flex shrink-0 items-center justify-center rounded-[24px] bg-[#DEDEF8]" style={{ width: 104, height: 104 }}>
        <Icon className="text-[#6361E0]" style={{ width: 48, height: 48 }} strokeWidth={2.2} />
      </span>
      <span className="text-[30px] font-bold text-black">{label}</span>
    </button>
  )
}

/* ─────────────────────────────────────────────────────────────
   캘린더 (899.25×688.875) — Figma 991:3379. 9핀 위로 솟음 + 4×7 셀.
   ───────────────────────────────────────────────────────────── */
function CalendarCard({
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

  const weekCount = Math.ceil(monthGrid.cells.length / 7)

  return (
    <div className="relative h-full w-full">
      {/* 9 핀 — 프레임 위로 솟음 */}
      <div className="absolute left-0 right-0 z-10 flex justify-evenly px-[48px]" style={{ top: -2 }} aria-hidden>
        {Array.from({ length: 9 }).map((_, i) => (
          <span key={i} className="block rounded-full bg-[#6361E0]" style={{ width: 13, height: 52 }} />
        ))}
      </div>
      {/* 라벤더 프레임 */}
      <div className="absolute inset-x-0 bottom-0 rounded-[28px] bg-[#DBDAFB]" style={{ top: 24 }}>
        {/* 흰 종이 */}
        <div className="absolute rounded-[22px] bg-white" style={{ inset: 12 }}>
          {/* 헤더 */}
          <div
            className="absolute flex items-center justify-between"
            style={{ left: 36, right: 36, top: 70 }}
          >
            <span className="font-bold leading-none" style={{ fontSize: 56, color: '#383698', fontFamily: 'Pretendard, sans-serif' }}>
              {monthDisplay}
            </span>
            <div className="flex items-center gap-[16px]">
              {currentStreak > 0 && (
                <span
                  className="rounded-full font-semibold"
                  style={{ fontSize: 22, padding: '8px 18px', backgroundColor: ddayTone.bg, color: ddayTone.text }}
                >
                  {t('courseDashboard.streakInProgress', { days: currentStreak })}
                </span>
              )}
              <span
                className="rounded-full font-bold"
                style={{ fontSize: 30, padding: '10px 24px', backgroundColor: '#DBDAFB', color: '#000', fontFamily: 'Pretendard, sans-serif' }}
              >
                {ddayLabel}
              </span>
            </div>
          </div>
          {/* 날짜 그리드 — 헤더 아래~카드 하단을 채워 4~6주 어떤 달이든 fit (셀은 트랙을 채움) */}
          <div
            className="absolute grid"
            style={{
              left: 38,
              right: 38,
              top: 195,
              bottom: 28,
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              gridTemplateRows: `repeat(${weekCount}, minmax(0, 1fr))`,
              gap: 14,
            }}
          >
            {monthGrid.cells.map((cell, i) => (
              <DayCell key={i} cell={cell} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const CAL_BOOK_SRC = '/calender/캘린더-책.png'

function DayCell({ cell }: { cell: MonthGrid['cells'][number] }) {
  if (cell.display === 0) return <div className="h-full w-full" aria-hidden />
  const tone = resolveDayTone(cell.state)
  const books = Math.min(MAX_BOOKS_PER_CELL, cell.state.books ?? 0)
  return (
    <div
      className="relative flex h-full w-full items-start justify-start overflow-visible rounded-[24px]"
      style={{
        padding: 12,
        backgroundColor: tone.bg,
        color: tone.text,
        boxShadow: tone.withStroke ? 'inset 0 0 0 3px #FFFFFF' : 'none',
      }}
    >
      {tone.bookColor && books > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-1 z-0 flex flex-col-reverse items-center" aria-hidden>
          {Array.from({ length: books }).map((_, i) => (
            <img
              key={i}
              src={CAL_BOOK_SRC}
              alt=""
              draggable={false}
              className="block w-[80%] select-none"
              style={{ marginTop: i === 0 ? 0 : -4, transform: `translateX(${i % 2 === 0 ? -4 : 4}px)` }}
            />
          ))}
        </div>
      )}
      <span className="relative z-20 font-bold leading-none" style={{ fontSize: 28, fontFamily: 'Pretendard, sans-serif' }}>
        {cell.display}
      </span>
    </div>
  )
}

/* 예상 학점 카드(GradeCard)는 과목 대시보드에서 제거됨 — 해당 자리에 문제 만들기 / 내 퀴즈 저장소 배치. */
