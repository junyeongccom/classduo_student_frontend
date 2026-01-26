"use client"

import type { ExamPrepQuizItem, ExamPrepQuizSession, ExamPrepQuizType } from '../../types'
import { ExamPrepLoadingState } from './ExamPrepLoadingState'

interface ExamPrepQuizPanelProps {
  sessions: ExamPrepQuizSession[]
  selectedSessionId: string | null
  onSelectSession: (sessionId: string) => void
  onCreateSession: () => void
  isCreating: boolean
  quizTypes: ExamPrepQuizType[]
  onToggleQuizType: (quizType: ExamPrepQuizType) => void
  count: number
  onChangeCount: (value: number) => void
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
  onCreateSession,
  isCreating,
  quizTypes,
  onToggleQuizType,
  count,
  onChangeCount,
  quizzes,
  isLoading,
  onlyWrong,
  onToggleWrong,
  onSubmitAnswer,
  loadingMessage,
  emptyText,
}: ExamPrepQuizPanelProps) {
  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden px-6 py-6">
      <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">퀴즈 생성</p>
            <p className="text-xs text-gray-400">원하는 유형과 문항 수를 선택해 주세요.</p>
          </div>
          <button
            onClick={onCreateSession}
            disabled={isCreating}
            className="rounded-full bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {isCreating ? '생성 중' : '생성'}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {(['RECALL', 'STRUCTURE', 'MISCONCEPTION'] as ExamPrepQuizType[]).map(type => (
            <label key={type} className="flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={quizTypes.includes(type)}
                onChange={() => onToggleQuizType(type)}
                className="h-4 w-4 rounded border-gray-300 text-gray-900"
              />
              {type}
            </label>
          ))}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            문항 수
            <input
              type="number"
              min={1}
              value={count}
              onChange={event => onChangeCount(Number(event.target.value))}
              className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700"
            />
          </div>
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
          <div className="mt-3 flex flex-wrap gap-2">
            {sessions.map(session => (
              <button
                key={session.session_id}
                onClick={() => onSelectSession(session.session_id)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  selectedSessionId === session.session_id
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                {new Date(session.created_at).toLocaleString('ko-KR')}
              </button>
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
                <div className="text-xs text-gray-400">문항 {index + 1} · {quiz.quiz_type}</div>
                <p className="mt-2 text-sm font-semibold text-gray-900">{quiz.question}</p>
                {quiz.choices?.length ? (
                  <div className="mt-3 space-y-2">
                    {quiz.choices.map(choice => (
                      <button
                        key={`${quiz.quiz_id}-${choice.choice_order}`}
                        onClick={() => onSubmitAnswer(quiz.quiz_id, null, choice.choice_order)}
                        className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2 text-left text-xs text-gray-700 hover:border-gray-300"
                      >
                        <span>{choice.choice_order}. {choice.choice_text}</span>
                        {quiz.user_answer?.choice_order === choice.choice_order ? (
                          <span className={`text-[11px] ${quiz.user_answer.is_correct ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {quiz.user_answer.is_correct ? '정답' : '오답'}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
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
                      className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-700"
                    />
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
                {quiz.explanation ? (
                  <p className="mt-3 text-xs text-gray-500">해설: {quiz.explanation}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

