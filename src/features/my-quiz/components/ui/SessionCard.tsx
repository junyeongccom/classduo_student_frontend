/**
 * @file SessionCard.tsx
 * @description 퀴즈 세션 카드 UI (상태별 뱃지 + 인라인 제목 편집 + 삭제)
 * @module features/my-quiz
 * @dependencies next-intl, lucide-react
 */

'use client'

import { useState, useRef, useCallback } from 'react'
import { useTranslations, useFormatter } from 'next-intl'
import { Loader2, CheckCircle2, AlertTriangle, Trash2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { QuizSession, SessionStatus } from '../../types'

interface SessionCardProps {
  session: QuizSession
  onSelect: (sessionId: string) => void
  onDelete: (sessionId: string) => void
  onRename: (sessionId: string, title: string) => void
}

function StatusBadge({ status }: { status: SessionStatus }) {
  const t = useTranslations('myQuiz.session')

  switch (status) {
    case 'CREATING':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
          <Loader2 className="h-3 w-3 animate-spin" />
          {t('creating')}
        </span>
      )
    case 'COMPLETED':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-600">
          <CheckCircle2 className="h-3 w-3" />
          {t('completed')}
        </span>
      )
    case 'FAILED':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
          <AlertTriangle className="h-3 w-3" />
          {t('failed')}
        </span>
      )
  }
}

const MAX_TITLE_LENGTH = 100

export default function SessionCard({ session, onSelect, onDelete, onRename }: SessionCardProps) {
  const t = useTranslations('myQuiz.session')
  const format = useFormatter()
  const isClickable = session.status === 'COMPLETED'
  const isFailed = session.status === 'FAILED'

  const displayTitle = session.title || format.dateTime(new Date(session.created_at), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(displayTitle)
  const inputRef = useRef<HTMLInputElement>(null)

  const startEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (session.status === 'CREATING') return
    setEditValue(displayTitle)
    setIsEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [displayTitle, session.status])

  const commitEdit = useCallback(() => {
    setIsEditing(false)
    const trimmed = editValue.trim()
    if (!trimmed || trimmed === displayTitle || trimmed.length > MAX_TITLE_LENGTH) return
    onRename(session.session_id, trimmed)
  }, [editValue, displayTitle, session.session_id, onRename])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      commitEdit()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
      setEditValue(displayTitle)
    }
  }, [commitEdit, displayTitle])

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 transition',
        isClickable && 'cursor-pointer hover:border-indigo-300 hover:shadow-sm',
        !isClickable && !isFailed && 'opacity-75',
      )}
      onClick={() => isClickable && !isEditing && onSelect(session.session_id)}
    >
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <div className="flex items-center gap-2">
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
              className="text-sm font-medium text-gray-900 border-b border-indigo-400 bg-transparent outline-none px-0 py-0 w-full"
            />
          ) : (
            <span
              className={cn(
                'text-sm font-medium truncate',
                isFailed ? 'text-red-600' : 'cursor-text hover:text-indigo-600',
              )}
              onClick={startEdit}
              title={t('rename')}
            >
              {displayTitle}
            </span>
          )}
          <StatusBadge status={session.status} />
        </div>
        {isFailed ? (
          <p className="text-xs text-red-500">{t('failedMessage')}</p>
        ) : session.status === 'CREATING' ? (
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
            </span>
          </div>
        ) : (
          <p className="text-xs text-gray-400">
            {t('quizCount', { count: session.quiz_count })}
          </p>
        )}
      </div>

      {(isFailed || isClickable) && (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            if (!window.confirm(t('deleteConfirm'))) return
            onDelete(session.session_id)
          }}
          className="ml-2 shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition"
          title={t('delete')}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
