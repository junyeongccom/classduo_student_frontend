/**
 * @file GameSelectionModal.tsx
 * @description 게임탭 진입용 수업/회차 선택 모달 — 아케이드 게임 테마 UI
 * @module shared/components/common
 * @dependencies apiRequest, ai-tutor/lectureUtils, next/navigation
 */

'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import Image from 'next/image'
import { X, Loader2, ChevronRight, Gamepad2, Lock } from 'lucide-react'
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

const GAME_MODES = [
  { id: 'running', emoji: '🏃', color: '#F43F5E', label_ko: '달리기', label_en: 'Runner' },
  { id: 'deck', emoji: '🃏', color: '#3B82F6', label_ko: '덱', label_en: 'Deck' },
  { id: 'cardMatch', emoji: '🎴', color: '#8B5CF6', label_ko: '카드매칭', label_en: 'Match-Up' },
  { id: 'definitionBuilder', emoji: '🧩', color: '#10B981', label_ko: '정의 빌더', label_en: 'Def Builder' },
]

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
    router.push(`/studyspace/course/${courseId}/lecture/${lectureId}?tab=game&from=game_menu`)
    onClose()
  }

  const selectedCourse = courses.find(c => c.course_id === selectedCourseId) ?? null
  const availableLectures = selectedCourse?.lectures?.filter(l => l.is_available) ?? []

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
      {/* Arcade Cabinet Frame */}
      <div
        className="relative flex w-full max-w-3xl flex-col overflow-hidden rounded-3xl shadow-2xl"
        style={{ height: '72vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Left/Right neon side bars */}
        <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-pink-400 via-fuchsia-400 to-pink-400 rounded-l-3xl z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-2 bg-gradient-to-b from-cyan-400 via-teal-400 to-cyan-400 rounded-r-3xl z-10" />

        {/* Inner content — light theme */}
        <div className="flex flex-1 flex-col bg-white ml-2 mr-2 overflow-hidden">
          {/* Header */}
          <header className="relative border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1E293B]">
                  <Gamepad2 className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <h2
                    className="text-lg font-bold tracking-wide uppercase text-gray-900"
                    style={{ fontFamily: 'Pretendard, sans-serif' }}
                  >
                    {locale === 'ko' ? 'SELECT YOUR MISSION!' : 'SELECT YOUR MISSION!'}
                  </h2>
                  <p className="text-xs text-gray-400" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    {locale === 'ko' ? '수업과 회차를 선택하고 게임을 시작하세요' : 'Choose a course and a level to begin'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Game Mode Cards — 균등 분할 */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {GAME_MODES.map(game => (
                <div
                  key={game.id}
                  className="flex flex-col items-center rounded-xl bg-gray-50 border border-gray-200 py-3 transition-all hover:border-gray-300 hover:shadow-sm cursor-default"
                  style={{ borderTopColor: game.color, borderTopWidth: 3 }}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm mb-1.5">
                    {game.id === 'running' ? (
                      <Image src="/game/scene.png" alt="Running" width={32} height={16} className="rounded" />
                    ) : (
                      <span className="text-xl">{game.emoji}</span>
                    )}
                  </div>
                  <span className="text-[11px] font-bold tracking-wider uppercase text-gray-600" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    {locale === 'ko' ? game.label_ko : game.label_en}
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
            <div className="flex flex-1 items-center justify-center text-sm text-gray-400 tracking-wider uppercase" style={{ fontFamily: 'monospace' }}>
              {locale === 'ko' ? 'NO COURSES FOUND' : 'NO COURSES FOUND'}
            </div>
          ) : (
            <div className="flex flex-1 min-h-0">
              {/* Left — 수업 목록 (SELECT SUBJECT) */}
              <div className="flex w-[260px] shrink-0 flex-col border-r border-gray-200">
                <div className="px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400" style={{ fontFamily: 'monospace' }}>
                    {locale === 'ko' ? 'SELECT SUBJECT' : 'SELECT SUBJECT'}
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
                  {courses.map(course => {
                    const isSelected = course.course_id === selectedCourseId
                    return (
                      <button
                        key={course.course_id}
                        onClick={() => setSelectedCourseId(course.course_id)}
                        className={`group flex w-full items-center justify-between rounded-xl p-3 text-left transition-all ${
                          isSelected
                            ? 'bg-emerald-50 border border-emerald-400/50'
                            : 'border border-transparent hover:bg-gray-50 hover:border-gray-200'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-sm font-bold ${
                            isSelected ? 'text-emerald-600' : 'text-gray-800'
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
                          isSelected ? 'text-emerald-500' : 'text-gray-300'
                        }`} />
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Right — 회차 목록 (SELECT LEVEL) */}
              <div className="flex flex-1 flex-col min-w-0">
                <div className="flex items-center justify-between px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400" style={{ fontFamily: 'monospace' }}>
                    {locale === 'ko' ? 'SELECT LEVEL' : 'SELECT LEVEL'}
                  </p>
                  {selectedCourse && availableLectures.length > 0 && (
                    <span
                      className="rounded-md bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 border border-amber-200"
                      style={{ fontFamily: 'monospace' }}
                    >
                      {availableLectures.length} LEVELS FOUND
                    </span>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto px-2 pb-2">
                  {!selectedCourse ? (
                    <div className="flex h-full items-center justify-center text-sm text-gray-400 tracking-wider" style={{ fontFamily: 'monospace' }}>
                      {locale === 'ko' ? '← 수업을 선택하세요' : '← SELECT A SUBJECT'}
                    </div>
                  ) : availableLectures.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2">
                      <Lock className="h-8 w-8 text-gray-300" />
                      <p className="text-sm text-gray-400 tracking-wider" style={{ fontFamily: 'monospace' }}>
                        {locale === 'ko' ? 'NO LEVELS AVAILABLE' : 'NO LEVELS AVAILABLE'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {availableLectures.map((lecture, idx) => {
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
                            className="group flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all border border-transparent hover:bg-gray-50 hover:border-cyan-200"
                          >
                            {/* Level number badge */}
                            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
                              <svg className="absolute inset-0 h-10 w-10" viewBox="0 0 40 40">
                                <circle cx="20" cy="20" r="17" fill="none" stroke="#E5E7EB" strokeWidth="2.5" />
                                <circle
                                  cx="20" cy="20" r="17" fill="none"
                                  stroke="#F43F5E" strokeWidth="2.5"
                                  strokeDasharray={`${Math.min((idx + 1) / availableLectures.length, 1) * 107} 107`}
                                  strokeLinecap="round"
                                  transform="rotate(-90 20 20)"
                                />
                              </svg>
                              <span className="text-sm font-bold text-gray-700" style={{ fontFamily: 'monospace' }}>
                                {lecture.lecture_no}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold text-gray-800 group-hover:text-cyan-600 transition-colors">
                                {lecture.title ?? (locale === 'ko' ? `Level ${lecture.lecture_no}` : `Level ${lecture.lecture_no}`)}
                              </p>
                              {weekLabel && (
                                <p className="mt-0.5 text-xs text-gray-400">{weekLabel}</p>
                              )}
                            </div>
                            <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 opacity-0 transition-all group-hover:opacity-100 group-hover:text-cyan-500" />
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Footer — Arcade Status Bar */}
          <footer className="flex items-center justify-between border-t border-gray-200 bg-[#1E293B] px-5 py-2.5">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400" style={{ fontFamily: 'monospace' }}>
                  SYSTEM ONLINE
                </span>
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500" style={{ fontFamily: 'monospace' }}>
              PRESS [START] TO CONTINUE
            </span>
          </footer>
        </div>
      </div>
    </div>
  )
}
