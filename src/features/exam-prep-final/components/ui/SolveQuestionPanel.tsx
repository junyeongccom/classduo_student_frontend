/**
 * @file SolveQuestionPanel.tsx
 * @description 풀이 페이지 메인 — stem + 선지 + 액션 + 페이지네이션
 * @module features/exam-prep-final/components/ui
 */

'use client'

import { Bookmark, FileText, Flag, ChevronLeft, ChevronRight, Lightbulb, Minus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/shared/lib/utils'
import type { CoreTestQuestionItemDto } from '../../services/examPrepService'

interface SolveQuestionPanelProps {
  question: CoreTestQuestionItemDto
  /** 1-based */
  currentSeq: number
  total: number
  /** 현재 문항의 선택된 옵션 인덱스 (0-based), 없으면 null */
  selectedChoice: number | null
  onSelectChoice: (idx: number) => void
  onSubmit: () => void
  onPrev: () => void
  onNext: () => void
  hasPrev: boolean
  hasNext: boolean
}

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E']

export function SolveQuestionPanel({
  question,
  currentSeq,
  total,
  selectedChoice,
  onSelectChoice,
  onSubmit,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: SolveQuestionPanelProps) {
  const t = useTranslations()

  return (
    <div className="flex h-full flex-1 flex-col overflow-y-auto bg-[#F5F7F8] dark:bg-gray-950">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-8 py-8">
        {/* 상단 메타 — 단일 선택 + Learning/Skilled/Master 카운트 (mock) */}
        <div className="mb-5 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-gray-500 dark:border-gray-700 dark:text-gray-400">
            <Minus className="h-3 w-3" />
            {t('examPrepFinal.singleChoice')}
          </span>
          <div className="flex items-center gap-3 text-gray-500">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-gray-300" />
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                18
              </span>
              <span>Learning</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-cyan-400" />
              <span className="font-semibold text-cyan-600">2</span>
              <span>Skilled</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              <span className="font-semibold text-emerald-600">0</span>
              <span>Master</span>
            </span>
          </div>
        </div>

        {/* 문제 stem */}
        <h1 className="text-3xl font-bold leading-snug text-gray-900 dark:text-gray-50">
          {question.stem}
        </h1>

        {/* 선지 */}
        <div className="mt-8 flex flex-col gap-3">
          {question.options.map((opt, idx) => {
            const label = OPTION_LABELS[idx] ?? String.fromCharCode(65 + idx)
            const isSelected = selectedChoice === idx
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectChoice(idx)}
                className={cn(
                  'group flex w-full items-center gap-4 rounded-xl border px-5 py-4 text-left transition-colors',
                  // hover 시 배경만 변경, 선택 시는 알파벳만 색 변경
                  isSelected
                    ? 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
                    : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800',
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-bold transition-colors',
                    isSelected
                      ? 'bg-[#6366F1] text-white'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
                  )}
                >
                  {label}
                </span>
                <span className="text-base text-gray-800 dark:text-gray-100">
                  {opt}
                </span>
              </button>
            )
          })}
        </div>

        {/* 하단 액션 영역 */}
        <div className="mt-8 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-400">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
              aria-label="bookmark"
            >
              <Bookmark className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
              aria-label="memo"
            >
              <FileText className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
              aria-label="flag"
            >
              <Flag className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            >
              <Lightbulb className="h-4 w-4" />
              {t('examPrepFinal.hint')}
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={selectedChoice === null}
              className="rounded-lg bg-[#6366F1] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#5558E6] disabled:opacity-40"
            >
              {t('examPrepFinal.submit')}
            </button>
          </div>
        </div>

        {/* 페이지네이션 */}
        <div className="mt-6 flex items-center justify-between">
          <p className="text-base font-semibold text-gray-700 dark:text-gray-300">
            <span className="text-gray-900 dark:text-gray-50">
              {currentSeq}
            </span>
            <span className="mx-1.5 text-gray-300">/</span>
            <span className="text-gray-400">{total}</span>
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onPrev}
              disabled={!hasPrev}
              aria-label="prev"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!hasNext}
              aria-label="next"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
