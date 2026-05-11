/**
 * @file Phase23DailyXp.tsx
 * @description Phase 2 (오늘의 테스트 풀이 횟수) → Phase 3/4 (일일 참여 경험치) 통합.
 *   좌측 진한 그레이 패널에 BookshelfStage 가 머무르고, 우측 텍스트 영역만 cross-fade.
 *   - Phase 2: 책 떨어짐 + "오늘의 테스트 풀이 횟수 N→N+1"
 *   - Phase 3: (오늘 첫 학습) "일일 참여 경험치 X XP" + DAY 1/2~4/5~ 카드
 *   - Phase 4: (이미 받음) "오늘은 이미 일일 참여 경험치를 얻었어요." + DAY 카드
 * @module features/exam-prep-final/components/result-overlay
 * @dependencies BookshelfStage, FinalResultData
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { BookshelfStage } from './BookshelfStage'
import { resolveStreakTier } from './utils'

interface Phase23Props {
  preStreak: number
  postStreak: number
  isFirstTestToday: boolean
  /** 풀이 직전 오늘 카운트 (이번 풀이 직전까지 N) — 책 떨어짐 후 N+1 */
  preTodayCount: number
  /** 풀이 후 카운트 (preTodayCount + 1) */
  postTodayCount: number
  /** 캘린더 윈도우 (offset -3..+3) 의 날짜별 풀이 수. 책장 셀별 책 시각화. */
  calendarCounts: Record<number, number>
  /** 모션 종료 시 호출 — Phase5 로 진행 */
  onDone: () => void
}

const PHASE3_DELAY_AFTER_FILL = 600
const PHASE3_BOTTOM_DELAY = 1400
const PHASE3_HOLD = 5000

type RightStage = 'phase2' | 'phase3-top' | 'phase3-full' | 'phase4'

export function Phase23DailyXp({
  preStreak,
  postStreak,
  isFirstTestToday,
  preTodayCount,
  postTodayCount,
  calendarCounts,
  onDone,
}: Phase23Props) {
  const t = useTranslations()
  const tier = resolveStreakTier(postStreak)
  const [rightStage, setRightStage] = useState<RightStage>('phase2')
  const [counterDisplay, setCounterDisplay] = useState(preTodayCount)
  const [counterPulse, setCounterPulse] = useState(0)
  /** entrance 애니메이션이 끝난 뒤에만 [다음] 버튼 노출 — 사용자 클릭 시 Phase5 로 진행 */
  const [canAdvance, setCanAdvance] = useState(false)
  // onDone 안정화 (Phase1 과 동일 — 부모 elapsedSec 1s 타이머로 인한 stale closure 방지)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  // 책장 fill 시점 — Phase 2 카운터 증가
  const handleShelfFilled = () => {
    setCounterDisplay(postTodayCount)
    setCounterPulse((p) => p + 1)
  }

  // 책 페이드 끝 → Phase 3 (또는 4) 전환. 자동 onDone 없음 — [다음] 버튼 클릭 대기.
  const handleStageDone = () => {
    setTimeout(() => {
      if (isFirstTestToday) {
        setRightStage('phase3-top')
        setTimeout(() => setRightStage('phase3-full'), PHASE3_BOTTOM_DELAY)
        // entrance + DAY 카드 stagger 끝나는 시점에 버튼 활성화
        setTimeout(() => setCanAdvance(true), PHASE3_BOTTOM_DELAY + 700)
      } else {
        setRightStage('phase4')
        setTimeout(() => setCanAdvance(true), 900)
      }
    }, PHASE3_DELAY_AFTER_FILL)
  }

  return (
    <div className="fixed inset-0 z-[200] flex bg-white">
      {/* 좌측: 진한 그레이 패널 */}
      <div
        className="relative flex h-full w-[44%] shrink-0 items-center justify-center"
        style={{ backgroundColor: '#242424' }}
      >
        <BookshelfStage
          preStreak={preStreak}
          postStreak={postStreak}
          isFirstTestToday={isFirstTestToday}
          calendarCounts={calendarCounts}
          autoPlay
          onShelfFilled={handleShelfFilled}
          onSequenceDone={handleStageDone}
        />
      </div>

      {/* 우측: 텍스트 영역 (cross-fade) */}
      <div
        className="relative flex h-full flex-1 flex-col items-start justify-center gap-12 px-20"
        style={{ fontFamily: 'Pretendard, sans-serif' }}
      >
        {/* Phase 2 */}
        <div
          className={`dar-panel absolute left-20 top-1/2 -translate-y-1/2 flex flex-col items-start gap-4 ${
            rightStage === 'phase2' ? 'is-in' : 'is-out'
          }`}
        >
          <span className="text-base font-bold text-gray-900">{t('examPrepFinal.todayTestCount')}</span>
          <span
            key={counterPulse}
            className="te-num-pop text-7xl font-black text-gray-900"
          >
            {counterDisplay}
          </span>
        </div>

        {/* Phase 3 — 상단 블록: 라벨 + 큰 XP */}
        <div
          className={`dar-panel absolute left-20 right-20 top-[12%] flex flex-col items-start gap-6 ${
            rightStage === 'phase3-top' || rightStage === 'phase3-full' ? 'is-in' : 'is-out'
          }`}
        >
          <span className="text-3xl font-bold leading-none text-gray-900">
            {t('examPrepFinal.dailyParticipationXp')}
          </span>
          <div className="flex items-end gap-3">
            <span className="te-num-pop text-8xl font-black leading-none text-gray-900">
              {tier.dailyXp}
            </span>
            <span className="text-3xl font-bold text-gray-900">XP</span>
          </div>
        </div>

        {/* Phase 3 — 하단 블록: 연속 보상 강화 헤더 + DAY 카드 + 1일 뒤 안내 */}
        <div
          className={`dar-panel absolute left-20 right-20 bottom-[10%] flex flex-col items-start gap-4 ${
            rightStage === 'phase3-full' ? 'is-in' : 'is-out'
          }`}
        >
          <span className="text-base font-bold tracking-wide text-gray-700">
            {t('examPrepFinal.streakRewardBoost')}
          </span>
          <DayCardsRow />
          <span className="mt-1 text-lg font-bold text-gray-900">
            {t('examPrepFinal.nextDayXpHint', { xp: nextDayXp(postStreak) })}
          </span>
        </div>

        {/* Phase 4 — 상단 블록: "이미 받았어요" — 큰 글자로 꽉 차게 */}
        <div
          className={`dar-panel absolute left-20 right-20 top-[14%] flex flex-col items-start ${
            rightStage === 'phase4' ? 'is-in' : 'is-out'
          }`}
        >
          <span
            className="whitespace-pre-line text-5xl font-black leading-tight text-gray-900"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            {t('examPrepFinal.alreadyEarnedToday')}
          </span>
        </div>
        {/* Phase 4 — 하단 블록: 연속 보상 강화 (Phase3 와 동일 톤) */}
        <div
          className={`dar-panel absolute left-20 right-20 bottom-[10%] flex flex-col items-start gap-4 ${
            rightStage === 'phase4' ? 'is-in' : 'is-out'
          }`}
        >
          <span className="text-base font-bold tracking-wide text-gray-700">
            {t('examPrepFinal.streakRewardBoost')}
          </span>
          <DayCardsRow />
          <span className="mt-1 text-lg font-bold text-gray-900">
            {t('examPrepFinal.nextDayXpHint', { xp: nextDayXp(postStreak) })}
          </span>
        </div>

        {/* [다음] 버튼 — Phase 3/4 entrance 끝난 뒤 노출. Phase 2 에서는 표시 X. */}
        {canAdvance && rightStage !== 'phase2' && (
          <button
            type="button"
            onClick={() => onDoneRef.current()}
            className="te-fade-up absolute bottom-12 right-20 rounded-2xl px-10 py-3.5 text-base font-bold text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: '#2D2461', fontFamily: 'Pretendard, sans-serif' }}
          >
            {t('examPrepFinal.nextButton')}
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * 1일 뒤 (= postStreak + 1) 의 streak 등급 일일 참여 XP.
 * 백엔드 STAMP_XP_DAY_* 와 동일:
 *   - 내일 streak 1 이하 → 20
 *   - 2~4 → 30
 *   - 5+ → 40
 */
function nextDayXp(postStreak: number): number {
  const tomorrow = postStreak + 1
  if (tomorrow <= 1) return 20
  if (tomorrow <= 4) return 30
  return 40
}

function DayCardsRow() {
  // 카드 가로 길이 비례: DAY 1 : DAY 2~4 : DAY 5~ = 1 : 3 : 5 (≈ 날짜 범위).
  // 좁은 화면에서 잘리지 않도록 grid template 사용 (1fr 3fr 5fr) + 컨테이너 max-width 100%.
  const cards: { label: string; xp: number; bg: string; text: string; delay: number; flex: string }[] = [
    { label: 'DAY 1', xp: 20, bg: '#ECE7FB', text: '#2D2461', delay: 60, flex: '1' },
    { label: 'DAY 2~4', xp: 30, bg: '#B2A4F0', text: '#FFFFFF', delay: 180, flex: '3' },
    { label: 'DAY 5~', xp: 40, bg: '#2D2461', text: '#FFFFFF', delay: 300, flex: '5' },
  ]
  return (
    <div
      className="grid w-full max-w-[640px] items-end gap-3"
      style={{ gridTemplateColumns: '1fr 3fr 5fr' }}
    >
      {cards.map((c) => (
        <div
          key={c.label}
          className="flex min-w-0 flex-col items-start gap-2"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          <span className="pl-1 text-sm font-bold tracking-wide text-gray-700">
            {c.label}
          </span>
          <div
            className="dar-day-card is-in flex h-14 w-full items-center justify-center rounded-2xl text-xl font-bold"
            style={{
              backgroundColor: c.bg,
              color: c.text,
              animationDelay: `${c.delay}ms`,
            }}
          >
            {c.xp}
          </div>
        </div>
      ))}
    </div>
  )
}
