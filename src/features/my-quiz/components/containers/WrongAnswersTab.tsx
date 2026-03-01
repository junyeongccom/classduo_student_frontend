/**
 * @file WrongAnswersTab.tsx
 * @description 오답 탭 — 선택된 회차의 correct=false 퀴즈 유형별 그룹화
 * @module features/my-quiz
 * @dependencies next-intl, shared/components/quiz, myQuizStatusService
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, CheckCircle2, ChevronUp } from 'lucide-react'
import { StudentQuizCard } from '@/shared/components/quiz'
import type { StudentQuizItem } from '@/shared/components/quiz'
import { useToast } from '@/shared/hooks/useToast'
import * as statusService from '../../services/myQuizStatusService'
import type { QuizStatusEntry } from '../../types'
import { groupQuizzesByType } from '../../domain/groupQuizzes'
import type { QuizWithMeta, QuizGroup } from '../../domain/groupQuizzes'

interface WrongAnswersTabProps {
  selectedLectureIds: string[]
}

const PAGE_SIZE = 20

export default function WrongAnswersTab({ selectedLectureIds }: WrongAnswersTabProps) {
  const t = useTranslations('myQuiz')
  const tQuiz = useTranslations('lectureStudy.quiz')
  const { toasts, error: showErrorToast } = useToast()

  const [groups, setGroups] = useState<QuizGroup[]>([])
  const [allQuizzes, setAllQuizzes] = useState<QuizWithMeta[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const isFetchingMoreRef = useRef(false)

  const fetchQuizzes = useCallback(async (currentOffset: number, append: boolean) => {
    if (selectedLectureIds.length === 0) return

    if (append && isFetchingMoreRef.current) return
    if (append) isFetchingMoreRef.current = true

    if (currentOffset === 0) {
      setIsLoading(true)
      setError(null)
    }

    const statusResult = await statusService.getQuizStatusesByLectureIds(
      selectedLectureIds,
      { correct: false },
      { limit: PAGE_SIZE, offset: currentOffset },
    )

    if (statusResult.error || !statusResult.data) {
      if (process.env.NODE_ENV === 'development') console.error('[WrongAnswersTab] fetchQuizzes error:', statusResult.error)
      setError(t('error.loadFailed'))
      setIsLoading(false)
      if (append) isFetchingMoreRef.current = false
      return
    }

    const statuses = statusResult.data
    if (statuses.length < PAGE_SIZE) setHasMore(false)

    if (statuses.length === 0) {
      if (!append) setAllQuizzes([])
      setIsLoading(false)
      if (append) isFetchingMoreRef.current = false
      return
    }

    const instructorIds = statuses.filter(s => s.quiz_source === 'instructor').map(s => s.quiz_id)
    const customizeIds = statuses.filter(s => s.quiz_source === 'customize').map(s => s.quiz_id)

    const [instructorResult, customizeResult] = await Promise.all([
      instructorIds.length > 0
        ? statusService.fetchQuizContent(instructorIds, 'instructor')
        : { data: [], error: null },
      customizeIds.length > 0
        ? statusService.fetchQuizContent(customizeIds, 'customize')
        : { data: [], error: null },
    ])

    // fetchQuizContent 에러 체크 (QA-AW-1)
    if (instructorResult.error || customizeResult.error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[WrongAnswersTab] fetchQuizContent error:', instructorResult.error, customizeResult.error)
      }
      showErrorToast(t('error.loadFailed'))
    }

    const statusMap = new Map<string, QuizStatusEntry>()
    for (const s of statuses) {
      statusMap.set(`${s.quiz_source}:${s.quiz_id}`, s)
    }

    const quizzesWithMeta: QuizWithMeta[] = []

    for (const item of (instructorResult.data ?? [])) {
      const key = `instructor:${item.quiz_id}`
      const status = statusMap.get(key)
      quizzesWithMeta.push({
        ...item,
        difficulty: item.difficulty ?? null,
        quiz_source: 'instructor',
        lecture_id: status?.lecture_id,
        bookmark: status?.bookmark ?? false,
        correct: status?.correct ?? false,
        selected_answer: status?.answer ?? null,
      })
    }

    for (const item of (customizeResult.data ?? [])) {
      const key = `customize:${item.quiz_id}`
      const status = statusMap.get(key)
      quizzesWithMeta.push({
        ...item,
        difficulty: item.difficulty ?? null,
        quiz_source: 'customize',
        lecture_id: status?.lecture_id,
        bookmark: status?.bookmark ?? false,
        correct: status?.correct ?? false,
        selected_answer: status?.answer ?? null,
      })
    }

    // 함수형 업데이트로 allQuizzes를 deps에서 제거 (R-AW-10)
    setAllQuizzes(prev => {
      const updated = append ? [...prev, ...quizzesWithMeta] : quizzesWithMeta
      setGroups(groupQuizzesByType(updated))
      return updated
    })
    setIsLoading(false)
    if (append) isFetchingMoreRef.current = false
  }, [selectedLectureIds, t, showErrorToast])

  // 회차 변경 시 리셋 (배열 참조 변경 방지를 위해 JSON.stringify 비교)
  const lectureIdsKey = JSON.stringify(selectedLectureIds)
  useEffect(() => {
    setAllQuizzes([])
    setGroups([])
    setOffset(0)
    setHasMore(true)
    setError(null)
    isFetchingMoreRef.current = false
    if (selectedLectureIds.length > 0) {
      fetchQuizzes(0, false)
    }
  }, [lectureIdsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // 무한 스크롤 IntersectionObserver (R-AW-10: isFetchingMoreRef로 중복 방지)
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || isLoading) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting && hasMore && !isLoading && !isFetchingMoreRef.current) {
          const nextOffset = offset + PAGE_SIZE
          setOffset(nextOffset)
          fetchQuizzes(nextOffset, true)
        }
      },
      { threshold: 0.1 },
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, isLoading, offset, fetchQuizzes])

  const handleBookmarkToggle = useCallback(
    async (quizId: string) => {
      const quiz = allQuizzes.find(q => q.quiz_id === quizId)
      if (!quiz || !quiz.lecture_id) return

      const newBookmark = !quiz.bookmark
      const updated = allQuizzes.map(q =>
        q.quiz_id === quizId ? { ...q, bookmark: newBookmark } : q,
      )
      setAllQuizzes(updated)
      setGroups(groupQuizzesByType(updated))

      const result = await statusService.toggleBookmark(
        quiz.quiz_source,
        quizId,
        quiz.lecture_id,
        newBookmark,
      )

      if (result.error) {
        showErrorToast(t('error.bookmarkFailed'))
        // 롤백: refetch로 통일 (R-AW-4)
        fetchQuizzes(0, false)
        setOffset(0)
        setHasMore(true)
      }
    },
    [allQuizzes, fetchQuizzes, showErrorToast, t],
  )

  const handleCorrectUpdate = useCallback(
    async (quizId: string, isCorrect: boolean, answer: number) => {
      const quiz = allQuizzes.find(q => q.quiz_id === quizId)
      if (!quiz || !quiz.lecture_id) return

      const updated = allQuizzes.map(q =>
        q.quiz_id === quizId ? { ...q, correct: isCorrect, selected_answer: answer } : q,
      )
      setAllQuizzes(updated)
      setGroups(groupQuizzesByType(updated))

      const result = await statusService.updateCorrect(
        quiz.quiz_source,
        quizId,
        quiz.lecture_id,
        isCorrect,
        answer,
      )

      if (result.error) {
        showErrorToast(t('error.correctFailed'))
        // 롤백: refetch (R-AW-4)
        fetchQuizzes(0, false)
        setOffset(0)
        setHasMore(true)
        return
      }

    },
    [allQuizzes, fetchQuizzes, showErrorToast, t],
  )

  const handleResetAnswer = useCallback(
    async (quizId: string) => {
      const quiz = allQuizzes.find(q => q.quiz_id === quizId)
      if (!quiz || !quiz.lecture_id) return

      const updated = allQuizzes.map(q =>
        q.quiz_id === quizId ? { ...q, correct: null, selected_answer: null } : q,
      )
      setAllQuizzes(updated)
      setGroups(groupQuizzesByType(updated))

      const result = await statusService.updateCorrect(
        quiz.quiz_source,
        quizId,
        quiz.lecture_id,
        null,
        null,
      )

      if (result.error) {
        showErrorToast(t('error.correctFailed'))
        fetchQuizzes(0, false)
        setOffset(0)
        setHasMore(true)
      }
    },
    [allQuizzes, fetchQuizzes, showErrorToast, t],
  )

  if (selectedLectureIds.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-400 px-6">
        <ChevronUp className="h-10 w-10 stroke-[1.5]" />
        <p className="text-sm text-center">{t('empty.selectLecture')}</p>
      </div>
    )
  }

  if (isLoading && allQuizzes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <p className="text-sm text-red-500">{error}</p>
        <button
          type="button"
          onClick={() => { setOffset(0); setHasMore(true); fetchQuizzes(0, false) }}
          className="text-xs text-indigo-600 hover:underline"
        >
          {t('error.retry')}
        </button>
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-400">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
          <CheckCircle2 className="h-7 w-7 stroke-[1.5] text-green-400" />
        </div>
        <p className="text-sm">{t('empty.noWrong')}</p>
        <p className="text-xs text-gray-300">{t('empty.wrongGuide')}</p>
      </div>
    )
  }

  return (
    <div className="relative p-4 space-y-6">
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

      <div className="mx-auto max-w-xl space-y-6">
      {groups.map(group => (
        <div key={group.type}>
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <span>{tQuiz(`sectionLabel.${group.type}`)}</span>
            <span className="text-xs font-normal text-gray-400">
              {tQuiz('itemCount', { count: group.items.length })}
            </span>
          </h4>
          <div className="space-y-3">
            {group.items.map((quiz, idx) => {
              const studentQuiz: StudentQuizItem = {
                quiz_id: quiz.quiz_id,
                quiz_type: quiz.quiz_type,
                question: quiz.question,
                answer: quiz.answer,
                explanation: quiz.explanation,
                difficulty: quiz.difficulty,
                choices: quiz.choices,
              }
              return (
                <div key={quiz.quiz_id}>
                  <div className="mb-1">
                    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      quiz.quiz_source === 'instructor'
                        ? 'bg-purple-50 text-purple-600'
                        : 'bg-indigo-50 text-indigo-600'
                    }`}>
                      {t(`quizSource.${quiz.quiz_source}`)}
                    </span>
                  </div>
                  <StudentQuizCard
                    quiz={studentQuiz}
                    index={idx}
                    isBookmarked={quiz.bookmark}
                    isCorrect={quiz.correct}
                    selectedAnswer={quiz.selected_answer}
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

      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
        </div>
      )}
      </div>
    </div>
  )
}
