/**
 * @file QuizGenerationTab.tsx
 * @description 퀴즈 생성 탭 컨테이너 — 좌측 강좌 패널 + 우측 회차 그리드 + 퀴즈 설정 + 세션 목록/상세
 * @module features/my-quiz
 * @dependencies next-intl, myQuizService, useCourseAndLecture
 */

'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Loader2, ArrowLeft, ChevronDown } from 'lucide-react'
import * as myQuizService from '../../services/myQuizService'
import * as statusService from '../../services/myQuizStatusService'
import type { SessionSolvingStats } from '../../services/myQuizStatusService'
import type { QuizSession } from '../../types'
import { useToast } from '@/shared/hooks/useToast'
import { useCourseAndLecture } from '../../hooks/useCourseAndLecture'
import CoursePanel from '../ui/CoursePanel'
import type { CourseCardData } from '../ui/CoursePanel'
import LectureGrid from '../ui/LectureGrid'
import type { LectureGridItem } from '../ui/LectureGrid'
import SessionCard from '../ui/SessionCard'
import CreateSessionForm from '../ui/CreateSessionForm'
import SessionDetailView from './SessionDetailView'

const ALLOWED_QUIZ_TYPES = ['DEF_TO_TERM', 'TERM_TO_DEF', 'MISCONCEPTION', 'STRUCTURE_OBJ'] as const

type GenerationView = 'course-lecture' | 'quiz-setting' | 'session-list' | 'session-detail'

export default function QuizGenerationTab() {
  const t = useTranslations('myQuiz')
  const { toasts, error: showErrorToast } = useToast()

  // 강좌/회차 데이터
  const {
    isLoading: coursesLoading,
    courses,
    selectedCourse,
    selectedCourseId,
    onCourseChange,
    hasCourses,
  } = useCourseAndLecture()

  // 뷰 상태
  const [view, setView] = useState<GenerationView>('course-lecture')
  const [selectedLectureId, setSelectedLectureId] = useState<string | null>(null)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)

  // 세션 관련 상태
  const [sessions, setSessions] = useState<QuizSession[]>([])
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [pollingTimedOut, setPollingTimedOut] = useState(false)
  const pollStartTimeRef = useRef<number | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [sessionDisplayCount, setSessionDisplayCount] = useState(3)
  const [solvingStatsMap, setSolvingStatsMap] = useState<Map<string, SessionSolvingStats>>(new Map())

  // 풀이 통계 조회
  const fetchSolvingStats = useCallback(async (sessionList: QuizSession[]) => {
    const completedIds = sessionList
      .filter(s => s.status === 'COMPLETED')
      .map(s => s.session_id)
    if (completedIds.length === 0) { setSolvingStatsMap(new Map()); return }

    const result = await statusService.getSessionSolvingStats(completedIds)
    if (result.data) setSolvingStatsMap(result.data)
  }, [])

  // 세션 목록 조회 (강좌 전체 세션)
  const fetchSessions = useCallback(async () => {
    if (!selectedCourseId) return
    setIsLoadingSessions(true)
    setSessionError(null)

    const result = await myQuizService.getSessions()
    if (result.error || !result.data) {
      setSessionError(t('error.loadFailed'))
      setIsLoadingSessions(false)
      return
    }

    const courseLectureIds = new Set(
      (selectedCourse?.lectures ?? []).map(l => l.lecture_id)
    )

    const filtered = (result.data.sessions ?? [])
      .filter(s => courseLectureIds.has(s.lecture_id))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    setSessions(filtered)
    setIsLoadingSessions(false)
    fetchSolvingStats(filtered)
  }, [selectedCourseId, selectedCourse, t, fetchSolvingStats])

  // 강좌 변경 시 세션 리셋
  useEffect(() => {
    setSessions([])
    setSelectedSessionId(null)
    setSessionError(null)
    setPollingTimedOut(false)
    setSessionDisplayCount(3)
    if (selectedCourseId) {
      fetchSessions()
    }
  }, [selectedCourseId]) // eslint-disable-line react-hooks/exhaustive-deps

  // 회차 변경 시 세션 상세 리셋
  useEffect(() => {
    setSelectedSessionId(null)
  }, [selectedLectureId])

  // Polling: CREATING 세션 3초 간격 확인
  const hasCreatingRef = useRef(false)
  hasCreatingRef.current = sessions.some(s => s.status === 'CREATING')

  useEffect(() => {
    if (!hasCreatingRef.current || !selectedCourseId) return

    if (pollStartTimeRef.current === null) {
      pollStartTimeRef.current = Date.now()
    }
    setPollingTimedOut(false)
    const MAX_POLL_MS = 5 * 60 * 1000

    const courseLectureIds = new Set(
      (selectedCourse?.lectures ?? []).map(l => l.lecture_id)
    )

    const interval = setInterval(async () => {
      if (pollStartTimeRef.current !== null && Date.now() - pollStartTimeRef.current > MAX_POLL_MS) {
        clearInterval(interval)
        pollStartTimeRef.current = null
        setPollingTimedOut(true)
        return
      }
      const result = await myQuizService.getSessions()
      if (!result.data) return

      const filtered = (result.data.sessions ?? [])
        .filter(s => courseLectureIds.has(s.lecture_id))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setSessions(filtered)
      fetchSolvingStats(filtered)

      const stillCreating = filtered.some(s => s.status === 'CREATING')
      if (!stillCreating) {
        clearInterval(interval)
        pollStartTimeRef.current = null
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [selectedCourseId, selectedCourse, sessions.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = useCallback(async (sessionId: string) => {
    const result = await myQuizService.deleteSession(sessionId)
    if (result.error) {
      showErrorToast(t('error.deleteFailed'))
      return
    }
    setSessions(prev => prev.filter(s => s.session_id !== sessionId))
  }, [showErrorToast, t])

  const handleRename = useCallback(async (sessionId: string, title: string) => {
    const result = await myQuizService.renameSession(sessionId, title)
    if (result.error) {
      showErrorToast(t('error.renameFailed'))
      return
    }
    setSessions(prev =>
      prev.map(s => s.session_id === sessionId ? { ...s, title } : s),
    )
  }, [showErrorToast, t])

  const handleCreateSubmit = useCallback(async (typeCounts: Record<string, number>) => {
    if (!selectedLectureId || isCreating) return
    setIsCreating(true)
    setCreateError(null)

    const safeCounts: Record<string, number> = {}
    for (const type of ALLOWED_QUIZ_TYPES) {
      const val = typeCounts[type] ?? 0
      safeCounts[type] = Math.max(0, Math.min(20, val))
    }
    const totalCount = Object.values(safeCounts).reduce((a, b) => a + b, 0)
    if (totalCount === 0) {
      setCreateError(t('error.createFailed'))
      setIsCreating(false)
      return
    }

    const result = await myQuizService.createSession(selectedLectureId, safeCounts)
    if (result.error || !result.data) {
      const errorMsg = result.status === 400
        ? t('create.noSnapshot')
        : t('error.createFailed')
      setCreateError(errorMsg)
      setIsCreating(false)
      return
    }

    const newSession: QuizSession = {
      session_id: result.data.session_id,
      student_id: '',
      lecture_id: selectedLectureId,
      course_id: selectedCourseId ?? '',
      generation_batch_id: null,
      language: null,
      status: 'CREATING',
      quiz_count: totalCount,
      title: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    setSessions(prev => [newSession, ...prev])
    setIsCreating(false)
    setView('session-list') // 생성 후 세션 목록으로 이동
  }, [selectedLectureId, isCreating, t, selectedCourseId])

  // 세션의 회차 라벨 구하기 (예: "생명과학 3회차")
  const getSessionLectureLabel = useCallback((session: QuizSession): string | undefined => {
    if (!selectedCourse) return undefined
    const lecture = selectedCourse.lectures.find(l => l.lecture_id === session.lecture_id)
    if (!lecture) return undefined
    const courseName = selectedCourse.section
      ? `${selectedCourse.title} (${selectedCourse.section})`
      : selectedCourse.title
    return `${courseName} ${t('selector.lectureLabel', { no: lecture.lecture_no })}`
  }, [selectedCourse, t])

  // 선택된 회차의 이름 가져오기
  const getSelectedLectureName = () => {
    if (!selectedCourse || !selectedLectureId) return ''
    const lecture = selectedCourse.lectures.find(l => l.lecture_id === selectedLectureId)
    if (!lecture) return ''
    return lecture.title
      ? t('selector.lectureLabelWithTitle', { no: lecture.lecture_no, title: lecture.title })
      : t('selector.lectureLabel', { no: lecture.lecture_no })
  }

  const getSelectedCourseName = () => {
    if (!selectedCourse) return ''
    return selectedCourse.section
      ? `${selectedCourse.title} (${selectedCourse.section})`
      : selectedCourse.title
  }

  // -- 뷰 렌더링 --

  // 세션 상세: 세션 자체의 lecture_id 사용 (세션 목록에서 진입 시 selectedLectureId가 없을 수 있음)
  const selectedSession = sessions.find(s => s.session_id === selectedSessionId)
  const detailLectureId = selectedSession?.lecture_id ?? selectedLectureId

  if (view === 'session-detail' && selectedSessionId && detailLectureId) {
    const detailLecture = selectedCourse?.lectures.find(l => l.lecture_id === detailLectureId)
    const detailLectureName = detailLecture
      ? (detailLecture.title
          ? t('selector.lectureLabelWithTitle', { no: detailLecture.lecture_no, title: detailLecture.title })
          : t('selector.lectureLabel', { no: detailLecture.lecture_no }))
      : ''

    return (
      <SessionDetailView
        sessionId={selectedSessionId}
        lectureId={detailLectureId}
        onBack={() => { setSelectedSessionId(null); setView('session-list'); fetchSolvingStats(sessions) }}
        courseName={getSelectedCourseName()}
        lectureName={detailLectureName}
        createdAt={selectedSession?.created_at}
      />
    )
  }

  // 퀴즈 설정
  if (view === 'quiz-setting' && selectedLectureId) {
    return (
      <CreateSessionForm
        onSubmit={handleCreateSubmit}
        onCancel={() => setView('course-lecture')}
        isSubmitting={isCreating}
        error={createError}
        courseName={getSelectedCourseName()}
        lectureName={getSelectedLectureName()}
      />
    )
  }

  // 세션 목록
  if (view === 'session-list') {
    const displayedSessions = sessions.slice(0, sessionDisplayCount)
    const hasMoreSessions = sessions.length > sessionDisplayCount

    return (
      <div className="relative flex h-full flex-col bg-gray-50">
        {/* Toast */}
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
        <div className="shrink-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => setView('course-lecture')}
              className="mt-1 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">{t('session.title')}</h2>
              <p className="text-sm text-gray-500 mt-1">{t('session.description')}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (selectedLectureId) {
                  setView('quiz-setting')
                } else {
                  setView('course-lecture')
                }
              }}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 shrink-0"
            >
              <Plus className="h-4 w-4" />
              {t('create.newSession')}
            </button>
          </div>
        </div>

        {/* 세션 목록 */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="mx-auto max-w-2xl pt-4">
            {isLoadingSessions ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : sessionError ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <p className="text-sm text-red-500">{sessionError}</p>
                <button type="button" onClick={fetchSessions} className="text-xs text-indigo-600 hover:underline">
                  {t('error.retry')}
                </button>
              </div>
            ) : pollingTimedOut ? (
              <div className="flex flex-col gap-3">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
                  <p className="text-sm text-amber-700">{t('session.pollingTimeout')}</p>
                </div>
                {displayedSessions.map(session => (
                  <SessionCard
                    key={session.session_id}
                    session={session}
                    lectureLabel={getSessionLectureLabel(session)}
                    solvingStats={solvingStatsMap.get(session.session_id) ?? null}
                    onSelect={(id) => { setSelectedSessionId(id); setView('session-detail') }}
                    onDelete={handleDelete}
                    onRename={handleRename}
                  />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <p className="text-sm text-gray-500">{t('empty.noSessions')}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {displayedSessions.map(session => (
                  <SessionCard
                    key={session.session_id}
                    session={session}
                    lectureLabel={getSessionLectureLabel(session)}
                    solvingStats={solvingStatsMap.get(session.session_id) ?? null}
                    onSelect={(id) => { setSelectedSessionId(id); setView('session-detail') }}
                    onDelete={handleDelete}
                    onRename={handleRename}
                  />
                ))}
                {hasMoreSessions && (
                  <button
                    type="button"
                    onClick={() => setSessionDisplayCount(prev => prev + 3)}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 transition hover:border-blue-300 hover:shadow-sm"
                  >
                    <ChevronDown className="h-4 w-4" />
                    {t('session.showMore')}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 기본 뷰: 강좌/회차 선택 (2컬럼)
  const courseCards: CourseCardData[] = courses.map(c => ({
    course_id: c.course_id,
    title: c.title,
    section: c.section,
    lecture_count: c.lectures.filter(l => l.is_available !== false).length,
  }))

  const lectureItems: LectureGridItem[] = (selectedCourse?.lectures ?? [])
    .filter(l => l.is_available !== false)
    .sort((a, b) => a.lecture_no - b.lecture_no)
    .map(l => ({
      lecture_id: l.lecture_id,
      lecture_no: l.lecture_no,
      title: l.title,
      has_completed_session: sessions.some(s => s.lecture_id === l.lecture_id && s.status === 'COMPLETED'),
    }))

  return (
    <div className="flex h-full">
      {/* 좌측: 강좌 패널 */}
      <div className="w-80 shrink-0 border-r border-gray-200 overflow-y-auto">
        <CoursePanel
          courses={courseCards}
          selectedCourseId={selectedCourseId}
          onSelectCourse={(id) => {
            onCourseChange(id)
            setSelectedLectureId(null)
            setSessions([])
          }}
          isLoading={coursesLoading}
        />
      </div>
      {/* 우측: 회차 그리드 */}
      <div className="flex-1 min-w-0">
        <LectureGrid
          lectures={lectureItems}
          onSelectLecture={(id) => {
            setSelectedLectureId(id)
            setView('quiz-setting')
          }}
          onGoToSessionList={() => {
            if (selectedCourseId) {
              setSessionDisplayCount(3)
              setView('session-list')
            }
          }}
          totalSessionCount={sessions.length}
        />
      </div>
    </div>
  )
}
