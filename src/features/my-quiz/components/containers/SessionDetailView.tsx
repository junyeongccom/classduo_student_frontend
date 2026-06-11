/**
 * @file SessionDetailView.tsx
 * @description 세션 상세 화면 — 퀴즈 목록을 quiz_type별 그룹화 + StudentQuizCard 렌더링
 * @module features/my-quiz
 * @dependencies next-intl, shared/components/quiz, myQuizService, myQuizStatusService
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslations, useFormatter, useLocale } from 'next-intl'
import { ArrowLeft, Loader2, CheckCircle2, XCircle, TrendingUp, Calendar } from 'lucide-react'
import { StudentQuizCard } from '@/shared/components/quiz'
import type { StudentQuizItem } from '@/shared/components/quiz'
import { cn } from '@/shared/lib/utils'
import { useToast } from '@/shared/hooks/useToast'
import { quizAnalytics } from '@/shared/lib/analytics'
import * as myQuizService from '../../services/myQuizService'
import * as statusService from '../../services/myQuizStatusService'
import { TYPE_ORDER } from '../../types'
import type { QuizItem, QuizStatusEntry, QuizSession } from '../../types'

/** locale이 'en'이고 _eng 필드가 있으면 영어, 아니면 한글 필드 반환 */
function pickLocalizedText(ko: string | null | undefined, eng: string | null | undefined, loc: string): string | null {
  if (loc === 'en' && eng != null && eng !== '') return eng
  return ko ?? null
}

interface SessionDetailViewProps {
  sessionId: string
  lectureId: string
  onBack: () => void
  courseName?: string
  lectureName?: string
  /** 세션 목록에서 이미 알고 있는 created_at (API 응답 fallback용) */
  createdAt?: string
}

export default function SessionDetailView({
  sessionId,
  lectureId,
  onBack,
  courseName,
  lectureName,
  createdAt: createdAtProp,
}: SessionDetailViewProps) {
  const t = useTranslations('myQuiz')
  const tQuiz = useTranslations('lectureStudy.quiz')
  const format = useFormatter()
  const locale = useLocale()
  const { toasts, error: showErrorToast } = useToast()

  const [quizzes, setQuizzes] = useState<QuizItem[]>([])
  const [sessionData, setSessionData] = useState<QuizSession | null>(null)
  const [statusMap, setStatusMap] = useState<Map<string, QuizStatusEntry>>(new Map())
  const [bookmarkSet, setBookmarkSet] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resetKey, setResetKey] = useState(0)

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
    setSessionData(detailResult.data.session ?? null)

    const statusResult = await statusService.getQuizStatusesByLecture(lectureId, {})
    if (statusResult.data) {
      const map = new Map<string, QuizStatusEntry>()
      for (const s of statusResult.data) {
        map.set(`${s.quiz_source}:${s.quiz_id}`, s)
      }
      setStatusMap(map)
    }

    const bookmarkResult = await statusService.getBookmarksByLectureIds([lectureId])
    if (bookmarkResult.data) {
      const bSet = new Set<string>()
      for (const b of bookmarkResult.data) {
        bSet.add(`${b.quiz_source}:${b.quiz_id}`)
      }
      setBookmarkSet(bSet)
    }

    setIsLoading(false)
  }, [sessionId, lectureId, t])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleBookmarkToggle = useCallback(
    async (quizId: string) => {
      const key = `customize:${quizId}`
      const isCurrentlyBookmarked = bookmarkSet.has(key)
      const newBookmark = !isCurrentlyBookmarked

      // Optimistic
      setBookmarkSet(prev => {
        const next = new Set(prev)
        if (newBookmark) next.add(key)
        else next.delete(key)
        return next
      })

      // 추가 시 현재 풀이 상태 복사
      const status = newBookmark ? statusMap.get(key) : undefined
      const result = await statusService.toggleBookmark(
        'customize', quizId, lectureId, newBookmark,
        status?.answer ?? null, status?.correct ?? null,
      )
      if (result.error) {
        showErrorToast(t('error.bookmarkFailed'))
        // 롤백
        setBookmarkSet(prev => {
          const next = new Set(prev)
          if (isCurrentlyBookmarked) next.add(key)
          else next.delete(key)
          return next
        })
      }
    },
    [bookmarkSet, lectureId, statusMap, showErrorToast, t],
  )

  const handleCorrectUpdate = useCallback(
    async (quizId: string, isCorrect: boolean, answer: number) => {
      quizAnalytics.answer(lectureId, { question_index: -1, correct: isCorrect, duration_ms: 0, quiz_type: 'customize' })

      const key = `customize:${quizId}`
      const current = statusMap.get(key)

      setStatusMap(prev => {
        const next = new Map(prev)
        next.set(key, {
          quiz_id: quizId,
          quiz_source: 'customize',
          lecture_id: lectureId,
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

  const handleResetAnswer = useCallback(
    async (quizId: string) => {
      const key = `customize:${quizId}`
      const current = statusMap.get(key)

      setStatusMap(prev => {
        const next = new Map(prev)
        next.set(key, {
          quiz_id: quizId,
          quiz_source: 'customize',
          lecture_id: lectureId,
          correct: null,
          answer: null,
        })
        return next
      })

      const result = await statusService.updateCorrect('customize', quizId, lectureId, null, null)
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

  const stats = useMemo(() => {
    let correct = 0
    let incorrect = 0
    let unanswered = 0

    for (const quiz of quizzes) {
      const key = `customize:${quiz.quiz_id}`
      const status = statusMap.get(key)
      if (status?.correct === true) correct++
      else if (status?.correct === false) incorrect++
      else unanswered++
    }

    const total = quizzes.length
    const answered = correct + incorrect
    const progressPercent = total > 0 ? Math.round((answered / total) * 100) : 0

    return { correct, incorrect, unanswered, total, answered, progressPercent }
  }, [quizzes, statusMap])

  // 표시용 회차 라벨 — 응답에 lecture_titles 가 있으면 우선 사용(다중 회차, 전체 표시).
  // 없으면 컨테이너가 내려준 lectureName prop 폴백(단일/하위 호환).
  const displayLectureName = useMemo(() => {
    const titles = sessionData?.lecture_titles
    if (titles && titles.length > 0) {
      // 선택한 회차 전체 제목 표시 (압축하지 않음)
      return titles.join(' · ')
    }
    const ids = sessionData?.lecture_ids
    if (ids && ids.length > 1) {
      // 제목이 없고 lecture_ids 만 있는 경우 개수만 표기 (이름 매핑은 컨테이너 prop 에 위임)
      return lectureName || t('session.multiLectureCount', { count: ids.length })
    }
    return lectureName
  }, [sessionData?.lecture_titles, sessionData?.lecture_ids, lectureName, t])

  const firstUnansweredId = useMemo(() => {
    for (const group of grouped) {
      for (const quiz of group.items) {
        const key = `customize:${quiz.quiz_id}`
        const status = statusMap.get(key)
        if (status?.correct == null) return quiz.quiz_id
      }
    }
    return null
  }, [grouped, statusMap])

  const handleContinue = useCallback(() => {
    if (!firstUnansweredId) return
    document.getElementById(`quiz-${firstUnansweredId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [firstUnansweredId])

  const handleRetryAll = useCallback(async () => {
    // Optimistic: reset all statuses + force re-mount cards
    setStatusMap(prev => {
      const next = new Map(prev)
      for (const quiz of quizzes) {
        const key = `customize:${quiz.quiz_id}`
        const existing = next.get(key)
        if (existing) {
          next.set(key, { ...existing, correct: null, answer: null })
        }
      }
      return next
    })
    setResetKey(prev => prev + 1)

    // Parallel API calls
    const results = await Promise.allSettled(
      quizzes.map(quiz =>
        statusService.updateCorrect('customize', quiz.quiz_id, lectureId, null, null)
      )
    )

    const hasError = results.some(r =>
      r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error)
    )
    if (hasError) {
      showErrorToast(t('error.correctFailed'))
      fetchData()
    }
  }, [quizzes, lectureId, t, showErrorToast, fetchData])

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
    <div className="flex h-full flex-col bg-gray-50 dark:bg-gray-950">
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
      {/* 헤더 — 흰색 바: 제목만 */}
      <div className="shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50">{t('session.detailTitle')}</h2>
        </div>
      </div>

      {/* 스크롤 영역: 세션 정보 + 통계 + 퀴즈 전체 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-2xl space-y-4">
          {/* 세션 정보 */}
          <div>
            {(() => {
              const dateStr = sessionData?.created_at ?? createdAtProp
              if (!dateStr) return null
              const d = new Date(dateStr)
              const y = d.getFullYear()
              const m = String(d.getMonth() + 1).padStart(2, '0')
              const day = String(d.getDate()).padStart(2, '0')
              return (
                <p className="text-xs text-gray-400 mb-1">
                  {`${y}. ${m}. ${day}`} {t('session.createdAt')}
                </p>
              )
            })()}
            {(courseName || displayLectureName) && (
              <p className="text-lg font-bold text-gray-900 dark:text-gray-50">
                {courseName}{courseName && displayLectureName ? ' · ' : ''}{displayLectureName} {t('session.title').replace('내 퀴즈 ', '')}
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('session.unitLabel')}: {displayLectureName || t('session.unknownUnit')} | {t('session.completionSummary', { total: stats.total, completed: stats.answered })}
            </p>
          </div>

          {/* 통계 카드 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">{t('session.correctCount')}</span>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-50">{stats.correct}</p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">{t('session.incorrectCount')}</span>
                <XCircle className="h-4 w-4 text-red-500" />
              </div>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-50">{stats.incorrect}</p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">{t('session.progressRate')}</span>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </div>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-50">{stats.progressPercent}%</p>
            </div>
          </div>

          {/* 퀴즈 목록 */}
          {grouped.map(group => (
            <div key={group.type}>
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                <span>{tQuiz(`sectionLabel.${group.type}`)}</span>
                <span className="text-xs font-normal text-gray-400">
                  {tQuiz('itemCount', { count: group.items.length })}
                </span>
              </h4>
              <div className="space-y-3">
                {group.items.map((quiz, idx) => {
                  const statusKey = `customize:${quiz.quiz_id}`
                  const status = statusMap.get(statusKey)
                  const studentQuiz: StudentQuizItem = {
                    quiz_id: quiz.quiz_id,
                    quiz_type: quiz.quiz_type,
                    question: pickLocalizedText(quiz.question, quiz.question_eng, locale) ?? quiz.question,
                    answer: pickLocalizedText(quiz.answer, quiz.answer_eng, locale) ?? quiz.answer ?? null,
                    explanation: pickLocalizedText(quiz.explanation, quiz.explanation_eng, locale) ?? quiz.explanation ?? null,
                    difficulty: quiz.difficulty ?? null,
                    // 출처 회차 번호 — 백엔드가 내려주면 카드 헤더에 "N주차" 배지 표시 (없으면 미표시)
                    lectureNo: quiz.lecture_no ?? null,
                    choices: quiz.choices.map(c => ({
                      ...c,
                      choice_text: pickLocalizedText(c.choice_text, c.choice_text_eng, locale) ?? c.choice_text,
                      choice_explanation: pickLocalizedText(c.choice_explanation, c.choice_explanation_eng, locale) ?? c.choice_explanation ?? null,
                    })),
                  }
                  return (
                    <div key={`${quiz.quiz_id}-${resetKey}`} id={`quiz-${quiz.quiz_id}`}>
                      <StudentQuizCard
                        quiz={studentQuiz}
                        index={idx}
                        isBookmarked={bookmarkSet.has(`customize:${quiz.quiz_id}`)}
                        isCorrect={status?.correct ?? null}
                        selectedAnswer={status?.answer ?? null}
                        onBookmarkToggle={handleBookmarkToggle}
                        onCorrectUpdate={handleCorrectUpdate}
                        onResetAnswer={handleResetAnswer}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 하단 액션 버튼 */}
      <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="mx-auto max-w-2xl space-y-2">
          <button
            type="button"
            onClick={handleContinue}
            disabled={firstUnansweredId === null}
            className={cn(
              'w-full rounded-xl py-3 text-sm font-semibold text-white transition',
              firstUnansweredId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed',
            )}
          >
            {t('session.continueUnanswered')}
          </button>
          <button
            type="button"
            onClick={handleRetryAll}
            className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 transition hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {t('session.retryAll')}
          </button>
        </div>
      </div>
    </div>
  )
}
