/**
 * @file SolveResultPanel.tsx
 * @description 핵심테스트 풀이 완료 결과 화면 — 점수 + 마스터리 + 다시풀기/나가기
 * @module features/exam-prep-final/components/ui
 */

'use client'

import { Check, X as XIcon, RotateCcw, LogOut } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type {
  CoreTestQuestionItemDto,
  GradeSingleResponseDto,
} from '../../services/examPrepService'

interface MasterySummary {
  learning: number
  skilled: number
  master: number
}

interface SolveResultPanelProps {
  total: number
  correctCount: number
  masterySummary: MasterySummary
  gradedBySeq: Record<number, GradeSingleResponseDto>
  questions: CoreTestQuestionItemDto[]
  onRestart: () => void
  onExit: () => void
}

export function SolveResultPanel({
  total,
  correctCount,
  masterySummary,
  gradedBySeq,
  questions,
  onRestart,
  onExit,
}: SolveResultPanelProps) {
  const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0
  const masterTransitions = Object.values(gradedBySeq).filter(
    (g) => g.mastery.first_master_transition,
  ).length

  return (
    <div className="flex h-full flex-1 flex-col overflow-y-auto bg-[#F5F7F8] dark:bg-gray-950">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-8 py-10">
        {/* 큰 점수 카드 */}
        <div className="mb-6 rounded-3xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            풀이 완료
          </p>
          <p className="mt-3 text-3xl font-black text-gray-900 dark:text-gray-50 sm:text-4xl md:text-5xl">
            {correctCount}{' '}
            <span className="text-xl text-gray-400 sm:text-2xl md:text-3xl">/ {total}</span>
          </p>
          <p className="mt-2 text-base font-semibold text-[#6366F1]">
            정답률 {accuracy}%
          </p>
          {masterTransitions > 0 && (
            <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
              🔥 {masterTransitions}개 문항 Master 도달!
            </p>
          )}
        </div>

        {/* 마스터리 카운트 카드 */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 text-center dark:border-gray-700 dark:bg-gray-900">
            <span className="inline-block h-2 w-2 rounded-full bg-gray-300" />
            <p className="mt-2 text-xs text-gray-500">Learning</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-50">
              {masterySummary.learning}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 text-center dark:border-gray-700 dark:bg-gray-900">
            <span className="inline-block h-2 w-2 rounded-full bg-cyan-400" />
            <p className="mt-2 text-xs text-cyan-600">Skilled</p>
            <p className="mt-1 text-2xl font-bold text-cyan-600">
              {masterySummary.skilled}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 text-center dark:border-gray-700 dark:bg-gray-900">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <p className="mt-2 text-xs text-emerald-600">Master</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">
              {masterySummary.master}
            </p>
          </div>
        </div>

        {/* 문항별 정오답 그리드 */}
        <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
            문항별 결과
          </p>
          <div className="grid grid-cols-5 gap-2">
            {questions
              .sort((a, b) => a.seq - b.seq)
              .map((q) => {
                const g = gradedBySeq[q.seq]
                if (!g) {
                  return (
                    <div
                      key={q.seq}
                      className="flex h-10 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400 dark:bg-gray-800"
                    >
                      {q.seq}
                    </div>
                  )
                }
                return (
                  <div
                    key={q.seq}
                    className={cn(
                      'flex h-10 items-center justify-center gap-1 rounded-lg text-xs font-semibold',
                      g.is_correct
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700',
                      g.hint_used && 'opacity-70',
                    )}
                  >
                    {g.is_correct ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <XIcon className="h-3 w-3" />
                    )}
                    {q.seq}
                  </div>
                )
              })}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onRestart}
            className="flex items-center justify-center gap-2 rounded-2xl border border-gray-300 bg-white py-4 text-base font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          >
            <RotateCcw className="h-5 w-5" />
            다시풀기
          </button>
          <button
            type="button"
            onClick={onExit}
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#6366F1] py-4 text-base font-semibold text-white transition-colors hover:bg-[#5558E6]"
          >
            <LogOut className="h-5 w-5" />
            나가기
          </button>
        </div>
      </div>
    </div>
  )
}
