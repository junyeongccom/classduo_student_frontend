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
  onSubmit: (typeCounts: Record<string, number>) => Promise<void>
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

  const [typeCounts, setTypeCounts] = useState<Record<string, number>>(
    Object.fromEntries(QUIZ_TYPES.map(qt => [qt.value, 0])),
  )
  const [hoveredType, setHoveredType] = useState<string | null>(null)

  const totalCount = Object.values(typeCounts).reduce((a, b) => a + b, 0)

  const updateCount = useCallback((type: string, delta: number) => {
    setTypeCounts(prev => {
      const current = prev[type] ?? 0
      const next = Math.max(0, Math.min(20, current + delta))
      return { ...prev, [type]: next }
    })
  }, [])

  const handleSubmit = useCallback(() => {
    if (isSubmitting || totalCount === 0) return
    onSubmit(typeCounts)
  }, [isSubmitting, totalCount, typeCounts, onSubmit])

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
              {/* 유형별 문항 수 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('perTypeCount')}
                </label>
                <div className="flex flex-col gap-2">
                  {QUIZ_TYPES.map(qt => {
                    const count = typeCounts[qt.value] ?? 0
                    const isActive = count > 0
                    const isHovered = hoveredType === qt.value
                    return (
                      <div
                        key={qt.value}
                        className="relative"
                        onMouseEnter={() => setHoveredType(qt.value)}
                        onMouseLeave={() => setHoveredType(null)}
                      >
                        <div
                          className={cn(
                            'flex w-full items-center rounded-lg border px-3 py-2 text-sm transition',
                            isActive
                              ? 'border-indigo-400 bg-indigo-50 text-indigo-700 font-medium'
                              : 'border-gray-200 bg-white text-gray-400',
                          )}
                        >
                          <span className="flex-1">{t(qt.labelKey)}</span>
                          <Info className="h-4 w-4 shrink-0 text-gray-400 mr-3" aria-hidden />
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => updateCount(qt.value, -1)}
                              disabled={count <= 0}
                              className={cn(
                                'flex h-7 w-7 items-center justify-center rounded-md border text-sm font-medium transition',
                                count <= 0
                                  ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                                  : 'border-indigo-300 text-indigo-600 hover:bg-indigo-100',
                              )}
                            >
                              −
                            </button>
                            <span className={cn(
                              'w-8 text-center text-sm font-semibold',
                              isActive ? 'text-indigo-700' : 'text-gray-400',
                            )}>
                              {count}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateCount(qt.value, 1)}
                              disabled={count >= 20}
                              className={cn(
                                'flex h-7 w-7 items-center justify-center rounded-md border text-sm font-medium transition',
                                count >= 20
                                  ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                                  : 'border-indigo-300 text-indigo-600 hover:bg-indigo-100',
                              )}
                            >
                              +
                            </button>
                          </div>
                        </div>
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

              {/* 총 문항 수 + 예상 소요시간 */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className={cn('font-medium', totalCount > 0 && 'text-indigo-600')}>
                  {t('totalCount', { count: totalCount })}
                </span>
                <span>
                  {t('estimatedTime', { minutes: Math.ceil((75 + totalCount * 8) / 60) })}
                </span>
              </div>

              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
            </div>

            {/* 생성 버튼 — 카드 내부 하단 */}
            <div className="border-t border-gray-100 px-5 py-4">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || totalCount === 0}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium text-white transition',
                  isSubmitting || totalCount === 0
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
