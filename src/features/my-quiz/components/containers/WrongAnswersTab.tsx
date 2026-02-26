/**
 * @file WrongAnswersTab.tsx
 * @description 오답 탭 — 선택된 회차의 correct=false 퀴즈 유형별 그룹화
 * @module features/my-quiz
 * @dependencies next-intl, shared/components/quiz, myQuizStatusService
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { StudentQuizCard } from '@/shared/components/quiz'
import type { StudentQuizItem } from '@/shared/components/quiz'
import * as statusService from '../../services/myQuizStatusService'
import type { QuizStatusEntry } from '../../types'
import { groupQuizzesByType } from '../../domain/groupQuizzes'
import type { QuizWithMeta, QuizGroup } from '../../domain/groupQuizzes'

interface WrongAnswersTabProps {
  selectedLectureId: string | null
}

const PAGE_SIZE = 20

export default function WrongAnswersTab({ selectedLectureId }: WrongAnswersTabProps) {
  const t = useTranslations('myQuiz')
  const tQuiz = useTranslations('lectureStudy.quiz')

  const [groups, setGroups] = useState<QuizGroup[]>([])
  const [allQuizzes, setAllQuizzes] = useState<QuizWithMeta[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const rewardCheckingRef = useRef(false)

  const fetchQuizzes = useCallback(async (currentOffset: number, append: boolean) => {
    if (!selectedLectureId) return

    if (currentOffset === 0) {
      setIsLoading(true)
      setError(null)
    }

    const statusResult = await statusService.getQuizStatusesByLecture(
      selectedLectureId,
      { correct: false },
      { limit: PAGE_SIZE, offset: currentOffset },
    )

    if (statusResult.error || !statusResult.data) {
      setError(statusResult.error?.message ?? t('error.loadFailed'))
      setIsLoading(false)
      return
    }

    const statuses = statusResult.data
    if (statuses.length < PAGE_SIZE) setHasMore(false)

    if (statuses.length === 0) {
      if (!append) setAllQuizzes([])
      setIsLoading(false)
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
        quiz_source: 'instructor',
        bookmark: status?.bookmark ?? false,
        correct: status?.correct ?? false,
      })
    }

    for (const item of (customizeResult.data ?? [])) {
      const key = `customize:${item.quiz_id}`
      const status = statusMap.get(key)
      quizzesWithMeta.push({
        ...item,
        quiz_source: 'customize',
        bookmark: status?.bookmark ?? false,
        correct: status?.correct ?? false,
      })
    }

    const updated = append ? [...allQuizzes, ...quizzesWithMeta] : quizzesWithMeta
    setAllQuizzes(updated)
    setGroups(groupQuizzesByType(updated))
    setIsLoading(false)
  }, [selectedLectureId, allQuizzes, t])

  useEffect(() => {
    setAllQuizzes([])
    setGroups([])
    setOffset(0)
    setHasMore(true)
    setError(null)
    if (selectedLectureId) {
      fetchQuizzes(0, false)
    }
  }, [selectedLectureId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!sentinelRef.current || !hasMore || isLoading) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting && hasMore && !isLoading) {
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
      if (!quiz || !selectedLectureId) return

      const newBookmark = !quiz.bookmark
      const updated = allQuizzes.map(q =>
        q.quiz_id === quizId ? { ...q, bookmark: newBookmark } : q,
      )
      setAllQuizzes(updated)
      setGroups(groupQuizzesByType(updated))

      const result = await statusService.toggleBookmark(
        quiz.quiz_source,
        quizId,
        selectedLectureId,
        newBookmark,
      )

      if (result.error) {
        setAllQuizzes(allQuizzes)
        setGroups(groupQuizzesByType(allQuizzes))
      }
    },
    [allQuizzes, selectedLectureId],
  )

  const handleCorrectUpdate = useCallback(
    async (quizId: string, isCorrect: boolean) => {
      const quiz = allQuizzes.find(q => q.quiz_id === quizId)
      if (!quiz || !selectedLectureId) return

      if (isCorrect) {
        // Optimistic: 오답→정답이면 즉시 제거
        const updated = allQuizzes.filter(q => q.quiz_id !== quizId)
        setAllQuizzes(updated)
        setGroups(groupQuizzesByType(updated))
      } else {
        const updated = allQuizzes.map(q =>
          q.quiz_id === quizId ? { ...q, correct: false } : q,
        )
        setAllQuizzes(updated)
        setGroups(groupQuizzesByType(updated))
      }

      const result = await statusService.updateCorrect(
        quiz.quiz_source,
        quizId,
        selectedLectureId,
        isCorrect,
      )

      if (result.error) {
        // 롤백
        fetchQuizzes(0, false)
        setOffset(0)
        setHasMore(true)
        return
      }

      // 보상 판정 (instructor 퀴즈만)
      if (isCorrect && quiz.quiz_source === 'instructor' && !rewardCheckingRef.current) {
        rewardCheckingRef.current = true
        const allStatus = await statusService.getAllInstructorQuizStatuses(selectedLectureId)
        if (allStatus.data && allStatus.data.length > 0) {
          const allCorrectNow = allStatus.data.every(s => s.correct === true)
          if (allCorrectNow) {
            await statusService.grantReward(selectedLectureId)
          }
        }
        rewardCheckingRef.current = false
      }
    },
    [allQuizzes, selectedLectureId, fetchQuizzes],
  )

  if (!selectedLectureId) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400">
        <p className="text-sm">{t('empty.selectLecture')}</p>
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
      <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-400">
        <CheckCircle2 className="h-8 w-8 stroke-[1.5]" />
        <p className="text-sm">{t('empty.noWrong')}</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6">
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
                    onBookmarkToggle={handleBookmarkToggle}
                    onCorrectUpdate={handleCorrectUpdate}
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
  )
}
