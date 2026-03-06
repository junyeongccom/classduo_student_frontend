/**
 * @file StudentQuizCard.tsx
 * @description 학생용 퀴즈 카드 — 즐겨찾기 + 풀이결과 추적 (도메인 비의존 공유 컴포넌트)
 * @module shared/components/quiz
 * @dependencies lucide-react, next-intl
 */

'use client'

import { useState, useCallback } from 'react'
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Bookmark,
  Trash2,
} from 'lucide-react'
import { useTranslations } from 'next-intl'

/* ───────────── 타입 ───────────── */

export type StudentQuizType =
  | 'RECALL'
  | 'STRUCTURE'
  | 'STRUCTURE_OBJ'
  | 'MISCONCEPTION'
  | 'DEF_TO_TERM'
  | 'TERM_TO_DEF'

export interface StudentQuizChoice {
  choice_id: string
  choice_order: number
  choice_text: string
  is_correct: boolean
  choice_explanation: string | null
}

export interface StudentQuizItem {
  quiz_id: string
  quiz_type: StudentQuizType
  question: string
  answer: string | null
  explanation: string | null
  difficulty: string | null
  choices: StudentQuizChoice[]
}

export interface StudentQuizCardProps {
  quiz: StudentQuizItem
  index: number
  /** 즐겨찾기 여부 */
  isBookmarked: boolean
  /** 풀이 결과 (true=정답, false=오답, null=미풀이) */
  isCorrect: boolean | null
  /** 이전에 선택한 선지 번호 (choice_order, 1-based). 재방문 시 하이라이트 복원용 */
  selectedAnswer?: number | null
  /** 즐겨찾기 토글 콜백 */
  onBookmarkToggle: (quizId: string) => void
  /** 풀이 결과 업데이트 콜백 (선지 클릭 시 호출, answer는 choice_order) */
  onCorrectUpdate: (quizId: string, isCorrect: boolean, answer: number) => void
  /** 선택 해제(리셋) 콜백 — 제공 시 이미 선택한 선지 재클릭으로 풀이 초기화 가능 */
  onResetAnswer?: (quizId: string) => void
  /** 오답노트 삭제 모드 — true면 북마크 대신 삭제 버튼 표시 */
  wrongNoteMode?: boolean
  /** 오답노트 삭제 콜백 */
  onDismissWrongNote?: (quizId: string) => void
}

/* ───────────── 상수 ───────────── */

const CHOICE_LABELS = ['A', 'B', 'C', 'D', 'E', 'F']

const QUIZ_TYPE_BADGE: Record<StudentQuizType, string> = {
  RECALL: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  STRUCTURE: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  STRUCTURE_OBJ: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  MISCONCEPTION: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  DEF_TO_TERM: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  TERM_TO_DEF: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
}

/** 풀이 상태에 따른 카드 테두리 스타일 */
function getCardBorderStyle(isCorrect: boolean | null): string {
  if (isCorrect === true) return 'border-gray-200 dark:border-gray-700'
  if (isCorrect === false) return 'border-gray-200 dark:border-gray-700'
  return 'border-gray-200 dark:border-gray-700'
}

/* ───────────── 컴포넌트 ───────────── */

export function StudentQuizCard({
  quiz,
  index,
  isBookmarked,
  isCorrect,
  selectedAnswer,
  onBookmarkToggle,
  onCorrectUpdate,
  onResetAnswer,
  wrongNoteMode,
  onDismissWrongNote,
}: StudentQuizCardProps) {
  const isMultipleChoice =
    quiz.quiz_type === 'MISCONCEPTION' ||
    quiz.quiz_type === 'DEF_TO_TERM' ||
    quiz.quiz_type === 'TERM_TO_DEF' ||
    quiz.quiz_type === 'STRUCTURE_OBJ'

  const [selectedChoiceIdx, setSelectedChoiceIdx] = useState<number | null>(() => {
    if (isCorrect !== null && isMultipleChoice && selectedAnswer != null) {
      return quiz.choices.findIndex((c) => c.choice_order === selectedAnswer)
    }
    return null
  })
  const [isSubmitted, setIsSubmitted] = useState(() => isCorrect !== null)
  const [showAnswer, setShowAnswer] = useState(false)
  const t = useTranslations('lectureStudy.quiz')

  const badge = QUIZ_TYPE_BADGE[quiz.quiz_type]

  const hasAnswered = isCorrect !== null || isSubmitted

  const handleChoiceClick = useCallback(
    (idx: number) => {
      if (showAnswer) return

      // 이미 제출된 상태에서 선택했던 선지를 다시 클릭 → 리셋
      if (isSubmitted && selectedChoiceIdx === idx && onResetAnswer) {
        setSelectedChoiceIdx(null)
        setIsSubmitted(false)
        onResetAnswer(quiz.quiz_id)
        return
      }

      if (isSubmitted) return

      setSelectedChoiceIdx(idx)
      const selectedChoice = quiz.choices[idx]
      if (selectedChoice) {
        setIsSubmitted(true)
        onCorrectUpdate(quiz.quiz_id, selectedChoice.is_correct, selectedChoice.choice_order)
      }
    },
    [isSubmitted, showAnswer, selectedChoiceIdx, quiz.choices, quiz.quiz_id, onCorrectUpdate, onResetAnswer],
  )

  const handleToggleAnswer = useCallback(() => {
    setShowAnswer((prev) => !prev)
  }, [])

  const handleBookmarkClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!hasAnswered) return
      onBookmarkToggle(quiz.quiz_id)
    },
    [quiz.quiz_id, onBookmarkToggle, hasAnswered],
  )

  /* 선지 스타일 */
  const getChoiceStyle = (choice: StudentQuizChoice, idx: number) => {
    const isSelected = selectedChoiceIdx === idx

    if (!isSubmitted) {
      return 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer'
    }

    if (isSelected && choice.is_correct) {
      return 'border-green-300 bg-green-50/60 dark:border-green-700 dark:bg-green-900/20 cursor-pointer'
    }
    if (isSelected && !choice.is_correct) {
      return 'border-red-300 bg-red-50/60 dark:border-red-700 dark:bg-red-900/20 cursor-pointer'
    }

    if (showAnswer && choice.is_correct) {
      return 'border-green-300 bg-green-50/60 dark:border-green-700 dark:bg-green-900/20'
    }

    return 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 opacity-60'
  }

  const getChoiceLabelStyle = (choice: StudentQuizChoice, idx: number) => {
    const isSelected = selectedChoiceIdx === idx

    if (!isSubmitted) {
      return 'text-gray-400'
    }

    if (isSelected && choice.is_correct) return 'text-green-600 dark:text-green-400 font-bold'
    if (isSelected && !choice.is_correct) return 'text-red-500 dark:text-red-400 font-bold'
    if (showAnswer && choice.is_correct) return 'text-green-600 dark:text-green-400 font-bold'
    return 'text-gray-400'
  }

  return (
    <article
      className={`rounded-2xl border bg-white dark:bg-gray-800 p-5 shadow-sm ${getCardBorderStyle(isCorrect)}`}
    >
      {/* 헤더: 번호 + 유형 뱃지 + 즐겨찾기 Star */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-bold text-[#6366F1]">Q{index + 1}</span>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge}`}
        >
          {t(`typeLabel.${quiz.quiz_type}`)}
        </span>
        {isMultipleChoice && (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
            {t('format.multipleChoice')}
          </span>
        )}
        {quiz.quiz_type === 'RECALL' && (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
            {t('format.shortAnswer')}
          </span>
        )}
        {quiz.quiz_type === 'STRUCTURE' && (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
            {t('format.essay')}
          </span>
        )}

        {/* 우측 액션 버튼 — 오답노트 모드: 삭제 / 일반 모드: 즐겨찾기 */}
        <div className="group relative ml-auto">
          {wrongNoteMode ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onDismissWrongNote?.(quiz.quiz_id)
                }}
                disabled={isCorrect === false}
                className={`p-1 rounded-full transition-colors ${
                  isCorrect === false
                    ? 'cursor-not-allowed opacity-40'
                    : 'hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer'
                }`}
                aria-label={t('wrongNoteDismiss')}
              >
                <Trash2
                  className={`h-4 w-4 transition-colors ${
                    isCorrect === false
                      ? 'text-gray-300 dark:text-gray-600'
                      : 'text-red-400 hover:text-red-500'
                  }`}
                />
              </button>
              {isCorrect === false && (
                <div className="pointer-events-none absolute right-0 bottom-full mb-2 z-20 w-max max-w-[200px] opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  <div className="rounded-md bg-gray-900 px-2.5 py-1.5 text-[11px] text-white shadow-sm">
                    {t('wrongNoteDismissDisabledTooltip')}
                  </div>
                  <div className="absolute right-3 top-full h-1.5 w-1.5 rotate-45 bg-gray-900" />
                </div>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleBookmarkClick}
                disabled={!hasAnswered}
                className={`p-1 rounded-full transition-colors ${
                  hasAnswered
                    ? 'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer'
                    : 'cursor-not-allowed opacity-40'
                }`}
                aria-label={isBookmarked ? t('bookmarkRemove') : t('bookmarkAdd')}
              >
                <Bookmark
                  className={`h-4 w-4 transition-colors ${
                    isBookmarked
                      ? 'fill-blue-500 text-blue-500'
                      : 'fill-none text-gray-300 dark:text-gray-500'
                  }`}
                />
              </button>
              {!hasAnswered && (
                <div className="pointer-events-none absolute right-0 bottom-full mb-2 z-20 w-max max-w-[200px] opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  <div className="rounded-md bg-gray-900 px-2.5 py-1.5 text-[11px] text-white shadow-sm">
                    {t('bookmarkDisabledTooltip')}
                  </div>
                  <div className="absolute right-3 top-full h-1.5 w-1.5 rotate-45 bg-gray-900" />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 문제 */}
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-50 whitespace-pre-line leading-relaxed">
        {quiz.question}
      </p>

      {/* 객관식 선지 */}
      {isMultipleChoice && quiz.choices.length > 0 && (
        <div className="mt-4 space-y-2">
          {quiz.choices.map((choice, idx) => (
            <button
              key={choice.choice_id ?? `choice-${idx}`}
              type="button"
              onClick={() => handleChoiceClick(idx)}
              className={`w-full flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-all ${getChoiceStyle(choice, idx)}`}
            >
              <span
                className={`shrink-0 w-5 text-center ${getChoiceLabelStyle(choice, idx)}`}
              >
                {CHOICE_LABELS[idx]}
              </span>
              <span className="flex-1 text-gray-700 dark:text-gray-300">
                {choice.choice_text}
              </span>
              {isSubmitted && selectedChoiceIdx === idx && choice.is_correct && (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
              )}
              {isSubmitted && selectedChoiceIdx === idx && !choice.is_correct && (
                <XCircle className="h-4 w-4 shrink-0 text-red-400" />
              )}
              {showAnswer && choice.is_correct && selectedChoiceIdx !== idx && (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* 정답/해설 토글 */}
      <div className="mt-4">
        <div className="group relative inline-flex">
          <button
            onClick={handleToggleAnswer}
            disabled={!hasAnswered}
            className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
              hasAnswered
                ? 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer'
                : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
            }`}
          >
            {showAnswer ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            {showAnswer ? t('hideAnswer') : t('showAnswer')}
          </button>
          {!hasAnswered && (
            <div className="pointer-events-none absolute left-0 bottom-full mb-2 z-20 w-max max-w-[220px] opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              <div className="rounded-md bg-gray-900 px-2.5 py-1.5 text-[11px] text-white shadow-sm">
                {t('answerDisabledTooltip')}
              </div>
              <div className="absolute left-4 top-full h-1.5 w-1.5 rotate-45 bg-gray-900" />
            </div>
          )}
        </div>

        {showAnswer && (
          <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
            {/* 정답 (주관식) */}
            {!isMultipleChoice && quiz.answer && (
              <div className="rounded-xl bg-gray-50 dark:bg-gray-700/50 p-4">
                <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                  {t('answer')}
                </p>
                <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-line">
                  {quiz.answer}
                </p>
              </div>
            )}

            {/* 해설 */}
            {quiz.explanation && (
              <div className="rounded-xl bg-gray-50 dark:bg-gray-700/50 p-4">
                <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                  {t('explanation')}
                </p>
                <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-line leading-relaxed">
                  {quiz.explanation}
                </p>
              </div>
            )}

            {/* 선지별 분석 (객관식) */}
            {isMultipleChoice &&
              quiz.choices.length > 0 &&
              quiz.choices.some((c) => c.choice_explanation) && (
                <div className="rounded-xl bg-gray-50 dark:bg-gray-700/50 p-4">
                  <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-2">
                    {t('choiceAnalysis')}
                  </p>
                  <div className="space-y-1.5">
                    {quiz.choices.map((choice, idx) => (
                      <div key={choice.choice_id ?? `analysis-${idx}`} className="text-xs leading-relaxed">
                        <span
                          className={`font-bold mr-1 ${
                            choice.is_correct
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {CHOICE_LABELS[idx]}:
                        </span>
                        <span className="text-gray-600 dark:text-gray-300">
                          {choice.choice_explanation || '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        )}
      </div>
    </article>
  )
}
