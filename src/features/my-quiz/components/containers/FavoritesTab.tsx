/**
 * @file FavoritesTab.tsx
 * @description 즐겨찾기 탭 — 선택된 회차의 bookmark=true 퀴즈 유형별 그룹화
 * @module features/my-quiz
 * @dependencies next-intl, shared/components/quiz, myQuizStatusService
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, Star } from 'lucide-react'
import { StudentQuizCard } from '@/shared/components/quiz'
import type { StudentQuizItem } from '@/shared/components/quiz'
import { useToast } from '@/shared/hooks/useToast'
import * as statusService from '../../services/myQuizStatusService'
import type { QuizStatusEntry } from '../../types'
import { groupQuizzesByType } from '../../domain/groupQuizzes'
import type { QuizWithMeta, QuizGroup } from '../../domain/groupQuizzes'

interface FavoritesTabProps {
  selectedLectureId: string | null
}

const PAGE_SIZE = 20

export default function FavoritesTab({ selectedLectureId }: FavoritesTabProps) {
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
  const rewardCheckingRef = useRef(false)
  const isFetchingMoreRef = useRef(false)

  const fetchQuizzes = useCallback(async (currentOffset: number, append: boolean) => {
    if (!selectedLectureId) return

    if (append && isFetchingMoreRef.current) return
    if (append) isFetchingMoreRef.current = true

    if (currentOffset === 0) {
      setIsLoading(true)
      setError(null)
    }

    const statusResult = await statusService.getQuizStatusesByLecture(
      selectedLectureId,
      { bookmark: true },
      { limit: PAGE_SIZE, offset: currentOffset },
    )

    if (statusResult.error || !statusResult.data) {
      if (process.env.NODE_ENV === 'development') console.error('[FavoritesTab] fetchQuizzes error:', statusResult.error)
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

    // quiz_source별 분류
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
        console.error('[FavoritesTab] fetchQuizContent error:', instructorResult.error, customizeResult.error)
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
        quiz_source: 'instructor',
        bookmark: status?.bookmark ?? true,
        correct: status?.correct ?? null,
      })
    }

    for (const item of (customizeResult.data ?? [])) {
      const key = `customize:${item.quiz_id}`
      const status = statusMap.get(key)
      quizzesWithMeta.push({
        ...item,
        quiz_source: 'customize',
        bookmark: status?.bookmark ?? true,
        correct: status?.correct ?? null,
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
  }, [selectedLectureId, t, showErrorToast])

  // 회차 변경 시 리셋
  useEffect(() => {
    setAllQuizzes([])
    setGroups([])
    setOffset(0)
    setHasMore(true)
    setError(null)
    isFetchingMoreRef.current = false
    if (selectedLectureId) {
      fetchQuizzes(0, false)
    }
  }, [selectedLectureId]) // eslint-disable-line react-hooks/exhaustive-deps

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
      if (!quiz || !selectedLectureId) return

      // Optimistic: 즉시 제거
      const updated = allQuizzes.filter(q => q.quiz_id !== quizId)
      setAllQuizzes(updated)
      setGroups(groupQuizzesByType(updated))

      const result = await statusService.toggleBookmark(
        quiz.quiz_source,
        quizId,
        selectedLectureId,
        false,
      )

      if (result.error) {
        showErrorToast(t('error.bookmarkFailed'))
        // 롤백: refetch (R-AW-4)
        fetchQuizzes(0, false)
        setOffset(0)
        setHasMore(true)
      }
    },
    [allQuizzes, selectedLectureId, fetchQuizzes, showErrorToast, t],
  )

  const handleCorrectUpdate = useCallback(
    async (quizId: string, isCorrect: boolean) => {
      const quiz = allQuizzes.find(q => q.quiz_id === quizId)
      if (!quiz || !selectedLectureId) return

      // Optimistic update
      const updated = allQuizzes.map(q =>
        q.quiz_id === quizId ? { ...q, correct: isCorrect } : q,
      )
      setAllQuizzes(updated)
      setGroups(groupQuizzesByType(updated))

      const result = await statusService.updateCorrect(
        quiz.quiz_source,
        quizId,
        selectedLectureId,
        isCorrect,
      )

      if (result.error) {
        showErrorToast(t('error.correctFailed'))
        // 롤백: refetch로 통일 (R-AW-4)
        fetchQuizzes(0, false)
        setOffset(0)
        setHasMore(true)
        return
      }

      // 보상 판정 (instructor 퀴즈만, R-AW-5: try-finally)
      if (isCorrect && quiz.quiz_source === 'instructor' && !rewardCheckingRef.current) {
        rewardCheckingRef.current = true
        try {
          const allStatus = await statusService.getAllInstructorQuizStatuses(selectedLectureId)
          if (allStatus.data && allStatus.data.length > 0) {
            const allCorrect = allStatus.data.every(s => s.correct === true)
            if (allCorrect) {
              await statusService.grantReward(selectedLectureId)
            }
          }
        } finally {
          rewardCheckingRef.current = false
        }
      }
    },
    [allQuizzes, selectedLectureId, fetchQuizzes, showErrorToast, t],
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
        <Star className="h-8 w-8 stroke-[1.5]" />
        <p className="text-sm">{t('empty.noFavorites')}</p>
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
                  {/* quiz_source 뱃지 */}
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

      {/* 무한 스크롤 센티넬 */}
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
        </div>
      )}
    </div>
  )
}
