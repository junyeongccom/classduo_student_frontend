/**
 * @file QuizGenerationTab.tsx
 * @description 퀴즈 생성 탭 컨테이너 (세션 목록 + 생성 + 상세)
 * @module features/my-quiz
 * @dependencies next-intl, myQuizService
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Loader2 } from 'lucide-react'
import * as myQuizService from '../../services/myQuizService'
import type { QuizSession } from '../../types'
import SessionCard from '../ui/SessionCard'
import CreateSessionForm from '../ui/CreateSessionForm'
import SessionDetailView from './SessionDetailView'

interface QuizGenerationTabProps {
  selectedLectureId: string | null
  selectedCourseId: string | null
}

export default function QuizGenerationTab({
  selectedLectureId,
  selectedCourseId,
}: QuizGenerationTabProps) {
  const t = useTranslations('myQuiz')

  const [sessions, setSessions] = useState<QuizSession[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)

  const fetchSessions = useCallback(async () => {
    if (!selectedLectureId) return
    setIsLoading(true)
    setError(null)

    const result = await myQuizService.getSessions()
    if (result.error || !result.data) {
      setError(result.error?.message ?? t('error.loadFailed'))
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
    fetchSessions()
  }, [fetchSessions])

  // Polling: CREATING 세션이 있으면 3초 간격으로 상태 확인
  useEffect(() => {
    const hasCreating = sessions.some(s => s.status === 'CREATING')
    if (!hasCreating || !selectedLectureId) return

    const startTime = Date.now()
    const MAX_POLL_MS = 5 * 60 * 1000

    const interval = setInterval(async () => {
      if (Date.now() - startTime > MAX_POLL_MS) {
        clearInterval(interval)
        return
      }
      const result = await myQuizService.getSessions()
      if (!result.data) return

      const filtered = (result.data.sessions ?? [])
        .filter(s => s.lecture_id === selectedLectureId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setSessions(filtered)

      const stillCreating = filtered.some(s => s.status === 'CREATING')
      if (!stillCreating) clearInterval(interval)
    }, 3000)

    return () => clearInterval(interval)
  }, [sessions, selectedLectureId])

  const handleDelete = useCallback(async (sessionId: string) => {
    const result = await myQuizService.deleteSession(sessionId)
    if (result.error) return
    setSessions(prev => prev.filter(s => s.session_id !== sessionId))
  }, [])

  const handleSessionCreated = useCallback((newSession: QuizSession) => {
    setSessions(prev => [newSession, ...prev])
    setShowCreateForm(false)
  }, [])

  // 선택된 강의 없으면 안내
  if (!selectedLectureId) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400">
        <p className="text-sm">{t('empty.selectLecture')}</p>
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
        lectureId={selectedLectureId}
        onCreated={handleSessionCreated}
        onCancel={() => setShowCreateForm(false)}
      />
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* 헤더: 새 퀴즈 생성 버튼 */}
      <div className="shrink-0 p-4 pb-2">
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-indigo-300 bg-indigo-50/50 py-3 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50 hover:border-indigo-400"
        >
          <Plus className="h-4 w-4" />
          {t('create.newSession')}
        </button>
      </div>

      {/* 세션 목록 */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
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
        ) : sessions.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <p className="text-sm">{t('empty.noSessions')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sessions.map(session => (
              <SessionCard
                key={session.session_id}
                session={session}
                onSelect={setSelectedSessionId}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
