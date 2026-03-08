/**
 * @file SessionCard.tsx
 * @description 퀴즈 세션 카드 UI (풀이 상태 + 점수 + 인라인 편집 + 삭제)
 * @module features/my-quiz
 * @dependencies next-intl, lucide-react
 */

'use client'

import { useState, useRef, useCallback } from 'react'
import { useTranslations, useFormatter } from 'next-intl'
import { Loader2, CheckCircle2, AlertTriangle, Clock, Trash2, Calendar } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { QuizSession, SessionStatus } from '../../types'
import type { SessionSolvingStats } from '../../services/myQuizStatusService'

interface SessionCardProps {
  session: QuizSession
  /** 표시용 라벨 (예: "생명과학 3회차") */
  lectureLabel?: string
  /** 풀이 통계 (answered/correct/total) */
  solvingStats?: SessionSolvingStats | null
  onSelect: (sessionId: string) => void
  onDelete: (sessionId: string) => void
  onRename: (sessionId: string, title: string) => void
}

const MAX_TITLE_LENGTH = 100

export default function SessionCard({
  session,
  lectureLabel,
  solvingStats,
  onSelect,
  onDelete,
  onRename,
}: SessionCardProps) {
  const t = useTranslations('myQuiz.session')
  const format = useFormatter()
  const isClickable = session.status === 'COMPLETED'
  const isFailed = session.status === 'FAILED'
  const isCreating = session.status === 'CREATING'

  // 풀이 완료 여부: 모든 문항 풀이 완료
  const isSolvingComplete = solvingStats != null
    && solvingStats.total > 0
    && solvingStats.answered >= solvingStats.total

  // 점수 계산
  const scorePercent = solvingStats && solvingStats.total > 0
    ? Math.round((solvingStats.correct / solvingStats.total) * 100)
    : null

  // 표시 제목: lectureLabel 우선, 없으면 session.title 또는 날짜
  const displayTitle = lectureLabel
    || session.title
    || format.dateTime(new Date(session.created_at), {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })

  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(displayTitle)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const startEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (isCreating) return
    setEditValue(displayTitle)
    setIsEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [displayTitle, isCreating])

  const commitEdit = useCallback(() => {
    setIsEditing(false)
    const trimmed = editValue.trim()
    if (!trimmed || trimmed === displayTitle || trimmed.length > MAX_TITLE_LENGTH) return
    onRename(session.session_id, trimmed)
  }, [editValue, displayTitle, session.session_id, onRename])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitEdit()
    else if (e.key === 'Escape') {
      setIsEditing(false)
      setEditValue(displayTitle)
    }
  }, [commitEdit, displayTitle])

  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 transition',
        isClickable && 'cursor-pointer hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm',
        !isClickable && !isFailed && 'opacity-75',
      )}
      onClick={() => isClickable && !isEditing && onSelect(session.session_id)}
    >
      {/* 상단: 제목 + 점수/상태 */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              maxLength={MAX_TITLE_LENGTH}
              onChange={e => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleKeyDown}
              onClick={e => e.stopPropagation()}
              className="text-base font-bold text-gray-900 dark:text-gray-50 border-b border-blue-400 bg-transparent outline-none px-0 py-0 w-full"
            />
          ) : (
            <h3
              className={cn(
                'text-base font-bold truncate',
                isFailed ? 'text-red-600' : 'text-gray-900 dark:text-gray-50 cursor-text hover:text-blue-600',
              )}
              onClick={startEdit}
              title={t('rename')}
            >
              {displayTitle}
            </h3>
          )}
        </div>

        {/* 우측: 점수 또는 상태 */}
        <div className="shrink-0 flex items-center gap-2">
          {isCreating ? (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t('creating')}
            </span>
          ) : isFailed ? (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-red-500">
              <AlertTriangle className="h-3.5 w-3.5" />
              {t('failed')}
            </span>
          ) : isSolvingComplete && scorePercent != null ? (
            <span className="inline-flex items-center gap-1 text-sm font-bold text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              {scorePercent}%
            </span>
          ) : solvingStats && solvingStats.answered > 0 ? (
            <span className="text-sm font-medium text-gray-400">
              {t('solvingInProgress')}
            </span>
          ) : isClickable ? (
            <span className="text-sm font-medium text-gray-400">
              {t('solvingNotStarted')}
            </span>
          ) : null}

          {/* 삭제 버튼 */}
          {(isFailed || isClickable) && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                setShowDeleteConfirm(true)
              }}
              className="shrink-0 rounded-md p-1 text-gray-300 dark:text-gray-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition"
              title={t('delete')}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* 학습 일시 */}
      <p className="text-xs text-gray-400 flex items-center gap-1 mt-2">
        <Calendar className="h-3 w-3" />
        {t('studyDate')}: {format.dateTime(new Date(session.created_at), {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit',
        })}
      </p>

      {/* 상태 행 */}
      <div className="mt-1">
        {isFailed ? (
          <p className="text-xs text-red-500">{t('failedMessage')}</p>
        ) : isCreating ? (
          <div className="flex items-center gap-2 mt-0.5">
            <div className="h-1.5 flex-1 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-400 transition-all duration-500"
                style={{
                  width: session.quiz_count > 0
                    ? `${Math.min(100, ((session.generated_count ?? 0) / session.quiz_count) * 100)}%`
                    : '0%',
                }}
              />
            </div>
            <span className="text-xs text-blue-500 tabular-nums shrink-0">
              {t('generatingProgress', {
                current: session.generated_count ?? 0,
                total: session.quiz_count,
              })}
              {' · '}
              {t('estimatedMinutes', {
                minutes: Math.ceil((75 + session.quiz_count * 8) / 60),
              })}
            </span>
          </div>
        ) : solvingStats ? (
          <p className="text-xs text-gray-500 flex items-center gap-1">
            {isSolvingComplete ? (
              <>
                <CheckCircle2 className="h-3 w-3 text-blue-500" />
                {t('solvingStatusComplete')}
              </>
            ) : (
              <>
                <Clock className="h-3 w-3 text-gray-400" />
                {t('solvingStatusProgress', {
                  answered: solvingStats.answered,
                  total: solvingStats.total,
                })}
              </>
            )}
          </p>
        ) : (
          <p className="text-xs text-gray-400">
            {t('quizCount', { count: session.quiz_count })}
          </p>
        )}
      </div>

      {/* 하단 액션 버튼 — 좌측 정렬 */}
      {isClickable && (
        <div className="mt-3">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSelect(session.session_id) }}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
          >
            {isSolvingComplete ? t('viewResult') : t('continueSession')}
          </button>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={e => e.stopPropagation()}
        >
          <div className="mx-4 w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50 text-center mb-2">{t('delete')}</h3>
            <p className="text-sm text-gray-700 dark:text-gray-200 text-center">{t('deleteConfirm')}</p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setShowDeleteConfirm(false) }}
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 transition hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {t('deleteCancel')}
              </button>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setShowDeleteConfirm(false); onDelete(session.session_id) }}
                className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-medium text-white transition hover:bg-red-700"
              >
                {t('deleteConfirmBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
