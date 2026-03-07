/**
 * @file WrongAnswersTab.tsx
 * @description 오답 탭 — 선택된 회차의 correct=false 퀴즈 유형별 그룹화
 * @module features/my-quiz
 * @dependencies next-intl, shared/components/quiz, myQuizStatusService
 */

'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Loader2, CheckCircle2, BookOpen, RotateCw, ArrowUpDown, ChevronDown } from 'lucide-react'
import { StudentQuizCard } from '@/shared/components/quiz'
import type { StudentQuizItem } from '@/shared/components/quiz'
import { useToast } from '@/shared/hooks/useToast'
import * as statusService from '../../services/myQuizStatusService'
import type { QuizStatusEntry } from '../../types'
import { groupQuizzesByCourseAndLecture } from '../../domain/groupQuizzes'
import type { QuizWithMeta, CourseGroup } from '../../domain/groupQuizzes'
import { BottomDropdown, MultiSelectDropdown } from '../ui/LectureSelectorBar'

interface SelectOption {
  value: string
  label: string
}

interface WrongAnswersTabProps {
  selectedLectureIds: string[]
  lectureInfoMap: Map<string, { course_id: string; course_name: string; lecture_name: string }>
  courseOptions: SelectOption[]
  lectureOptions: SelectOption[]
  selectedCourseId: string | null
  onCourseChange: (courseId: string) => void
  selectedLectureIds_multi: string[]
  onLectureToggle: (lectureId: string) => void
  onSelectAllLectures: () => void
  onClearLectureIds: () => void
  isLoading?: boolean
  hasCourses: boolean
}

const PAGE_SIZE = 20
const INITIAL_DISPLAY_COUNT = 5

/** locale이 'en'이고 _eng 필드가 있으면 영어, 아니면 한글 필드 반환 */
function pickLocalizedText(ko: string | null | undefined, eng: string | null | undefined, locale: string): string | null {
  if (locale === 'en' && eng != null && eng !== '') return eng
  return ko ?? null
}

export default function WrongAnswersTab({
  selectedLectureIds,
  lectureInfoMap,
  courseOptions,
  lectureOptions,
  selectedCourseId,
  onCourseChange,
  selectedLectureIds_multi,
  onLectureToggle,
  onSelectAllLectures,
  onClearLectureIds,
  isLoading: selectorLoading,
  hasCourses,
}: WrongAnswersTabProps) {
  const t = useTranslations('myQuiz')
  const tQuiz = useTranslations('lectureStudy.quiz')
  const locale = useLocale()
  const { toasts, error: showErrorToast } = useToast()

  const [allQuizzes, setAllQuizzes] = useState<QuizWithMeta[]>([])
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const isFetchingMoreRef = useRef(false)
  const [displayCount, setDisplayCount] = useState(INITIAL_DISPLAY_COUNT)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetKey, setResetKey] = useState(0)

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
      { incorrect_save: true },
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
    const contentIds = statuses.filter(s => s.quiz_source === 'content').map(s => s.quiz_id)

    const [instructorResult, customizeResult, contentResult] = await Promise.all([
      instructorIds.length > 0
        ? statusService.fetchQuizContent(instructorIds, 'instructor')
        : { data: [], error: null },
      customizeIds.length > 0
        ? statusService.fetchQuizContent(customizeIds, 'customize')
        : { data: [], error: null },
      contentIds.length > 0
        ? statusService.fetchQuizContent(contentIds, 'content')
        : { data: [], error: null },
    ])

    // fetchQuizContent 에러 체크 (QA-AW-1)
    if (instructorResult.error || customizeResult.error || contentResult.error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[WrongAnswersTab] fetchQuizContent error:', instructorResult.error, customizeResult.error, contentResult.error)
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
      const info = lectureInfoMap.get(status?.lecture_id ?? '')
      quizzesWithMeta.push({
        ...item,
        difficulty: item.difficulty ?? null,
        quiz_source: 'instructor',
        lecture_id: status?.lecture_id,
        bookmark: status?.bookmark ?? false,
        correct: status?.correct ?? null,
        selected_answer: status?.answer ?? null,
        course_id: info?.course_id,
        course_name: info?.course_name,
        lecture_name: info?.lecture_name,
      })
    }

    for (const item of (contentResult.data ?? [])) {
      const key = `content:${item.quiz_id}`
      const status = statusMap.get(key)
      const info = lectureInfoMap.get(status?.lecture_id ?? '')
      quizzesWithMeta.push({
        ...item,
        difficulty: item.difficulty ?? null,
        quiz_source: 'content',
        lecture_id: status?.lecture_id,
        bookmark: status?.bookmark ?? false,
        correct: status?.correct ?? null,
        selected_answer: status?.answer ?? null,
        course_id: info?.course_id,
        course_name: info?.course_name,
        lecture_name: info?.lecture_name,
      })
    }

    for (const item of (customizeResult.data ?? [])) {
      const key = `customize:${item.quiz_id}`
      const status = statusMap.get(key)
      const info = lectureInfoMap.get(status?.lecture_id ?? '')
      quizzesWithMeta.push({
        ...item,
        difficulty: item.difficulty ?? null,
        quiz_source: 'customize',
        lecture_id: status?.lecture_id,
        bookmark: status?.bookmark ?? false,
        correct: status?.correct ?? null,
        selected_answer: status?.answer ?? null,
        course_id: info?.course_id,
        course_name: info?.course_name,
        lecture_name: info?.lecture_name,
      })
    }

    // 함수형 업데이트로 allQuizzes를 deps에서 제거 (R-AW-10)
    setAllQuizzes(prev => append ? [...prev, ...quizzesWithMeta] : quizzesWithMeta)
    setIsLoading(false)
    if (append) isFetchingMoreRef.current = false
  }, [selectedLectureIds, t, showErrorToast, lectureInfoMap])

  // 회차 변경 시 리셋 (배열 참조 변경 방지를 위해 JSON.stringify 비교)
  const lectureIdsKey = JSON.stringify(selectedLectureIds)
  useEffect(() => {
    setAllQuizzes([])
    setOffset(0)
    setHasMore(true)
    setError(null)
    setDisplayCount(INITIAL_DISPLAY_COUNT)
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

  // sortOrder 또는 allQuizzes 변경 시 courseGroups 동기 재생성 (useMemo)
  const courseGroups = useMemo(() => {
    if (allQuizzes.length === 0) return []
    const sorted = [...allQuizzes].sort((a, b) => {
      const dateA = new Date(a.created_at ?? 0).getTime()
      const dateB = new Date(b.created_at ?? 0).getTime()
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB
    })
    return groupQuizzesByCourseAndLecture(sorted)
  }, [sortOrder, allQuizzes])

  // 표시 갯수 제한된 그룹 생성
  const { visibleGroups, totalQuizCount, shownQuizCount } = useMemo(() => {
    let count = 0
    const totalCount = courseGroups.reduce(
      (sum, cg) => sum + cg.lectureGroups.reduce(
        (lSum, lg) => lSum + lg.typeGroups.reduce(
          (tSum, tg) => tSum + tg.items.length, 0
        ), 0
      ), 0
    )

    const limited: CourseGroup[] = []
    for (const cg of courseGroups) {
      if (count >= displayCount) break
      const limitedLectures = []
      for (const lg of cg.lectureGroups) {
        if (count >= displayCount) break
        const limitedTypes = []
        for (const tg of lg.typeGroups) {
          if (count >= displayCount) break
          const remaining = displayCount - count
          const items = tg.items.slice(0, remaining)
          limitedTypes.push({ ...tg, items })
          count += items.length
        }
        if (limitedTypes.length > 0) {
          limitedLectures.push({ ...lg, typeGroups: limitedTypes })
        }
      }
      if (limitedLectures.length > 0) {
        limited.push({ ...cg, lectureGroups: limitedLectures })
      }
    }

    return { visibleGroups: limited, totalQuizCount: totalCount, shownQuizCount: count }
  }, [courseGroups, displayCount])

  const handleRetryWrong = useCallback(() => {
    if (allQuizzes.length === 0) return

    // 즉시 팝업 닫기 + optimistic 초기화 + 카드 re-mount
    setShowResetConfirm(false)
    setAllQuizzes(prev => prev.map(q => ({ ...q, correct: null, selected_answer: null })))
    setResetKey(prev => prev + 1)

    // 첫 번째 퀴즈로 스크롤
    const firstId = allQuizzes[0]?.quiz_id
    if (firstId) {
      setTimeout(() => {
        document.getElementById(`quiz-${firstId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    }

    // API 백그라운드 호출
    const quizSnapshot = [...allQuizzes]
    Promise.allSettled(
      quizSnapshot.map(quiz =>
        quiz.lecture_id
          ? statusService.updateCorrect(quiz.quiz_source, quiz.quiz_id, quiz.lecture_id, null, null)
          : Promise.resolve({ error: null }),
      ),
    ).then(results => {
      const hasError = results.some(
        r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value && 'error' in r.value && r.value.error),
      )
      if (hasError) {
        showErrorToast(t('error.correctFailed'))
        fetchQuizzes(0, false)
        setOffset(0)
        setHasMore(true)
      }
    })
  }, [allQuizzes, fetchQuizzes, showErrorToast, t])

  const handleBookmarkToggle = useCallback(
    async (quizId: string) => {
      const quiz = allQuizzes.find(q => q.quiz_id === quizId)
      if (!quiz || !quiz.lecture_id) return

      const newBookmark = !quiz.bookmark
      const updated = allQuizzes.map(q =>
        q.quiz_id === quizId ? { ...q, bookmark: newBookmark } : q,
      )
      setAllQuizzes(updated)

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

  const handleDismissWrongNote = useCallback(
    async (quizId: string) => {
      const quiz = allQuizzes.find(q => q.quiz_id === quizId)
      if (!quiz) return

      // correct=false면 삭제 불가 (UI에서도 비활성이지만 이중 방어)
      if (quiz.correct === false) return

      // Optimistic: 목록에서 즉시 제거
      const updated = allQuizzes.filter(q => q.quiz_id !== quizId)
      setAllQuizzes(updated)

      const result = await statusService.dismissIncorrectSave(
        quiz.quiz_source,
        quizId,
      )

      if (result.error) {
        showErrorToast(t('error.dismissFailed'))
        // 롤백: refetch
        fetchQuizzes(0, false)
        setOffset(0)
        setHasMore(true)
      }
    },
    [allQuizzes, fetchQuizzes, showErrorToast, t],
  )

  const renderContent = () => {
    if (selectedLectureIds.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
            <CheckCircle2 className="h-7 w-7 stroke-[1.5] text-green-400" />
          </div>
          <p className="text-sm">{t('empty.noWrong')}</p>
          <p className="text-xs text-gray-300">{t('empty.wrongGuide')}</p>
        </div>
      )
    }

    if (isLoading && allQuizzes.length === 0) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
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

    if (courseGroups.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
            <CheckCircle2 className="h-7 w-7 stroke-[1.5] text-green-400" />
          </div>
          <p className="text-sm">{t('empty.noWrong')}</p>
          <p className="text-xs text-gray-300">{t('empty.wrongGuide')}</p>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {visibleGroups.map(courseGroup => (
          <section key={courseGroup.course_id} className="space-y-4">
            <h3 className="flex items-center gap-2 text-base font-bold text-gray-800">
              <BookOpen className="h-4 w-4 text-blue-500" />
              {courseGroup.course_name}
            </h3>
            {courseGroup.lectureGroups.map(lectureGroup => (
              <div key={lectureGroup.lecture_id} className="space-y-3 pl-2">
                <h4 className="text-sm font-semibold text-gray-600 border-l-2 border-blue-400 pl-2">
                  {lectureGroup.lecture_name}
                </h4>
                {lectureGroup.typeGroups.map(typeGroup => (
                  <div key={typeGroup.type}>
                    <h5 className="mb-2 flex items-center gap-2 text-xs font-semibold text-gray-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                      {tQuiz(`sectionLabel.${typeGroup.type}`)}
                      <span className="text-xs font-normal text-gray-400">
                        {tQuiz('itemCount', { count: typeGroup.items.length })}
                      </span>
                    </h5>
                    <div className="space-y-3">
                      {typeGroup.items.map((quiz, idx) => {
                        const studentQuiz: StudentQuizItem = {
                          quiz_id: quiz.quiz_id,
                          quiz_type: quiz.quiz_type,
                          question: pickLocalizedText(quiz.question, quiz.question_eng, locale) ?? quiz.question,
                          answer: pickLocalizedText(quiz.answer, quiz.answer_eng, locale) ?? quiz.answer ?? null,
                          explanation: pickLocalizedText(quiz.explanation, quiz.explanation_eng, locale) ?? quiz.explanation ?? null,
                          difficulty: quiz.difficulty,
                          choices: quiz.choices.map(c => ({
                            ...c,
                            choice_text: pickLocalizedText(c.choice_text, c.choice_text_eng, locale) ?? c.choice_text,
                            choice_explanation: pickLocalizedText(c.choice_explanation, c.choice_explanation_eng, locale) ?? c.choice_explanation ?? null,
                          })),
                        }
                        return (
                          <div key={`${quiz.quiz_id}-${resetKey}`} id={`quiz-${quiz.quiz_id}`}>
                            <div className="mb-1">
                              <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                quiz.quiz_source === 'instructor'
                                  ? 'bg-purple-50 text-purple-600'
                                  : quiz.quiz_source === 'content'
                                    ? 'bg-teal-50 text-teal-600'
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
                              wrongNoteMode
                              onDismissWrongNote={handleDismissWrongNote}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </section>
        ))}

        {/* 카운터 텍스트 + 더 보기 버튼 */}
        {totalQuizCount > 0 && (
          <div className="flex flex-col items-center gap-2 py-4">
            <p className="text-xs text-gray-400">
              {t('wrong.showingCount', { total: totalQuizCount, showing: shownQuizCount })}
            </p>
            {shownQuizCount < totalQuizCount && (
              <button
                type="button"
                onClick={() => {
                  setDisplayCount(prev => prev + 5)
                  // 서버에서 더 가져올 필요가 있으면 fetch
                  if (hasMore && shownQuizCount >= allQuizzes.length - 2) {
                    const nextOffset = offset + PAGE_SIZE
                    setOffset(nextOffset)
                    fetchQuizzes(nextOffset, true)
                  }
                }}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm text-gray-600 transition hover:border-blue-300 hover:shadow-sm"
              >
                <ChevronDown className="h-4 w-4" />
                {t('wrong.showMore')}
              </button>
            )}
          </div>
        )}

        {/* 무한 스크롤 센티넬 */}
        {hasMore && (
          <div ref={sentinelRef} className="h-1" />
        )}
      </div>
    )
  }

  return (
    <div className="relative p-4 space-y-6 bg-gray-50 min-h-full">
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

      {/* 초기화 확인 팝업 */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
            <p className="text-sm text-gray-700 text-center">{t('wrong.resetConfirmMessage')}</p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
              >
                {t('wrong.resetCancel')}
              </button>
              <button
                type="button"
                onClick={handleRetryWrong}
                className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                {t('wrong.resetConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-2xl">
      {/* 제목 + 설명 */}
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900">{t('wrong.title')}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{t('wrong.description')}</p>
      </div>

      {/* 드롭다운 + 정렬 + 학습 시작 */}
      <div className="flex items-center gap-3 mb-6">
        <BottomDropdown
          value={selectedCourseId}
          options={courseOptions}
          placeholder={t('selector.selectCourse')}
          onChange={onCourseChange}
          isLoading={selectorLoading}
          loadingLabel={t('selector.loading')}
          emptyLabel={t('selector.noCourses')}
        />
        <MultiSelectDropdown
          options={lectureOptions}
          selectedIds={selectedLectureIds_multi}
          placeholder={t('selector.selectLecture')}
          onToggle={onLectureToggle}
          onSelectAll={onSelectAllLectures}
          onClearAll={onClearLectureIds}
          disabled={!selectedCourseId}
          selectAllLabel={t('selector.selectAll')}
          clearAllLabel={t('selector.clearAll')}
          countLabel={(count) => t('selector.lectureCount', { count })}
        />
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <ArrowUpDown className="h-3.5 w-3.5" />
            <select
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value as 'newest' | 'oldest')}
              className="bg-transparent border-none text-xs text-gray-500 focus:outline-none cursor-pointer"
            >
              <option value="newest">{t('sort.newest')}</option>
              <option value="oldest">{t('sort.oldest')}</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            disabled={allQuizzes.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed shrink-0"
          >
            <RotateCw className="h-4 w-4" />
            {t('wrong.retryWrong')}
          </button>
        </div>
      </div>

      {renderContent()}

      </div>
    </div>
  )
}
