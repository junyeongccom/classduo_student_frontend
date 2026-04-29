/**
 * @file SolveSidebar.tsx
 * @description 풀이 페이지 좌측 사이드바 — 회차정보 + 문항 그리드 + 경과시간
 * @module features/exam-prep-final/components/ui
 */

'use client'

import { useTranslations } from 'next-intl'
import { cn } from '@/shared/lib/utils'

interface SolveSidebarProps {
  /** 회차 라벨 (예: "3주차 2차시") */
  sessionLabel: string
  /** 회차 제목 */
  lectureTitle: string
  /** 전체 문항 수 */
  total: number
  /** 현재 1-based 문항 번호 */
  currentSeq: number
  /** 답변한 문항 seq 집합 */
  answeredSeqs: Set<number>
  /** 클릭으로 이동 */
  onSelectSeq: (seq: number) => void
  /** 경과 시간 (초) */
  elapsedSec: number
}

export function SolveSidebar({
  sessionLabel,
  lectureTitle,
  total,
  currentSeq,
  answeredSeqs,
  onSelectSeq,
  elapsedSec,
}: SolveSidebarProps) {
  const t = useTranslations()
  // 5열 고정 그리드
  const seqs = Array.from({ length: total }, (_, i) => i + 1)

  return (
    <aside className="flex h-full w-[200px] shrink-0 flex-col gap-6 border-r border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
      {/* 회차 정보 */}
      <div>
        <p className="text-xs text-gray-400">{sessionLabel}</p>
        <h2 className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-50">
          {lectureTitle}
        </h2>
      </div>

      {/* 문항 그리드 */}
      <div className="grid grid-cols-5 gap-1.5">
        {seqs.map((seq) => {
          const isCurrent = seq === currentSeq
          const isAnswered = answeredSeqs.has(seq)
          return (
            <button
              key={seq}
              type="button"
              onClick={() => onSelectSeq(seq)}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded text-[11px] font-semibold transition-colors',
                isCurrent
                  ? 'bg-[#6366F1] text-white'
                  : isAnswered
                    ? 'bg-[#DBDAFB] text-[#383698] hover:bg-[#C5C3F8]'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400',
              )}
            >
              {seq}
            </button>
          )
        })}
      </div>

      {/* 경과 시간 */}
      <div className="mt-auto flex items-center justify-between text-sm">
        <span className="text-gray-500 dark:text-gray-400">
          {t('examPrepFinal.elapsedTime')}
        </span>
        <span className="font-mono font-semibold text-gray-900 dark:text-gray-50">
          {formatElapsed(elapsedSec)}
        </span>
      </div>
    </aside>
  )
}

/** 초 → mm:ss */
function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
