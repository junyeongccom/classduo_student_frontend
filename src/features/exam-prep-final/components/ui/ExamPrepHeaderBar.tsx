/**
 * @file ExamPrepHeaderBar.tsx
 * @description 기말대비 학습 페이지 — 상단 우측바(프로필 옆)에 들어가는 등급+XP+책장 바.
 *   기존 ExamPrepRewardWidget(도장·XP·계급 3개) 대체.
 * @module features/exam-prep-final/components/ui
 * @dependencies StudentCourseStateDto, BookshelfWidget
 */

'use client'

import type { StudentCourseStateDto } from '@/shared/services/gamificationService'
import { deriveRankFromXp } from '../result-overlay/utils'
import { BookshelfWidget } from './BookshelfWidget'

interface ExamPrepHeaderBarProps {
  state: StudentCourseStateDto | null
  loading?: boolean
}

/** 백엔드 RANK_BRACKETS 와 동일한 진급 임계 (총 XP 기준). 핵심테스트 15→10 변경 반영. */
const RANK_THRESHOLDS: Array<{ from: string; to: string; total: number }> = [
  { from: 'F',  to: 'D',  total: 100 },
  { from: 'D',  to: 'D+', total: 300 },
  { from: 'D+', to: 'C',  total: 650 },
  { from: 'C',  to: 'C+', total: 1100 },
  { from: 'C+', to: 'B',  total: 1700 },
  { from: 'B',  to: 'B+', total: 2300 },
  { from: 'B+', to: 'A',  total: 3000 },
  { from: 'A',  to: 'A+', total: 3750 },
]

interface ProgressInfo {
  xpToNext: number
  ratio: number
  isMax: boolean
}

function computeProgress(rankCode: string, totalXp: number): ProgressInfo {
  const step = RANK_THRESHOLDS.find((t) => t.from === rankCode)
  if (!step) return { xpToNext: 0, ratio: 1, isMax: true } // A+
  const prevTotal =
    RANK_THRESHOLDS.find((t) => t.to === rankCode)?.total ?? 0
  const span = step.total - prevTotal
  const earned = Math.max(0, totalXp - prevTotal)
  const ratio = span > 0 ? Math.min(1, earned / span) : 0
  return {
    xpToNext: Math.max(0, step.total - totalXp),
    ratio,
    isMax: false,
  }
}

/** 등급 코드 → 진행 바 색 (course-dashboard tier 컬러 톤 미러) */
const RANK_COLORS: Record<string, string> = {
  F: '#EF4444',
  D: '#A16207',
  'D+': '#CA8A04',
  C: '#65A30D',
  'C+': '#16A34A',
  B: '#0891B2',
  'B+': '#2563EB',
  A: '#7C3AED',
  'A+': '#383698',
}

export function ExamPrepHeaderBar({ state, loading = false }: ExamPrepHeaderBarProps) {
  const totalXp = state?.total_xp ?? 0
  const currentStreak = state?.current_streak ?? 0
  // 등급은 totalXp 로부터 derive — 백엔드 rank.code stale 시에도 일관성 보장.
  const rankCode = deriveRankFromXp(totalXp)
  const { xpToNext, ratio, isMax } = computeProgress(rankCode, totalXp)
  const barColor = RANK_COLORS[rankCode] ?? '#6366F1'

  return (
    <div className="flex items-center gap-4">
      {/* 등급 텍스트 (뱃지 이미지 X) */}
      <span
        className="shrink-0 text-3xl font-black leading-none tracking-tight text-gray-900 dark:text-gray-50"
        style={{ fontFamily: 'Pretendard, sans-serif' }}
        aria-label={`현재 계급 ${rankCode}`}
      >
        {rankCode}
      </span>

      {/* XP 진행 바 — 현재 XP / 다음 임계 + 진행 바 */}
      <div className="flex w-[200px] shrink-0 flex-col gap-1">
        <div className="flex items-baseline justify-between gap-1.5">
          <span
            className="text-[11px] font-medium text-gray-500 dark:text-gray-400"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            {loading
              ? '…'
              : isMax
                ? '최고 계급'
                : `다음 계급까지 ${xpToNext.toLocaleString()} XP`}
          </span>
          <span
            className="text-sm font-extrabold leading-none text-gray-900 dark:text-gray-50"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            {loading ? '…' : totalXp.toLocaleString()}
            <span className="ml-1 text-[10px] font-bold text-gray-500">XP</span>
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{
              width: `${Math.round(ratio * 100)}%`,
              backgroundColor: barColor,
            }}
          />
        </div>
      </div>

      {/* 출석 책장 — streak 별 색/책수, 클릭 시 쉐이커 이스터에그 */}
      <BookshelfWidget currentStreak={currentStreak} size={48} />
    </div>
  )
}
