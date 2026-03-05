/**
 * @file CreateSessionForm.tsx
 * @description 퀴즈 세션 생성 설정 폼 (문항 수 + 유형 선택) — props 기반 UI, 유형별 호버 툴팁
 * @module features/my-quiz
 * @dependencies next-intl, lucide-react
 */

'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Info, Loader2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

const QUIZ_TYPES = [
  { value: 'DEF_TO_TERM', labelKey: 'typeDEF_TO_TERM' },
  { value: 'TERM_TO_DEF', labelKey: 'typeTERM_TO_DEF' },
  { value: 'MISCONCEPTION', labelKey: 'typeMISCONCEPTION' },
  { value: 'STRUCTURE_OBJ', labelKey: 'typeSTRUCTURE_OBJ' },
] as const

interface CreateSessionFormProps {
  onSubmit: (quizCount: number, quizTypes: string[]) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
  error?: string | null
}

export default function CreateSessionForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
  error = null,
}: CreateSessionFormProps) {
  const t = useTranslations('myQuiz.create')

  const [quizCount, setQuizCount] = useState(10)
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    QUIZ_TYPES.map(qt => qt.value),
  )
  const [hoveredType, setHoveredType] = useState<string | null>(null)

  const toggleType = useCallback((type: string) => {
    setSelectedTypes(prev => {
      if (prev.includes(type)) {
        if (prev.length <= 1) return prev
        return prev.filter(t => t !== type)
      }
      return [...prev, type]
    })
  }, [])

  const handleSubmit = useCallback(() => {
    if (isSubmitting || selectedTypes.length === 0) return
    onSubmit(quizCount, selectedTypes)
  }, [isSubmitting, selectedTypes, quizCount, onSubmit])

  return (
    <div className="flex h-full flex-col">
      {/* 헤더 */}
      <div className="shrink-0 flex items-center gap-2 border-b border-gray-100 px-4 py-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h3 className="text-sm font-semibold text-gray-800">{t('newSession')}</h3>
      </div>

      {/* 설정 영역 - 카드 레이아웃 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-lg">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="p-5 space-y-6">
              {/* 문항 수 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('quizCount')}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={30}
                    value={quizCount}
                    onChange={e => setQuizCount(Number(e.target.value))}
                    className="flex-1 accent-indigo-500"
                  />
                  <span className="w-10 text-center text-sm font-semibold text-gray-700">
                    {quizCount}
                  </span>
                </div>
              </div>

              {/* 문제 유형 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('quizTypes')}
                </label>
                <div className="flex flex-col gap-2">
                  {QUIZ_TYPES.map(qt => {
                    const isSelected = selectedTypes.includes(qt.value)
                    const isHovered = hoveredType === qt.value
                    return (
                      <div
                        key={qt.value}
                        className="relative"
                        onMouseEnter={() => setHoveredType(qt.value)}
                        onMouseLeave={() => setHoveredType(null)}
                      >
                        <button
                          type="button"
                          onClick={() => toggleType(qt.value)}
                          className={cn(
                            'flex w-full items-center rounded-lg border px-3 py-2 text-left text-sm transition',
                            isSelected
                              ? 'border-indigo-400 bg-indigo-50 text-indigo-700 font-medium'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                          )}
                        >
                          <span
                            className={cn(
                              'mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                              isSelected
                                ? 'border-indigo-500 bg-indigo-500 text-white'
                                : 'border-gray-300',
                            )}
                          >
                            {isSelected && (
                              <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                                <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                          <span className="flex-1">{t(qt.labelKey)}</span>
                          <Info className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                        </button>
                        {isHovered && (
                          <div
                            role="tooltip"
                            className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-gray-200 bg-gray-900 px-3 py-2 text-xs font-normal text-white shadow-lg"
                          >
                            {t(`typeDescription.${qt.value}`)}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 예상 소요시간 */}
              <p className="text-xs text-gray-500">
                {t('estimatedTime', { minutes: Math.ceil((75 + quizCount * 8) / 60) })}
              </p>

              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
            </div>

            {/* 생성 버튼 — 카드 내부 하단 */}
            <div className="border-t border-gray-100 px-5 py-4">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || selectedTypes.length === 0}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium text-white transition',
                  isSubmitting || selectedTypes.length === 0
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700',
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('generating')}
                  </>
                ) : (
                  t('generate')
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
