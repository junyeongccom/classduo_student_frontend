/**
 * @file SessionDetailView.tsx
 * @description 세션 상세 화면 — 퀴즈 목록을 quiz_type별 그룹화 + StudentQuizCard 렌더링
 * @module features/my-quiz
 * @dependencies next-intl, shared/components/quiz, myQuizService, myQuizStatusService
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { StudentQuizCard } from '@/shared/components/quiz'
import type { StudentQuizItem } from '@/shared/components/quiz'
import { useToast } from '@/shared/hooks/useToast'
import * as myQuizService from '../../services/myQuizService'
import * as statusService from '../../services/myQuizStatusService'
import { TYPE_ORDER } from '../../types'
import type { QuizItem, QuizStatusEntry } from '../../types'

interface SessionDetailViewProps {
  sessionId: string
  lectureId: string
  onBack: () => void
}

export default function SessionDetailView({
  sessionId,
  lectureId,
  onBack,
}: SessionDetailViewProps) {
  const t = useTranslations('myQuiz')
  const tQuiz = useTranslations('lectureStudy.quiz')
  const { toasts, error: showErrorToast } = useToast()

  const [quizzes, setQuizzes] = useState<QuizItem[]>([])
  const [statusMap, setStatusMap] = useState<Map<string, QuizStatusEntry>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const detailResult = await myQuizService.getSessionDetail(sessionId)
    if (detailResult.error || !detailResult.data) {
      if (detailResult.status === 404) {
        setError(t('session.sessionDeleted'))
        setIsLoading(false)
        return
      }
      if (process.env.NODE_ENV === 'development') console.error('[SessionDetailView] fetchData error:', detailResult.error)
      setError(t('error.loadFailed'))
      setIsLoading(false)
      return
    }

    setQuizzes(detailResult.data.quizzes ?? [])

    const statusResult = await statusService.getQuizStatusesByLecture(lectureId, {})
    if (statusResult.data) {
      const map = new Map<string, QuizStatusEntry>()
      for (const s of statusResult.data) {
        map.set(`${s.quiz_source}:${s.quiz_id}`, s)
      }
      setStatusMap(map)
    }

    setIsLoading(false)
  }, [sessionId, lectureId, t])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleBookmarkToggle = useCallback(
    async (quizId: string) => {
      const key = `customize:${quizId}`
      const current = statusMap.get(key)
      const newBookmark = !(current?.bookmark ?? false)

      setStatusMap(prev => {
        const next = new Map(prev)
        next.set(key, {
          quiz_id: quizId,
          quiz_source: 'customize',
          lecture_id: lectureId,
          bookmark: newBookmark,
          correct: current?.correct ?? null,
          answer: current?.answer ?? null,
        })
        return next
      })

      const result = await statusService.toggleBookmark('customize', quizId, lectureId, newBookmark)
      if (result.error) {
        showErrorToast(t('error.bookmarkFailed'))
        setStatusMap(prev => {
          const next = new Map(prev)
          if (current) next.set(key, current)
          else next.delete(key)
          return next
        })
      }
    },
    [statusMap, lectureId, showErrorToast, t],
  )

  const handleCorrectUpdate = useCallback(
    async (quizId: string, isCorrect: boolean, answer: number) => {
      const key = `customize:${quizId}`
      const current = statusMap.get(key)

      setStatusMap(prev => {
        const next = new Map(prev)
        next.set(key, {
          quiz_id: quizId,
          quiz_source: 'customize',
          lecture_id: lectureId,
          bookmark: current?.bookmark ?? false,
          correct: isCorrect,
          answer,
        })
        return next
      })

      const result = await statusService.updateCorrect('customize', quizId, lectureId, isCorrect, answer)
      if (result.error) {
        showErrorToast(t('error.correctFailed'))
        setStatusMap(prev => {
          const next = new Map(prev)
          if (current) next.set(key, current)
          else next.delete(key)
          return next
        })
      }
    },
    [statusMap, lectureId, showErrorToast, t],
  )

  // 퀴즈를 type별 그룹화
  const grouped = TYPE_ORDER
    .map(type => ({
      type,
      items: quizzes.filter(q => q.quiz_type === type),
    }))
    .filter(g => g.items.length > 0)

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
        <p className="text-sm text-red-500">{error}</p>
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-indigo-600 hover:underline"
        >
          {t('session.back')}
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toast messages */}
      {toasts.length > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-1">
          {toasts.map(toast => (
            <div key={toast.id} className="rounded-lg bg-red-600 px-4 py-2 text-xs text-white shadow-lg">
              {toast.message}
            </div>
          ))}
        </div>
      )}
      {/* 헤더 */}
      <div className="shrink-0 flex items-center gap-2 border-b border-gray-100 px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h3 className="text-sm font-semibold text-gray-800">{t('session.back')}</h3>
      </div>

      {/* 퀴즈 목록 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {grouped.map(group => (
          <div key={group.type}>
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
              <span>{tQuiz(`sectionLabel.${group.type}`)}</span>
              <span className="text-xs font-normal text-gray-400">
                {tQuiz('itemCount', { count: group.items.length })}
              </span>
            </h4>
            <div className="space-y-3">
              {group.items.map((quiz, idx) => {
                const key = `customize:${quiz.quiz_id}`
                const status = statusMap.get(key)
                const studentQuiz: StudentQuizItem = {
                  quiz_id: quiz.quiz_id,
                  quiz_type: quiz.quiz_type,
                  question: quiz.question,
                  answer: quiz.answer,
                  explanation: quiz.explanation,
                  difficulty: quiz.difficulty ?? null,
                  choices: quiz.choices,
                }
                return (
                  <StudentQuizCard
                    key={quiz.quiz_id}
                    quiz={studentQuiz}
                    index={idx}
                    isBookmarked={status?.bookmark ?? false}
                    isCorrect={status?.correct ?? null}
                    selectedAnswer={status?.answer ?? null}
                    onBookmarkToggle={handleBookmarkToggle}
                    onCorrectUpdate={handleCorrectUpdate}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
