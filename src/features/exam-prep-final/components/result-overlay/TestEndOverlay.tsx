/**
 * @file TestEndOverlay.tsx
 * @description 테스트 종료 풀화면 시퀀스 오케스트레이터.
 *   Phase 1 (마스터 XP) → Phase 2/3/4 (출석/일일 XP) → Phase 5 (최종 결과 — fixed overlay 해제)
 *   Phase 1~4 는 fixed inset-0 풀화면 / Phase 5 는 본 컴포넌트 외부에서 일반 패널로 렌더.
 * @module features/exam-prep-final/components/result-overlay
 * @dependencies Phase1MasterXp, Phase23DailyXp, FinalResultData
 */

'use client'

import { useState } from 'react'
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

  if (stage === 'phase1') {
    return (
      <Phase1MasterXp
        deltas={data.questionDeltas}
        onDone={() => setStage('phase23')}
      />
    )
  }
  if (stage === 'phase23') {
    return (
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
    )
  }
  return null
}
