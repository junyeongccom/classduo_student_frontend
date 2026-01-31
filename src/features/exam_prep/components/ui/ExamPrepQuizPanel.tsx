"use client"

import type { ExamPrepQuizItem, ExamPrepQuizSession } from '../../types'
import { ExamPrepLoadingState } from './ExamPrepLoadingState'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

interface ExamPrepQuizPanelProps {
  sessions: ExamPrepQuizSession[]
  selectedSessionId: string | null
  onSelectSession: (sessionId: string) => void
  onRenameSession: (sessionId: string, title: string) => void
  onDeleteSession: (sessionId: string) => void
  onCreateSession: () => void
  isCreating: boolean
  quizzes: ExamPrepQuizItem[]
  isLoading: boolean
  onlyWrong: boolean
  onToggleWrong: () => void
  onSubmitAnswer: (quizId: string, answerText: string | null, choiceOrder: number | null) => void
  loadingMessage: string
  emptyText: string
}

export function ExamPrepQuizPanel({
  sessions,
  selectedSessionId,
  onSelectSession,
  onRenameSession,
  onDeleteSession,
  onCreateSession,
  isCreating,
  quizzes,
  isLoading,
  onlyWrong,
  onToggleWrong,
  onSubmitAnswer,
  loadingMessage,
  emptyText,
}: ExamPrepQuizPanelProps) {
  const [openMenuSessionId, setOpenMenuSessionId] = useState<string | null>(null)
  const [renameTargetSessionId, setRenameTargetSessionId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  useEffect(() => {
    if (!openMenuSessionId) return
    const handleClick = () => setOpenMenuSessionId(null)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [openMenuSessionId])

  const handleOpenRenameModal = (session: ExamPrepQuizSession) => {
    setRenameTargetSessionId(session.session_id)
    setRenameValue(session.title?.trim() ? session.title : '')
    setOpenMenuSessionId(null)
  }

  const handleCloseRenameModal = () => {
    setRenameTargetSessionId(null)
    setRenameValue('')
  }

  const handleConfirmRename = () => {
    if (!renameTargetSessionId) return
    const cleaned = renameValue.trim()
    if (!cleaned) return
    onRenameSession(renameTargetSessionId, cleaned)
    handleCloseRenameModal()
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden px-6 py-6">
      <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base font-bold text-gray-900">퀴즈 생성</p>
            <p className="text-sm text-gray-500">원하는 문제 유형, 난이도 등으로 퀴즈 세트를 만들어보세요</p>
          </div>
          <button
            onClick={onCreateSession}
            disabled={isCreating}
            className="rounded-full bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {isCreating ? '생성 중' : '생성'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900">내 퀴즈</p>
          <button
            onClick={onToggleWrong}
            className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-500 hover:border-gray-300 hover:text-gray-700"
          >
            {onlyWrong ? '전체 보기' : '오답만'}
          </button>
        </div>
        {sessions.length === 0 ? (
          <p className="mt-3 text-xs text-gray-400">생성된 퀴즈 세션이 없습니다.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {sessions.map(session => (
              <div key={session.session_id} className="relative">
                <button
                  onClick={() => onSelectSession(session.session_id)}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left ${
                    selectedSessionId === session.session_id
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      {session.title?.trim()
                        ? session.title
                        : new Date(session.created_at).toLocaleString('ko-KR')}
                    </div>
                    <div className={`mt-1 truncate text-xs ${selectedSessionId === session.session_id ? 'text-white/70' : 'text-gray-400'}`}>
                      {new Date(session.created_at).toLocaleString('ko-KR')}
                    </div>
                  </div>
                  <span className="relative ml-3 flex items-center">
                    <button
                      type="button"
                      aria-label="Quiz session menu"
                      onClick={event => {
                        event.stopPropagation()
                        setOpenMenuSessionId(prev => (prev === session.session_id ? null : session.session_id))
                      }}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg border ${
                        selectedSessionId === session.session_id
                          ? 'border-white/20 hover:bg-white/10'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <MoreVertical className={`h-4 w-4 ${selectedSessionId === session.session_id ? 'text-white' : 'text-gray-500'}`} />
                    </button>
                  </span>
                </button>
                {openMenuSessionId === session.session_id ? (
                  <div
                    className="absolute right-3 top-[52px] z-10 w-40 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
                    onClick={event => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
                      onClick={() => {
                        handleOpenRenameModal(session)
                      }}
                    >
                      <Pencil className="h-4 w-4 text-gray-500" />
                      이름 변경
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-rose-600 hover:bg-rose-50"
                      onClick={() => {
                        const confirmed = window.confirm('이 퀴즈 세션을 삭제할까요?')
                        if (!confirmed) return
                        onDeleteSession(session.session_id)
                        setOpenMenuSessionId(null)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      삭제
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {isLoading ? (
          <ExamPrepLoadingState message={loadingMessage} />
        ) : quizzes.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">{emptyText}</div>
        ) : (
          <div className="flex h-full flex-col gap-4 overflow-y-auto px-4 py-4">
            {quizzes.map((quiz, index) => (
              <div key={quiz.quiz_id} className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs text-gray-400">문항 {index + 1}</div>
                <p className="mt-2 text-sm font-semibold text-gray-900">{quiz.question}</p>
                {quiz.choices?.length ? (
                  <div className="mt-3 space-y-2">
                    {quiz.choices.map(choice => (
                      (() => {
                        const isSelected = quiz.user_answer?.choice_order === choice.choice_order
                        const isCorrect = !!quiz.user_answer?.is_correct
                        const selectedStyle = isSelected
                          ? isCorrect
                            ? 'border-emerald-200 bg-emerald-50'
                            : 'border-rose-200 bg-rose-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                        const labelTone = isSelected
                          ? isCorrect
                            ? 'text-emerald-600'
                            : 'text-rose-600'
                          : 'text-gray-700'
                        return (
                      <button
                        key={`${quiz.quiz_id}-${choice.choice_order}`}
                        onClick={() => onSubmitAnswer(quiz.quiz_id, null, choice.choice_order)}
                        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs ${selectedStyle} ${labelTone}`}
                      >
                        <span>{choice.choice_order}. {choice.choice_text}</span>
                        {quiz.user_answer?.choice_order === choice.choice_order ? (
                          <span className={`text-[11px] ${quiz.user_answer.is_correct ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {quiz.user_answer.is_correct ? '정답' : '오답'}
                          </span>
                        ) : null}
                      </button>
                        )
                      })()
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        id={`quiz-input-${quiz.quiz_id}`}
                        placeholder="답을 입력하세요"
                        defaultValue={quiz.user_answer?.answer_text ?? ''}
                        onKeyDown={event => {
                          if (event.key === 'Enter') {
                            onSubmitAnswer(quiz.quiz_id, event.currentTarget.value, null)
                          }
                        }}
                        className={`w-full rounded-xl border px-3 py-2 pr-12 text-xs text-gray-700 ${
                          quiz.user_answer
                            ? quiz.user_answer.is_correct
                              ? 'border-emerald-200 bg-emerald-50'
                              : 'border-rose-200 bg-rose-50'
                            : 'border-gray-200 bg-white'
                        }`}
                      />
                      {quiz.user_answer ? (
                        <span
                          className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold ${
                            quiz.user_answer.is_correct ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {quiz.user_answer.is_correct ? '정답' : '오답'}
                        </span>
                      ) : null}
                    </div>
                    <button
                      onClick={() => {
                        const input = document.getElementById(`quiz-input-${quiz.quiz_id}`) as HTMLInputElement | null
                        const value = input?.value ?? ''
                        onSubmitAnswer(quiz.quiz_id, value, null)
                      }}
                      className="rounded-xl bg-gray-900 px-3 py-2 text-xs font-semibold text-white"
                    >
                      제출
                    </button>
                  </div>
                )}
                {!quiz.choices?.length && quiz.user_answer && !quiz.user_answer.is_correct && quiz.answer ? (
                  <p className="mt-2 text-xs text-gray-600">정답: {quiz.answer}</p>
                ) : null}
                {quiz.explanation && quiz.user_answer ? (
                  <p className="mt-3 text-xs text-gray-500">해설: {quiz.explanation}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {renameTargetSessionId ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 px-6"
          onClick={handleCloseRenameModal}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            onClick={event => event.stopPropagation()}
          >
            <div className="text-base font-semibold text-gray-900">이름 변경</div>
            <div className="mt-1 text-sm text-gray-500">변경할 이름을 입력해 주세요.</div>
            <input
              value={renameValue}
              onChange={event => setRenameValue(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  handleConfirmRename()
                }
              }}
              autoFocus
              className="mt-4 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-gray-300"
              placeholder="예) 1차 복습 퀴즈"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:border-gray-300"
                onClick={handleCloseRenameModal}
              >
                취소
              </button>
              <button
                type="button"
                className="rounded-xl bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-800"
                onClick={handleConfirmRename}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

