/**
 * @file WrongAnswersTab.tsx
 * @description 오답 탭 — user_quiz_response 기반 한 번이라도 틀린 quiz를 유형별 그룹화
 * @module features/my-quiz
 * @dependencies next-intl, shared/components/quiz, myQuizStatusService
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Loader2, CheckCircle2, BookOpen, RotateCw, ArrowUpDown, ChevronDown } from 'lucide-react'
import { StudentQuizCard } from '@/shared/components/quiz'
import type { StudentQuizItem } from '@/shared/components/quiz'
import { useToast } from '@/shared/hooks/useToast'
import { quizAnalytics } from '@/shared/lib/analytics'
import * as statusService from '../../services/myQuizStatusService'
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
}: WrongAnswersTabProps) {
  const t = useTranslations('myQuiz')
  const tQuiz = useTranslations('lectureStudy.quiz')
  const locale = useLocale()
  const { toasts, error: showErrorToast } = useToast()

  const [allQuizzes, setAllQuizzes] = useState<QuizWithMeta[]>([])
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [displayCount, setDisplayCount] = useState(INITIAL_DISPLAY_COUNT)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetKey, setResetKey] = useState(0)

  const fetchQuizzes = useCallback(async () => {
    if (selectedLectureIds.length === 0) return

    setIsLoading(true)
    setError(null)

    // user_quiz_response 기반 — 한 번이라도 is_correct=false 였던 (quiz_source, quiz_id) DISTINCT 묶음
    // exam_prep 은 별도 테이블(exam_prep_response) 에 저장되므로 별도 fetch 후 merge.
    const [incorrectResult, examPrepIncorrectResult] = await Promise.all([
      statusService.fetchIncorrectQuizIdsByLectureIds(selectedLectureIds),
      statusService.fetchExamPrepIncorrectsByLectureIds(selectedLectureIds),
    ])

    if (incorrectResult.error || !incorrectResult.data) {
      if (process.env.NODE_ENV === 'development') console.error('[WrongAnswersTab] fetchQuizzes error:', incorrectResult.error)
      setError(t('error.loadFailed'))
      setIsLoading(false)
      return
    }

    const incorrects = [
      ...(incorrectResult.data ?? []),
      ...(examPrepIncorrectResult.data ?? []),
    ]

    if (incorrects.length === 0) {
      setAllQuizzes([])
      setIsLoading(false)
      return
    }

    const instructorIds = incorrects.filter(s => s.quiz_source === 'instructor').map(s => s.quiz_id)
    const customizeIds = incorrects.filter(s => s.quiz_source === 'customize').map(s => s.quiz_id)
    const contentIds = incorrects.filter(s => s.quiz_source === 'content').map(s => s.quiz_id)
    const examPrepIds = incorrects.filter(s => s.quiz_source === 'exam_prep').map(s => s.quiz_id)

    const [instructorResult, customizeResult, contentResult, examPrepResult] = await Promise.all([
      instructorIds.length > 0
        ? statusService.fetchQuizContent(instructorIds, 'instructor')
        : { data: [], error: null },
      customizeIds.length > 0
        ? statusService.fetchQuizContent(customizeIds, 'customize')
        : { data: [], error: null },
      contentIds.length > 0
        ? statusService.fetchQuizContent(contentIds, 'content')
        : { data: [], error: null },
      examPrepIds.length > 0
        ? statusService.fetchQuizContent(examPrepIds, 'exam_prep')
        : { data: [], error: null },
    ])

    if (
      instructorResult.error ||
      customizeResult.error ||
      contentResult.error ||
      examPrepResult.error
    ) {
      if (process.env.NODE_ENV === 'development') {
        console.error(
          '[WrongAnswersTab] fetchQuizContent error:',
          instructorResult.error,
          customizeResult.error,
          contentResult.error,
          examPrepResult.error,
        )
      }
      showErrorToast(t('error.loadFailed'))
    }

    // (quiz_source, quiz_id) → IncorrectQuizEntry 맵
    const incorrectMap = new Map<string, typeof incorrects[number]>()
    for (const inc of incorrects) {
      incorrectMap.set(`${inc.quiz_source}:${inc.quiz_id}`, inc)
    }

    const quizzesWithMeta: QuizWithMeta[] = []
    const sources: Array<{
      source: 'instructor' | 'customize' | 'content' | 'exam_prep'
      data: typeof instructorResult.data
    }> = [
      { source: 'instructor', data: instructorResult.data },
      { source: 'content', data: contentResult.data },
      { source: 'customize', data: customizeResult.data },
      { source: 'exam_prep', data: examPrepResult.data },
    ]

    for (const { source, data } of sources) {
      for (const item of (data ?? [])) {
        const key = `${source}:${item.quiz_id}`
        const inc = incorrectMap.get(key)
        const info = lectureInfoMap.get(inc?.lecture_id ?? '')
        quizzesWithMeta.push({
          ...item,
          difficulty: item.difficulty ?? null,
          quiz_source: source,
          lecture_id: inc?.lecture_id,
          bookmark: false,
          correct: inc?.latest_is_correct ?? null,
          selected_answer: inc?.latest_selected_answer ?? null,
          created_at: inc?.first_wrong_at,
          course_id: info?.course_id,
          course_name: info?.course_name,
          lecture_name: info?.lecture_name,
        })
      }
    }

    setAllQuizzes(quizzesWithMeta)
    setIsLoading(false)
  }, [selectedLectureIds, t, showErrorToast, lectureInfoMap])

  // 회차 변경 시 리셋
  const lectureIdsKey = JSON.stringify(selectedLectureIds)
  useEffect(() => {
    setAllQuizzes([])
    setError(null)
    setDisplayCount(INITIAL_DISPLAY_COUNT)
    if (selectedLectureIds.length > 0) {
      fetchQuizzes()
    }
  }, [lectureIdsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // sortOrder, allQuizzes, lectureInfoMap 변경 시 courseGroups 동기 재생성
  const courseGroups = useMemo(() => {
    if (allQuizzes.length === 0) return []
    const withLatestNames = allQuizzes.map(q => {
      const info = lectureInfoMap.get(q.lecture_id ?? '')
      if (!info) return q
      return { ...q, course_name: info.course_name, lecture_name: info.lecture_name }
    })
    const sorted = withLatestNames.sort((a, b) => {
      const dateA = new Date(a.created_at ?? 0).getTime()
      const dateB = new Date(b.created_at ?? 0).getTime()
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB
    })
    return groupQuizzesByCourseAndLecture(sorted)
  }, [sortOrder, allQuizzes, lectureInfoMap])

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

  /** 모든 카드 client state 풀이 결과 초기화 (서버 호출 없음 — user_quiz_response 누적 보존) */
  const handleRetryWrong = useCallback(() => {
    if (allQuizzes.length === 0) return
    setShowResetConfirm(false)
    setAllQuizzes(prev => prev.map(q => ({ ...q, correct: null, selected_answer: null })))
    setResetKey(prev => prev + 1)
  }, [allQuizzes])

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
        fetchQuizzes()
      }
    },
    [allQuizzes, fetchQuizzes, showErrorToast, t],
  )

  /**
   * 오답 카드에서 다시 풀기 — 일반 풀이 PATCH 로 통일.
   * backend 가 user_quiz_response 에 새 시도 행을 누적 INSERT 한다.
   */
  const handleCorrectUpdate = useCallback(
    async (quizId: string, isCorrect: boolean, answer: number) => {
      const quiz = allQuizzes.find(q => q.quiz_id === quizId)
      if (!quiz || !quiz.lecture_id) return

      quizAnalytics.answer(quiz.lecture_id, { question_index: -1, correct: isCorrect, duration_ms: 0, quiz_type: quiz.quiz_source ?? 'wrong_retry' })

      // Optimistic: client state 업데이트
      setAllQuizzes(prev => prev.map(q =>
        q.quiz_id === quizId ? { ...q, correct: isCorrect, selected_answer: answer } : q,
      ))

      const result = await statusService.updateCorrect(
        quiz.quiz_source,
        quizId,
        quiz.lecture_id,
        isCorrect,
        answer,
      )

      if (result.error) {
        showErrorToast(t('error.correctFailed'))
        fetchQuizzes()
      }
    },
    [allQuizzes, fetchQuizzes, showErrorToast, t],
  )

  /** 단일 카드 풀이 결과 client state 초기화 (서버 호출 없음) */
  const handleResetAnswer = useCallback(
    (quizId: string) => {
      setAllQuizzes(prev => prev.map(q =>
        q.quiz_id === quizId ? { ...q, correct: null, selected_answer: null } : q,
      ))
    },
    [],
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
            onClick={() => fetchQuizzes()}
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
            <h3 className="flex items-center gap-2 text-base font-bold text-gray-800 dark:text-gray-100">
              <BookOpen className="h-4 w-4 text-blue-500" />
              {courseGroup.course_name}
            </h3>
            {courseGroup.lectureGroups.map(lectureGroup => (
              <div key={lectureGroup.lecture_id} className="space-y-3 pl-2">
                <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 border-l-2 border-blue-400 pl-2">
                  {lectureGroup.lecture_name}
                </h4>
                {lectureGroup.typeGroups.map(typeGroup => (
                  <div key={typeGroup.type}>
                    <h5 className="mb-2 flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
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
                              key={`card-${quiz.quiz_id}-${resetKey}`}
                              quiz={studentQuiz}
                              index={idx}
                              isBookmarked={quiz.bookmark}
                              isCorrect={quiz.correct ?? null}
                              selectedAnswer={quiz.selected_answer ?? null}
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
                onClick={() => setDisplayCount(prev => prev + 5)}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-2.5 text-sm text-gray-600 dark:text-gray-300 transition hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm"
              >
                <ChevronDown className="h-4 w-4" />
                {t('wrong.showMore')}
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative p-4 space-y-6 bg-gray-50 dark:bg-gray-950 min-h-full">
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
          <div className="mx-4 w-full max-w-md rounded-xl bg-white dark:bg-gray-800 p-6 shadow-2xl">
            <p className="text-sm text-gray-700 dark:text-gray-200 text-center whitespace-nowrap">{t('wrong.resetConfirmMessage')}</p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 transition hover:bg-gray-50 dark:hover:bg-gray-700"
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
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50">{t('wrong.title')}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('wrong.description')}</p>
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
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <ArrowUpDown className="h-3.5 w-3.5" />
            <select
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value as 'newest' | 'oldest')}
              className="bg-transparent border-none text-xs text-gray-500 dark:text-gray-400 focus:outline-none cursor-pointer"
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
