/**
 * @file TestEndOverlay.tsx
 * @description 테스트 종료 풀화면 시퀀스 오케스트레이터.
 *   Phase 1 (마스터 XP) → Phase 2/3/4 (출석/일일 XP) → Phase 5 (최종 결과 — fixed overlay 해제)
 *   Phase 1~4 는 fixed inset-0 풀화면 / Phase 5 는 본 컴포넌트 외부에서 일반 패널로 렌더.
 *   진입 1초 후 우상단에 "건너뛰기" 버튼 노출 — 클릭 시 Phase 1~4 모두 건너뛰고 Phase 5 로.
 * @module features/exam-prep-final/components/result-overlay
 * @dependencies Phase1MasterXp, Phase23DailyXp, FinalResultData
 */

'use client'

import { useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { Phase1MasterXp } from './Phase1MasterXp'
import { Phase23DailyXp } from './Phase23DailyXp'
import type { FinalResultData } from './types'

interface TestEndOverlayProps {
  data: FinalResultData
  /** Phase 1~4 까지 모두 끝났을 때 호출 — 부모는 Phase 5 패널로 전환 */
  onAnimationComplete: () => void
}

type Stage = 'phase1' | 'phase23' | 'done'

export function TestEndOverlay({ data, onAnimationComplete }: TestEndOverlayProps) {
  const [stage, setStage] = useState<Stage>('phase1')
  /** 진입 1초 후 노출되는 글로벌 건너뛰기 버튼. 클릭 시 Phase 1~4 건너뛰고 Phase 5 로 진입. */
  const [showSkip, setShowSkip] = useState(false)
  const locale = useLocale()

  useEffect(() => {
    const id = window.setTimeout(() => setShowSkip(true), 1000)
    return () => window.clearTimeout(id)
  }, [])

  const handleSkip = () => {
    if (stage === 'done') return
    setStage('done')
    onAnimationComplete()
  }

  const skipLabel = locale === 'en' ? 'Skip' : '건너뛰기'
  // Phase 1/2/3/4 (z-[200]) 위에 떠야 하므로 z-[210]. stage !== 'done' 동안만 노출.
  const skipButton =
    showSkip && stage !== 'done' ? (
      <button
        type="button"
        onClick={handleSkip}
        className="fixed right-6 top-6 z-[210] rounded-xl border border-gray-300 bg-white/95 px-4 py-2 text-sm font-bold text-gray-700 shadow-md transition-colors hover:bg-gray-100"
        style={{ fontFamily: 'Pretendard, sans-serif' }}
      >
        {skipLabel}
      </button>
    ) : null

  if (stage === 'phase1') {
    return (
      <>
        <Phase1MasterXp
          deltas={data.questionDeltas}
          onDone={() => setStage('phase23')}
        />
        {skipButton}
      </>
    )
  }
  if (stage === 'phase23') {
    return (
      <>
        <Phase23DailyXp
          preStreak={data.pre.currentStreak}
          postStreak={data.postCurrentStreak}
          isFirstTestToday={data.isFirstTestToday}
          preTodayCount={Math.max(0, data.todayTestCount - 1)}
          postTodayCount={data.todayTestCount}
          calendarCounts={data.calendarTestCounts}
          onDone={() => {
            setStage('done')
            onAnimationComplete()
          }}
        />
        {skipButton}
      </>
    )
  }
  return null
}
