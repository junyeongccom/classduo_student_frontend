/**
 * @file DialogueLectureSidebar.tsx
 * @description 대화형 학습 전용 회차 선택 사이드바 — 수업 고정, 게임/보상 요소 제거
 * @module features/lecture-study/components/ui
 * @dependencies ai-tutor (useAITutorStore, lectureUtils)
 */

'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Loader2, BookOpen, Calendar } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import { apiRequest } from '@/shared/lib/api'
import { ensureValidToken } from '@/shared/lib/supabase'
import {
  calculateWeekAndSession,
  estimateTermStartDate,
  formatWeekAndSession,
  type LectureInfo,
} from '@/features/ai-tutor'

interface Lecture {
  lecture_id: string
  course_id: string
  lecture_no: number
  title: string | null
  lecture_date: string
  start_time: string | null
  status: string
  is_available?: boolean
  essence_7words?: string | null
}

interface Course {
  course_id: string
  title: string
  professor_name?: string | null
  section?: string | null
  lectures: Lecture[]
}

interface DialogueLectureSidebarProps {
  courseId: string
  selectedLectureIds: string[]
  onSelectLectureIds: (ids: string[]) => void
  isLocked?: boolean
}

/** 한 번에 선택 가능한 최대 회차 수. 과다 선택 시 AI 답변 생성이 타임아웃되는 것을 방지. */
const MAX_SELECTED_LECTURES = 10

export function DialogueLectureSidebar({
  courseId,
  selectedLectureIds,
  onSelectLectureIds,
  isLocked = false,
}: DialogueLectureSidebarProps) {
  const t = useTranslations('aiTutorSidebar')
  const locale = useLocale()
  const [course, setCourse] = useState<Course | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const lectureButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  // 과목 데이터 로드
  const fetchCourse = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      await ensureValidToken()
      const res = await apiRequest<{ courses: Course[] }>('/courses/all', {
        method: 'GET',
        auth: true,
      })
      if (res.data?.courses) {
        const found = res.data.courses.find((c) => c.course_id === courseId)
        setCourse(found ?? null)
      }
    } catch {
      setError(t('loadError'))
    } finally {
      setIsLoading(false)
    }
  }, [courseId, t])

  useEffect(() => {
    fetchCourse()
  }, [fetchCourse, locale])

  // 주차-차시 계산
  const termStartDate = useMemo(() => {
    if (!course || course.lectures.length === 0) return null
    const lectureInfos: LectureInfo[] = course.lectures.map((l) => ({
      lecture_id: l.lecture_id,
      lecture_date: l.lecture_date,
      start_time: l.start_time,
    }))
    return estimateTermStartDate(lectureInfos)
  }, [course])

  const getWeekSession = useMemo(() => {
    if (!course || !termStartDate) return () => null
    const lectureInfos: LectureInfo[] = course.lectures.map((l) => ({
      lecture_id: l.lecture_id,
      lecture_date: l.lecture_date,
      start_time: l.start_time,
    }))
    return (lecture: Lecture) => {
      const result = calculateWeekAndSession(
        lecture.lecture_date,
        lecture.start_time,
        termStartDate,
        lectureInfos,
        lecture.lecture_id,
      )
      return formatWeekAndSession(result.weekNo, result.sessionNo, locale)
    }
  }, [course, termStartDate, locale])

  // 선택된 회차로 스크롤
  useEffect(() => {
    if (selectedLectureIds.length === 0) return
    const targetId = selectedLectureIds[selectedLectureIds.length - 1]
    const targetRef = lectureButtonRefs.current[targetId]
    if (targetRef) {
      targetRef.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
    }
  }, [selectedLectureIds])

  // 회차 토글 핸들러
  const handleToggleLecture = useCallback(
    (lectureId: string) => {
      if (selectedLectureIds.includes(lectureId)) {
        onSelectLectureIds(selectedLectureIds.filter((id) => id !== lectureId))
      } else {
        // 최대 선택 개수 초과 시 추가 선택 차단
        if (selectedLectureIds.length >= MAX_SELECTED_LECTURES) return
        onSelectLectureIds([...selectedLectureIds, lectureId])
      }
    },
    [selectedLectureIds, onSelectLectureIds],
  )

  // 전체 선택 상태
  const availableLectures = course?.lectures.filter((l) => l.is_available) ?? []
  const availableLectureIds = availableLectures.map((l) => l.lecture_id)
  const selectedAvailableCount = availableLectureIds.filter((id) =>
    selectedLectureIds.includes(id),
  ).length
  // 전체 선택도 최대 개수까지만. 가용 회차가 한도보다 많으면 한도(10개)가 '전체'의 상한.
  const selectionCap = Math.min(availableLectures.length, MAX_SELECTED_LECTURES)
  const isAllSelected =
    availableLectures.length > 0 && selectedAvailableCount >= selectionCap

  const handleToggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      onSelectLectureIds([])
    } else {
      onSelectLectureIds(availableLectureIds.slice(0, MAX_SELECTED_LECTURES))
    }
  }, [isAllSelected, availableLectureIds, onSelectLectureIds])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-4">
        <p className="text-xs text-red-600">{error ?? t('courseNotFound')}</p>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col bg-white dark:bg-gray-900 p-4 overflow-y-auto overflow-x-hidden">
      {/* 과목 정보 (고정, 드롭다운 없음) */}
      <div className="mb-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3">
        <h2 className="text-sm font-bold text-gray-900 dark:text-gray-50 leading-snug">
          {course.title}
        </h2>
        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          {course.professor_name && <span>{course.professor_name}</span>}
          {course.professor_name && course.section && <span>·</span>}
          {course.section && (
            <span>{locale === 'ko' ? `${course.section}분반` : `Section ${course.section}`}</span>
          )}
        </div>
      </div>

      {/* 회차 선택 헤더 */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Calendar className="h-3.5 w-3.5" />
          <span>{t('lectureSelectHint')}</span>
        </div>
        {availableLectures.length > 0 && !isLocked && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400 dark:text-gray-500">
              {selectedLectureIds.length}/{MAX_SELECTED_LECTURES}
            </span>
            <button
              onClick={handleToggleSelectAll}
              className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-700 font-medium transition-colors"
            >
              {isAllSelected ? t('deselectAll') : t('selectAll')}
            </button>
          </div>
        )}
      </div>
      {!isLocked && availableLectures.length > MAX_SELECTED_LECTURES && (
        <p className="mb-2 text-[11px] text-gray-400 dark:text-gray-500">
          {locale === 'en'
            ? `You can select up to ${MAX_SELECTED_LECTURES} lectures at a time.`
            : `회차는 한 번에 최대 ${MAX_SELECTED_LECTURES}개까지 선택할 수 있어요.`}
        </p>
      )}

      {/* 회차 목록 */}
      <div className="flex-1 overflow-y-auto space-y-1.5">
        {course.lectures.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">{t('noLectures')}</p>
        ) : (
          course.lectures.map((lecture) => {
            const isSelected = selectedLectureIds.includes(lecture.lecture_id)
            const atLimit = selectedLectureIds.length >= MAX_SELECTED_LECTURES
            const isDisabled =
              isLocked || !lecture.is_available || (!isSelected && atLimit)

            return (
              <button
                ref={(el) => {
                  lectureButtonRefs.current[lecture.lecture_id] = el
                }}
                key={lecture.lecture_id}
                onClick={() => handleToggleLecture(lecture.lecture_id)}
                disabled={isDisabled}
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-all ${
                  isSelected && !isLocked
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-900 dark:text-blue-100'
                    : isSelected && isLocked
                      ? 'bg-blue-50/60 dark:bg-blue-900/20 border-blue-200/60 dark:border-blue-700/60 text-blue-900/70 dark:text-blue-100/70 cursor-not-allowed'
                      : isDisabled
                        ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 cursor-not-allowed opacity-50'
                        : 'bg-gray-50 dark:bg-gray-800/50 border-transparent hover:border-gray-200 dark:hover:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      isSelected
                        ? 'text-blue-900 dark:text-blue-100'
                        : isDisabled
                          ? 'text-gray-400'
                          : 'text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    {lecture.title ||
                      lecture.essence_7words ||
                      getWeekSession(lecture) ||
                      t('lectureLabel', { no: String(lecture.lecture_no) })}
                  </p>
                  <p className={`text-xs ${isSelected ? 'text-blue-600 dark:text-blue-300' : 'text-gray-400'}`}>
                    {getWeekSession(lecture) || t('lectureLabel', { no: String(lecture.lecture_no) })} ·{' '}
                    {lecture.lecture_date}
                  </p>
                </div>
                {isSelected && (
                  <div className="ml-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500">
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            )
          })
        )}
      </div>

      {/* 선택된 회차 요약 */}
      {selectedLectureIds.length > 0 && (
        <div className="mt-4 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2.5">
          <p className="text-xs font-medium text-gray-800 dark:text-gray-200">
            {isLocked
              ? t('lockedLecturesSummary', { count: String(selectedLectureIds.length) })
              : t('selectedLecturesSummary', { count: String(selectedLectureIds.length) })}
          </p>
        </div>
      )}
    </div>
  )
}
