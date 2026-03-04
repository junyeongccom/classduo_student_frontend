/**
 * @file GameSelectionModal.tsx
 * @description 게임탭 진입용 수업/회차 선택 모달 — 사이드바 게임 메뉴에서 호출
 * @module shared/components/common
 * @dependencies apiRequest, ai-tutor/lectureUtils, next/navigation
 */

'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import Image from 'next/image'
import { X, Puzzle, Loader2, ChevronRight } from 'lucide-react'
import { apiRequest } from '@/shared/lib/api'
import {
  calculateWeekAndSession,
  estimateTermStartDate,
  type LectureInfo,
} from '@/features/ai-tutor'

interface LectureItem {
  lecture_id: string
  lecture_no: number
  title: string | null
  lecture_date: string
  start_time: string | null
  is_available: boolean
}

interface CourseItem {
  course_id: string
  title: string
  professor_name?: string | null
  section?: string | null
  lectures?: LectureItem[]
}

interface CoursesApiResponse {
  courses: CourseItem[]
}

interface GameSelectionModalProps {
  open: boolean
  onClose: () => void
}

export function GameSelectionModal({ open, onClose }: GameSelectionModalProps) {
  const router = useRouter()
  const locale = useLocale()
  const [courses, setCourses] = useState<CourseItem[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchCourses = useCallback(async () => {
    setIsLoading(true)
    const result = await apiRequest<CoursesApiResponse>('/courses/all', {
      method: 'GET',
      auth: true,
    })
    if (result.data) {
      setCourses(result.data.courses)
      if (result.data.courses.length > 0) {
        setSelectedCourseId(result.data.courses[0].course_id)
      }
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (open) {
      setSelectedCourseId(null)
      fetchCourses()
    }
  }, [open, fetchCourses])

  const handleSelectLecture = (courseId: string, lectureId: string) => {
    router.push(`/studyspace/course/${courseId}/lecture/${lectureId}?tab=game`)
    onClose()
  }

  const selectedCourse = courses.find(c => c.course_id === selectedCourseId) ?? null
  const availableLectures = selectedCourse?.lectures?.filter(l => l.is_available) ?? []

  /** 선택된 수업의 주차/차시 계산 */
  const lectureWeekMap = useMemo(() => {
    if (!selectedCourse?.lectures) return new Map<string, { weekNo: number; sessionNo: number }>()
    const infos: LectureInfo[] = selectedCourse.lectures.map(l => ({
      lecture_id: l.lecture_id,
      lecture_date: l.lecture_date,
      start_time: l.start_time ?? null,
    }))
    const termStart = estimateTermStartDate(infos)
    const map = new Map<string, { weekNo: number; sessionNo: number }>()
    for (const l of selectedCourse.lectures) {
      const ws = calculateWeekAndSession(l.lecture_date, l.start_time ?? null, termStart, infos, l.lecture_id)
      map.set(l.lecture_id, ws)
    }
    return map
  }, [selectedCourse])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white dark:bg-gray-900 shadow-2xl"
        style={{ height: '70vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <header className="border-b border-gray-100 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#22C55E]/10 p-2">
                <Puzzle className="h-5 w-5 text-[#22C55E]" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50">
                {locale === 'ko' ? '게임 - 수업 & 회차 선택' : 'Game - Select Course & Lecture'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {/* 게임 에셋 썸네일 스트립 */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {[
              { id: 'running', icon: '🏃', color: 'border-orange-200 bg-orange-50' },
              { id: 'deck', icon: '🃏', color: 'border-blue-200 bg-blue-50' },
              { id: 'cardMatch', icon: '🎴', color: 'border-violet-200 bg-violet-50' },
              { id: 'definitionBuilder', icon: '🧩', color: 'border-emerald-200 bg-emerald-50' },
            ].map(game => (
              <div
                key={game.id}
                className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 ${game.color}`}
              >
                {game.id === 'running' ? (
                  <Image src="/game/scene.png" alt="Running game" width={40} height={20} className="rounded" />
                ) : (
                  <span className="text-lg">{game.icon}</span>
                )}
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {locale === 'ko'
                    ? { running: '달리기', deck: '플래시카드', cardMatch: '카드매칭', definitionBuilder: '정의 빌더' }[game.id]
                    : { running: 'Running', deck: 'Flashcard', cardMatch: 'Card Match', definitionBuilder: 'Def Builder' }[game.id]
                  }
                </span>
              </div>
            ))}
          </div>
        </header>

        {/* Body — 2-column */}
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-gray-400" />
          </div>
        ) : courses.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
            {locale === 'ko' ? '수업이 없습니다' : 'No courses available'}
          </div>
        ) : (
          <div className="flex flex-1 min-h-0">
            {/* Left — 수업 목록 */}
            <div className="flex w-[280px] shrink-0 flex-col border-r border-gray-100 dark:border-gray-700">
              <div className="px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {locale === 'ko' ? '수업' : 'Courses'}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto px-2 pb-2">
                {courses.map(course => {
                  const isSelected = course.course_id === selectedCourseId
                  return (
                    <button
                      key={course.course_id}
                      onClick={() => setSelectedCourseId(course.course_id)}
                      className={`group flex w-full items-center justify-between rounded-lg p-3 text-left transition-all ${
                        isSelected
                          ? 'bg-[#22C55E]/10 text-[#22C55E]'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-semibold ${
                          isSelected ? 'text-[#22C55E]' : 'text-gray-900 dark:text-gray-50'
                        }`}>
                          {course.title}
                        </p>
                        {course.professor_name && (
                          <p className="mt-0.5 truncate text-xs text-gray-400">
                            {course.professor_name}
                          </p>
                        )}
                      </div>
                      <ChevronRight className={`ml-2 h-4 w-4 shrink-0 transition-colors ${
                        isSelected ? 'text-[#22C55E]' : 'text-gray-300'
                      }`} />
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Right — 회차 목록 */}
            <div className="flex flex-1 flex-col min-w-0">
              <div className="px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {locale === 'ko' ? '회차' : 'Lectures'}
                  {selectedCourse && (
                    <span className="ml-2 normal-case tracking-normal font-medium text-gray-300">
                      — {selectedCourse.title}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto px-2 pb-2">
                {!selectedCourse ? (
                  <div className="flex h-full items-center justify-center text-sm text-gray-400">
                    {locale === 'ko' ? '수업을 선택해주세요' : 'Select a course'}
                  </div>
                ) : availableLectures.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-gray-400">
                    {locale === 'ko' ? '학습 가능한 회차가 없습니다' : 'No available lectures'}
                  </div>
                ) : (
                  availableLectures.map(lecture => {
                    const ws = lectureWeekMap.get(lecture.lecture_id)
                    const weekLabel = ws
                      ? (locale === 'ko'
                          ? `${ws.weekNo}주차 ${String(ws.sessionNo).padStart(2, '0')}차시`
                          : `W${ws.weekNo} S${String(ws.sessionNo).padStart(2, '0')}`)
                      : null
                    return (
                      <button
                        key={lecture.lecture_id}
                        onClick={() => handleSelectLecture(selectedCourse.course_id, lecture.lecture_id)}
                        className="group flex w-full items-center gap-3 rounded-lg p-3 text-left transition-all hover:bg-[#22C55E]/5"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#22C55E]/10 text-[#22C55E] text-sm font-bold">
                          {lecture.lecture_no}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-50 group-hover:text-[#22C55E] transition-colors">
                            {lecture.title ?? (locale === 'ko' ? `${lecture.lecture_no}회차` : `Lecture ${lecture.lecture_no}`)}
                          </p>
                          {weekLabel && (
                            <p className="mt-0.5 text-xs text-gray-400">{weekLabel}</p>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
