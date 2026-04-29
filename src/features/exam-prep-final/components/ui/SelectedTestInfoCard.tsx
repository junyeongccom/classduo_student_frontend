/**
 * @file SelectedTestInfoCard.tsx
 * @description 핵심 테스트 선택 시 상단 3박스를 대체하는 정보 카드
 * @module features/exam-prep-final/components/ui
 * @dependencies lucide-react
 */

'use client'

import { Play } from 'lucide-react'
import type { CoreTest } from '../../types'

interface SelectedTestInfoCardProps {
  test: CoreTest
  onStart: () => void
}

export function SelectedTestInfoCard({ test, onStart }: SelectedTestInfoCardProps) {
  const numberLabel = String(test.number).padStart(2, '0')
  const sessionLabel = `${test.weekNo}주차 ${test.sessionNo}차시`

  return (
    <div className="flex min-h-[200px] items-stretch justify-between gap-6 rounded-3xl border border-gray-200 bg-white px-7 py-7 dark:border-gray-700 dark:bg-gray-900">
      {/* 좌측 — flex-col + justify-between 으로 박스 높이 안에서 균형 분산 */}
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-4">
            <span className="text-5xl font-bold leading-none text-gray-900 dark:text-gray-50">
              {numberLabel}
            </span>
            <span className="text-base font-medium text-gray-400">
              {sessionLabel}
            </span>
          </div>
          <h3 className="mt-5 text-3xl font-bold text-gray-900 dark:text-gray-50">
            {test.lectureTitle}
          </h3>
        </div>

        {/* 미터링 도트 — 박스 하단 정렬 */}
        <div className="flex items-center gap-5 text-base font-medium">
          <span className="flex items-center gap-2 text-gray-500">
            <span className="inline-block h-3.5 w-3.5 rounded-full bg-gray-300" />
            {test.metaCounts.gray}
          </span>
          <span className="flex items-center gap-2 text-cyan-500">
            <span className="inline-block h-3.5 w-3.5 rounded-full bg-cyan-400" />
            {test.metaCounts.cyan}
          </span>
          <span className="flex items-center gap-2 text-emerald-500">
            <span className="inline-block h-3.5 w-3.5 rounded-full bg-emerald-500" />
            {test.metaCounts.green}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onStart}
        aria-label="Start test"
        className="flex h-20 w-20 shrink-0 self-center items-center justify-center rounded-2xl bg-[#6366F1] text-white shadow-md shadow-indigo-500/20 transition-colors hover:bg-[#5558E6]"
      >
        <Play className="h-8 w-8 fill-white" />
      </button>
    </div>
  )
}
