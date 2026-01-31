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
  isSessionViewOpen: boolean
  currentIndex: number
  totalCount: number
  currentQuiz: ExamPrepQuizItem | null
  onCloseSessionView: () => void
  onPrevQuiz: () => void
  onNextQuiz: () => void
  onGoToFirstQuiz: () => void
  isLoading: boolean
  onlyWrong: boolean
  onToggleWrong: () => void
  onSubmitAnswer: (quizId: string, answerText: string | null, choiceOrder: number | null) => void
  loadingMessage: string
  emptyText: string
  isReviewMode?: boolean
  onStartReview?: () => void
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
  isSessionViewOpen,
  currentIndex,
  totalCount,
  currentQuiz,
  onCloseSessionView,
  onPrevQuiz,
  onNextQuiz,
  onGoToFirstQuiz,
  isLoading,
  onlyWrong,
  onToggleWrong,
  onSubmitAnswer,
  loadingMessage,
  emptyText,
  isReviewMode = false,
  onStartReview,
}: ExamPrepQuizPanelProps) {
  const [openMenuSessionId, setOpenMenuSessionId] = useState<string | null>(null)
  const [renameTargetSessionId, setRenameTargetSessionId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [showResultView, setShowResultView] = useState(false)
  // "결과 보기"를 한 번이라도 눌렀는지 (그때부터 '미답=오답' 표시/채점 적용)
  const [hasFinalizedResults, setHasFinalizedResults] = useState(false)

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

  useEffect(() => {
    if (!isSessionViewOpen) {
      setShowResultView(false)
      setHasFinalizedResults(false)
    }
  }, [isSessionViewOpen])

  const handleConfirmRename = () => {
    if (!renameTargetSessionId) return
    const cleaned = renameValue.trim()
    if (!cleaned) return
    onRenameSession(renameTargetSessionId, cleaned)
    handleCloseRenameModal()
  }

  if (isSessionViewOpen) {
    const safeTotal = totalCount > 0 ? totalCount : 0
    const safeIndex = safeTotal > 0 ? Math.min(Math.max(currentIndex, 0), safeTotal - 1) : 0
    const progressText = safeTotal > 0 ? `${safeIndex + 1}/${safeTotal}` : '0/0'
    const progressRatio = safeTotal > 0 ? (safeIndex + 1) / safeTotal : 0
    const canPrev = safeTotal > 0 && safeIndex > 0
    const canNext = safeTotal > 0 && safeIndex < safeTotal - 1
    const isLastQuiz = safeTotal > 0 && safeIndex === safeTotal - 1

    // 결과 보기 계산
    // "결과 보기"를 누른 이후에는 미답을 오답으로 채점/표시한다.
    const gradedQuizzes = hasFinalizedResults
      ? quizzes.map(quiz => {
          if (!quiz.user_answer) {
            if (quiz.choices?.length) {
              // 객관식: 미답=오답(모든 선지 붉게, '오답' 문구는 표시하지 않음)
              return { ...quiz, user_answer: { is_correct: false, choice_order: null } }
            }
            // 서술형/주관식: 빈칸 제출로 오답 처리
            return { ...quiz, user_answer: { is_correct: false, answer_text: '' } }
          }
          return quiz
        })
      : quizzes

    const correctCount = gradedQuizzes.filter(q => q.user_answer?.is_correct).length
    const totalQuizCount = gradedQuizzes.length

    if (showResultView) {
      // 결과 보기에서는 processedQuizzes 사용
      const score = totalQuizCount > 0 ? Math.round((correctCount / totalQuizCount) * 100) : 0
      return (
        <div className="flex h-full flex-col gap-4 overflow-hidden px-6 py-6">
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onCloseSessionView}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:border-gray-300"
              >
                목록
              </button>
              <div className="flex flex-1 items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-gray-900 transition-[width]"
                    style={{ width: '100%' }}
                  />
                </div>
                <div className="min-w-[52px] text-right text-xs font-semibold text-gray-700">{totalQuizCount}/{totalQuizCount}</div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="flex h-full flex-col items-center justify-center gap-6 px-4 py-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900">퀴즈 결과</h2>
                <p className="mt-2 text-sm text-gray-400">퀴즈를 완료하였습니다. 아래에서 결과를 확인하세요</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-gray-900">
                  <span className="text-2xl font-bold text-gray-900">{score}점</span>
                </div>
                <p className="text-base font-semibold text-gray-900">
                  문제 정답: {correctCount} / {totalQuizCount}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowResultView(false)
                  onGoToFirstQuiz()
                }}
                className="rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white hover:bg-gray-800"
              >
                문제 다시보기
              </button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="flex h-full flex-col gap-4 overflow-hidden px-6 py-6">
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCloseSessionView}
              className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:border-gray-300"
            >
              목록
            </button>
            <div className="flex flex-1 items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-gray-900 transition-[width]"
                  style={{ width: `${Math.round(progressRatio * 100)}%` }}
                />
              </div>
              <div className="min-w-[52px] text-right text-xs font-semibold text-gray-700">{progressText}</div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {isLoading ? (
            <ExamPrepLoadingState message={loadingMessage} />
          ) : !currentQuiz ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">{emptyText}</div>
          ) : (
            <div className="flex h-full flex-col overflow-y-auto px-4 py-4">
              <div className="flex-1">
                <div className="text-xs text-gray-400">문항 {safeIndex + 1}</div>
                <p className="mt-2 text-sm font-semibold text-gray-900">{currentQuiz.question}</p>

                {currentQuiz.choices?.length ? (
                  <div className="mt-4 space-y-2">
                    {currentQuiz.choices.map(choice => {
                      const baseQuiz = quizzes.find(q => q.quiz_id === currentQuiz.quiz_id) || currentQuiz
                      const displayQuiz = gradedQuizzes.find(q => q.quiz_id === currentQuiz.quiz_id) || currentQuiz
                      const isSelected = displayQuiz.user_answer?.choice_order === choice.choice_order
                      const isCorrect = !!displayQuiz.user_answer?.is_correct
                      // 미답을 오답 처리하는 건 "결과 보기" 이후에만
                      const isUnansweredWrong =
                        hasFinalizedResults &&
                        !baseQuiz.user_answer &&
                        !isCorrect &&
                        displayQuiz.user_answer?.choice_order === null
                      
                      // 풀지 않은 문제는 모든 선지에 붉은 색 표시
                      const selectedStyle = isUnansweredWrong
                        ? 'border-rose-200 bg-rose-50'
                        : isSelected
                        ? isCorrect
                          ? 'border-emerald-200 bg-emerald-50'
                          : 'border-rose-200 bg-rose-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                      const labelTone = isUnansweredWrong
                        ? 'text-rose-600'
                        : isSelected
                        ? isCorrect
                          ? 'text-emerald-600'
                          : 'text-rose-600'
                        : 'text-gray-700'
                      return (
                        <button
                          key={`${currentQuiz.quiz_id}-${choice.choice_order}`}
                          onClick={() => onSubmitAnswer(currentQuiz.quiz_id, null, choice.choice_order)}
                          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs ${selectedStyle} ${labelTone}`}
                        >
                          <span>{choice.choice_order}. {choice.choice_text}</span>
                          {isSelected && !isUnansweredWrong ? (
                            <span className={`text-[11px] ${isCorrect ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {isCorrect ? '정답' : '오답'}
                            </span>
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="mt-4 flex gap-2">
                    <div className="relative flex-1">
                      <input
                        key={`quiz-input-${currentQuiz.quiz_id}`}
                        type="text"
                        id={`quiz-input-${currentQuiz.quiz_id}`}
                        placeholder="답을 입력하세요"
                        defaultValue={currentQuiz.user_answer?.answer_text ?? ''}
                        onKeyDown={event => {
                          if (event.key === 'Enter') {
                            onSubmitAnswer(currentQuiz.quiz_id, event.currentTarget.value, null)
                          }
                        }}
                        className={`w-full rounded-xl border px-3 py-2 pr-12 text-xs ${
                          (() => {
                            const baseQuiz = quizzes.find(q => q.quiz_id === currentQuiz.quiz_id) || currentQuiz
                            const displayQuiz = gradedQuizzes.find(q => q.quiz_id === currentQuiz.quiz_id) || currentQuiz
                            const hasAnswer = !!displayQuiz.user_answer
                            // 결과 보기 이후, 미답은 오답(빨강)으로 표시
                            const isUnansweredWrong =
                              hasFinalizedResults && !baseQuiz.user_answer && !!displayQuiz.user_answer && displayQuiz.user_answer.answer_text === ''

                            if (isUnansweredWrong) return 'border-rose-200 bg-rose-50 text-rose-700'
                            if (hasAnswer) {
                              return displayQuiz.user_answer?.is_correct
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-rose-200 bg-rose-50 text-rose-700'
                            }
                            return 'border-gray-200 bg-white text-gray-700'
                          })()
                        }`}
                      />
                      {(() => {
                        const displayQuiz = gradedQuizzes.find(q => q.quiz_id === currentQuiz.quiz_id) || currentQuiz
                        return displayQuiz.user_answer && displayQuiz.user_answer.answer_text !== '' ? (
                          <span
                            className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold ${
                              displayQuiz.user_answer.is_correct ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {displayQuiz.user_answer.is_correct ? '정답' : '오답'}
                          </span>
                        ) : null
                      })()}
                    </div>
                    <button
                      onClick={() => {
                        const input = document.getElementById(`quiz-input-${currentQuiz.quiz_id}`) as HTMLInputElement | null
                        const value = input?.value ?? ''
                        onSubmitAnswer(currentQuiz.quiz_id, value, null)
                      }}
                      className="rounded-xl bg-gray-900 px-3 py-2 text-xs font-semibold text-white"
                    >
                      제출
                    </button>
                  </div>
                )}

                {(() => {
                  const displayQuiz = gradedQuizzes.find(q => q.quiz_id === currentQuiz.quiz_id) || currentQuiz
                  return !currentQuiz.choices?.length &&
                    displayQuiz.user_answer &&
                    !displayQuiz.user_answer.is_correct &&
                    currentQuiz.answer ? (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="whitespace-nowrap rounded-full bg-black px-2 py-1 text-[11px] font-semibold text-white">정답</span>
                      <span 
                        className="text-xs text-gray-900"
                        onCopy={(e) => {
                          const answerText = typeof currentQuiz.answer === 'string' ? currentQuiz.answer : String(currentQuiz.answer || '')
                          e.clipboardData.setData('text/plain', answerText)
                          e.preventDefault()
                        }}
                      >
                        {typeof currentQuiz.answer === 'string' ? currentQuiz.answer : String(currentQuiz.answer || '')}
                      </span>
                    </div>
                  ) : null
                })()}

                {(() => {
                  const displayQuiz = gradedQuizzes.find(q => q.quiz_id === currentQuiz.quiz_id) || currentQuiz
                  return currentQuiz.explanation && displayQuiz.user_answer ? (
                    <div className="mt-3 flex items-start gap-2">
                      <span className="whitespace-nowrap rounded-full bg-black px-2 py-1 text-[11px] font-semibold text-white">해설</span>
                      <span 
                        className="text-xs text-gray-700"
                        onCopy={(e) => {
                          const explanationText = typeof currentQuiz.explanation === 'string' ? currentQuiz.explanation : String(currentQuiz.explanation || '')
                          e.clipboardData.setData('text/plain', explanationText)
                          e.preventDefault()
                        }}
                      >
                        {typeof currentQuiz.explanation === 'string' ? currentQuiz.explanation : String(currentQuiz.explanation || '')}
                      </span>
                    </div>
                  ) : null
                })()}
              </div>

              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onPrevQuiz}
                  disabled={!canPrev}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-40"
                >
                  이전
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (isLastQuiz) {
                      if (!isReviewMode) {
                        setHasFinalizedResults(true)
                        setShowResultView(true)
                      }
                      return
                    }
                    onNextQuiz()
                  }}
                  disabled={isReviewMode ? isLastQuiz : false}
                  className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {isLastQuiz && !isReviewMode ? '결과 보기' : '다음'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
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
          <div>
            <p className="text-base font-bold text-gray-900">복습하기</p>
            <p className="text-sm text-gray-500">지금까지 틀린 모든 문제를 다시 풀어보세요</p>
          </div>
          <button
            onClick={onStartReview}
            disabled={!onStartReview || sessions.length === 0}
            className="rounded-full bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
          >
            다시 풀기
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900">내 퀴즈</p>
        </div>
        {sessions.length === 0 ? (
          <p className="mt-3 text-xs text-gray-400">생성된 퀴즈 세션이 없습니다.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {sessions.map(session => (
              <div key={session.session_id} className="relative">
                <div
                  onClick={() => onSelectSession(session.session_id)}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left cursor-pointer ${
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
                </div>
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

