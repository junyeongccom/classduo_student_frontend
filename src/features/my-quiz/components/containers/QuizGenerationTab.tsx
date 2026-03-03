/**
 * @file QuizGenerationTab.tsx
 * @description 퀴즈 생성 탭 컨테이너 (세션 목록 + 생성 + 상세)
 * @module features/my-quiz
 * @dependencies next-intl, myQuizService
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Loader2 } from 'lucide-react'
import * as myQuizService from '../../services/myQuizService'
import type { QuizSession } from '../../types'
import { useToast } from '@/shared/hooks/useToast'
import SessionCard from '../ui/SessionCard'
import CreateSessionForm from '../ui/CreateSessionForm'
import SessionDetailView from './SessionDetailView'

const ALLOWED_QUIZ_TYPES = ['DEF_TO_TERM', 'TERM_TO_DEF', 'MISCONCEPTION', 'STRUCTURE_OBJ'] as const

interface QuizGenerationTabProps {
  selectedLectureId: string | null
}

export default function QuizGenerationTab({
  selectedLectureId,
}: QuizGenerationTabProps) {
  const t = useTranslations('myQuiz')
  const { toasts, error: showErrorToast } = useToast()

  const [sessions, setSessions] = useState<QuizSession[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [pollingTimedOut, setPollingTimedOut] = useState(false)
  const pollStartTimeRef = useRef<number | null>(null)

  const fetchSessions = useCallback(async () => {
    if (!selectedLectureId) return
    setIsLoading(true)
    setError(null)

    const result = await myQuizService.getSessions()
    if (result.error || !result.data) {
      if (process.env.NODE_ENV === 'development') console.error('[QuizGenerationTab] fetchSessions error:', result.error)
      setError(t('error.loadFailed'))
      setIsLoading(false)
      return
    }

    const filtered = (result.data.sessions ?? [])
      .filter(s => s.lecture_id === selectedLectureId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    setSessions(filtered)
    setIsLoading(false)
  }, [selectedLectureId, t])

  useEffect(() => {
    setSessions([])
    setSelectedSessionId(null)
    setShowCreateForm(false)
    setError(null)
    setPollingTimedOut(false)
    fetchSessions()
  }, [fetchSessions])

  // Polling: CREATING 세션이 있으면 3초 간격으로 상태 확인
  const hasCreatingRef = useRef(false)
  hasCreatingRef.current = sessions.some(s => s.status === 'CREATING')

  useEffect(() => {
    if (!hasCreatingRef.current || !selectedLectureId) return

    if (pollStartTimeRef.current === null) {
      pollStartTimeRef.current = Date.now()
    }
    setPollingTimedOut(false)
    const MAX_POLL_MS = 5 * 60 * 1000

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
        .filter(s => s.lecture_id === selectedLectureId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setSessions(filtered)

      const stillCreating = filtered.some(s => s.status === 'CREATING')
      if (!stillCreating) {
        clearInterval(interval)
        pollStartTimeRef.current = null
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [selectedLectureId, sessions.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = useCallback(async (sessionId: string) => {
    const result = await myQuizService.deleteSession(sessionId)
    if (result.error) {
      showErrorToast(t('error.deleteFailed'))
      return
    }
    setSessions(prev => prev.filter(s => s.session_id !== sessionId))
  }, [showErrorToast, t])

  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const handleCreateSubmit = useCallback(async (quizCount: number, quizTypes: string[]) => {
    if (!selectedLectureId || isCreating) return
    setIsCreating(true)
    setCreateError(null)

    // 런타임 검증: quizCount 범위 클램핑 + quizTypes 허용 목록 필터링
    const safeCount = Math.max(1, Math.min(30, quizCount))
    const safeTypes = quizTypes.filter(type => (ALLOWED_QUIZ_TYPES as readonly string[]).includes(type))
    if (safeTypes.length === 0) {
      setCreateError(t('error.createFailed'))
      setIsCreating(false)
      return
    }

    const result = await myQuizService.createSession(selectedLectureId, safeCount, safeTypes)
    if (result.error || !result.data) {
      // API 400 → 스냅샷 부재 가능성 특별 분기
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
      course_id: '',
      generation_batch_id: null,
      language: null,
      status: 'CREATING',
      quiz_count: quizCount,
      title: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    setSessions(prev => [newSession, ...prev])
    setShowCreateForm(false)
    setIsCreating(false)
  }, [selectedLectureId, isCreating, t])

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

  // 선택된 강의 없으면 안내
  if (!selectedLectureId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-400 px-6">
        <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
        </svg>
        <p className="text-sm text-center">{t('empty.selectLectureGuide')}</p>
      </div>
    )
  }

  // 세션 상세 모드
  if (selectedSessionId) {
    return (
      <SessionDetailView
        sessionId={selectedSessionId}
        lectureId={selectedLectureId}
        onBack={() => setSelectedSessionId(null)}
      />
    )
  }

  // 세션 생성 폼 모드
  if (showCreateForm) {
    return (
      <CreateSessionForm
        onSubmit={handleCreateSubmit}
        onCancel={() => setShowCreateForm(false)}
        isSubmitting={isCreating}
        error={createError}
      />
    )
  }

  return (
    <div className="relative flex h-full flex-col">
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
      {/* 세션 목록 */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="mx-auto max-w-xl">
          {/* 새 퀴즈 생성 버튼 */}
          <div className="pt-4 pb-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-indigo-300 bg-indigo-50/50 py-3 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50 hover:border-indigo-400"
            >
              <Plus className="h-4 w-4" />
              {t('create.newSession')}
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <p className="text-sm text-red-500">{error}</p>
              <button
                type="button"
                onClick={fetchSessions}
                className="text-xs text-indigo-600 hover:underline"
              >
                {t('error.retry')}
              </button>
            </div>
          ) : pollingTimedOut ? (
            <div className="flex flex-col gap-2">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
                <p className="text-sm text-amber-700">{t('session.pollingTimeout')}</p>
              </div>
              {sessions.map(session => (
                <SessionCard
                  key={session.session_id}
                  session={session}
                  onSelect={setSelectedSessionId}
                  onDelete={handleDelete}
                  onRename={handleRename}
                />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <p className="text-sm text-gray-500">{t('empty.noSessions')}</p>
              {/* 퀴즈 썸네일 템플릿 프리뷰 */}
              <div className="w-full max-w-xs space-y-2">
                <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2 w-2 rounded-full bg-indigo-400" />
                    <div className="h-2 w-20 rounded bg-gray-200" />
                    <div className="ml-auto h-2 w-10 rounded bg-gray-100" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-2 w-full rounded bg-gray-100" />
                    <div className="h-2 w-3/4 rounded bg-gray-100" />
                  </div>
                  <div className="mt-2.5 flex gap-1.5">
                    <div className="h-6 flex-1 rounded bg-indigo-50 border border-indigo-100" />
                    <div className="h-6 flex-1 rounded bg-gray-50 border border-gray-100" />
                    <div className="h-6 flex-1 rounded bg-gray-50 border border-gray-100" />
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm opacity-60">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-400" />
                    <div className="h-2 w-16 rounded bg-gray-200" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-2 w-full rounded bg-gray-100" />
                    <div className="h-2 w-2/3 rounded bg-gray-100" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {sessions.map(session => (
                <SessionCard
                  key={session.session_id}
                  session={session}
                  onSelect={setSelectedSessionId}
                  onDelete={handleDelete}
                  onRename={handleRename}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
