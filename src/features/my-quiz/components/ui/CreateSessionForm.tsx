/**
 * @file CreateSessionForm.tsx
 * @description 퀴즈 세션 생성 설정 폼 (문항 수 + 유형 선택)
 * @module features/my-quiz
 * @dependencies next-intl, myQuizService
 */

'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import * as myQuizService from '../../services/myQuizService'
import type { QuizSession } from '../../types'

const QUIZ_TYPES = [
  { value: 'DEF_TO_TERM', labelKey: 'typeDEF_TO_TERM' },
  { value: 'TERM_TO_DEF', labelKey: 'typeTERM_TO_DEF' },
  { value: 'MISCONCEPTION', labelKey: 'typeMISCONCEPTION' },
] as const

interface CreateSessionFormProps {
  lectureId: string
  onCreated: (session: QuizSession) => void
  onCancel: () => void
}

export default function CreateSessionForm({
  lectureId,
  onCreated,
  onCancel,
}: CreateSessionFormProps) {
  const t = useTranslations('myQuiz.create')
  const tError = useTranslations('myQuiz.error')

  const [quizCount, setQuizCount] = useState(10)
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    QUIZ_TYPES.map(qt => qt.value),
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleType = useCallback((type: string) => {
    setSelectedTypes(prev => {
      if (prev.includes(type)) {
        if (prev.length <= 1) return prev
        return prev.filter(t => t !== type)
      }
      return [...prev, type]
    })
  }, [])

  const handleSubmit = useCallback(async () => {
    if (isSubmitting || selectedTypes.length === 0) return
    setIsSubmitting(true)
    setError(null)

    const result = await myQuizService.createSession(
      lectureId,
      quizCount,
      selectedTypes,
    )

    if (result.error || !result.data) {
      setError(result.error?.message ?? tError('createFailed'))
      setIsSubmitting(false)
      return
    }

    const newSession: QuizSession = {
      session_id: result.data.session_id,
      student_id: '',
      lecture_id: lectureId,
      course_id: '',
      generation_batch_id: null,
      language: null,
      status: 'CREATING',
      quiz_count: quizCount,
      title: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    setIsSubmitting(false)
    onCreated(newSession)
  }, [isSubmitting, selectedTypes, lectureId, quizCount, tError, onCreated])

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

      {/* 설정 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
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
              return (
                <button
                  key={qt.value}
                  type="button"
                  onClick={() => toggleType(qt.value)}
                  className={cn(
                    'flex items-center rounded-lg border px-3 py-2 text-sm transition',
                    isSelected
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-700 font-medium'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                  )}
                >
                  <span
                    className={cn(
                      'mr-2 flex h-4 w-4 items-center justify-center rounded border',
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
                  {t(qt.labelKey)}
                </button>
              )
            })}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
      </div>

      {/* 하단 생성 버튼 */}
      <div className="shrink-0 border-t border-gray-100 p-4">
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
  )
}
