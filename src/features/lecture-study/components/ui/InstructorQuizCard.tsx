/**
 * @file InstructorQuizCard.tsx
 * @description 학생용 교수자 AI 퀴즈 카드 (읽기 전용, 정답 토글)
 * @module features/lecture-study/components/ui
 */

'use client'

import { useState, useCallback } from 'react'
import { ChevronDown, ChevronUp, CheckCircle2, XCircle } from 'lucide-react'
import type {
  InstructorQuizItem,
  InstructorQuizChoice,
  InstructorQuizType,
} from '../../services/instructorQuizService'

const CHOICE_LABELS = ['A', 'B', 'C', 'D', 'E', 'F']

const QUIZ_TYPE_META: Record<
  InstructorQuizType,
  { label: string; badge: string }
> = {
  RECALL: { label: '내용 기억', badge: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  STRUCTURE: { label: '구조 이해', badge: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
  STRUCTURE_OBJ: { label: '구조 이해', badge: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
  MISCONCEPTION: { label: '오개념 탐지', badge: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' },
  DEF_TO_TERM: { label: '정의→용어', badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  TERM_TO_DEF: { label: '용어→정의', badge: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' },
}

interface InstructorQuizCardProps {
  quiz: InstructorQuizItem
  index: number
}

export function InstructorQuizCard({ quiz, index }: InstructorQuizCardProps) {
  const [selectedChoiceIdx, setSelectedChoiceIdx] = useState<number | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)

  const meta = QUIZ_TYPE_META[quiz.quiz_type]
  const isMultipleChoice =
    quiz.quiz_type === 'MISCONCEPTION' ||
    quiz.quiz_type === 'DEF_TO_TERM' ||
    quiz.quiz_type === 'TERM_TO_DEF' ||
    quiz.quiz_type === 'STRUCTURE_OBJ'
  const isMisconception = quiz.quiz_type === 'MISCONCEPTION'

  const handleChoiceClick = useCallback(
    (idx: number) => {
      if (showAnswer) return // 정답 공개 후에는 변경 불가
      setSelectedChoiceIdx(idx)
    },
    [showAnswer],
  )

  const handleToggleAnswer = useCallback(() => {
    setShowAnswer((prev) => !prev)
  }, [])

  // 선지 스타일 결정
  const getChoiceStyle = (choice: InstructorQuizChoice, idx: number) => {
    const isSelected = selectedChoiceIdx === idx

    if (!showAnswer) {
      // 아직 정답 비공개: 선택한 선지만 하이라이트
      if (isSelected) {
        return 'border-[#6366F1] bg-[#6366F1]/5 ring-1 ring-[#6366F1]/20'
      }
      return 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer'
    }

    // 정답 공개 상태
    const isCorrectChoice = isMisconception ? choice.is_correct : choice.is_correct
    if (isCorrectChoice) {
      return 'border-green-300 bg-green-50/60 dark:border-green-700 dark:bg-green-900/20'
    }
    if (isSelected && !isCorrectChoice) {
      return 'border-red-300 bg-red-50/60 dark:border-red-700 dark:bg-red-900/20'
    }
    return 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 opacity-60'
  }

  const getChoiceLabelStyle = (choice: InstructorQuizChoice, idx: number) => {
    const isSelected = selectedChoiceIdx === idx

    if (!showAnswer) {
      return isSelected ? 'text-[#6366F1] font-bold' : 'text-gray-400'
    }

    const isCorrectChoice = choice.is_correct
    if (isCorrectChoice) return 'text-green-600 dark:text-green-400 font-bold'
    if (isSelected && !isCorrectChoice) return 'text-red-500 dark:text-red-400 font-bold'
    return 'text-gray-400'
  }

  return (
    <article className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
      {/* 헤더: 번호 + 유형 뱃지 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-bold text-[#6366F1]">Q{index + 1}</span>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.badge}`}>
          {meta.label}
        </span>
        {isMultipleChoice && (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
            5지선다
          </span>
        )}
        {quiz.quiz_type === 'RECALL' && (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
            단답형
          </span>
        )}
        {quiz.quiz_type === 'STRUCTURE' && (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
            서술형
          </span>
        )}
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
              key={choice.choice_id}
              type="button"
              onClick={() => handleChoiceClick(idx)}
              disabled={showAnswer}
              className={`w-full flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-all ${getChoiceStyle(choice, idx)}`}
            >
              <span className={`shrink-0 w-5 text-center ${getChoiceLabelStyle(choice, idx)}`}>
                {CHOICE_LABELS[idx]}
              </span>
              <span className="flex-1 text-gray-700 dark:text-gray-300">{choice.choice_text}</span>
              {showAnswer && choice.is_correct && (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
              )}
              {showAnswer && selectedChoiceIdx === idx && !choice.is_correct && (
                <XCircle className="h-4 w-4 shrink-0 text-red-400" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* 정답/해설 토글 */}
      <div className="mt-4">
        <button
          onClick={handleToggleAnswer}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          {showAnswer ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {showAnswer ? '정답 및 해설 접기' : '정답 및 해설 보기'}
        </button>

        {showAnswer && (
          <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
            {/* 정답 (주관식) */}
            {!isMultipleChoice && quiz.answer && (
              <div className="rounded-xl bg-gray-50 dark:bg-gray-700/50 p-4">
                <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">정답</p>
                <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-line">{quiz.answer}</p>
              </div>
            )}

            {/* 해설 */}
            {quiz.explanation && (
              <div className="rounded-xl bg-gray-50 dark:bg-gray-700/50 p-4">
                <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">해설</p>
                <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-line leading-relaxed">
                  {quiz.explanation}
                </p>
              </div>
            )}

            {/* 선지별 분석 (객관식) */}
            {isMultipleChoice && quiz.choices.length > 0 && quiz.choices.some((c) => c.choice_explanation) && (
              <div className="rounded-xl bg-gray-50 dark:bg-gray-700/50 p-4">
                <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-2">선지별 분석</p>
                <div className="space-y-1.5">
                  {quiz.choices.map((choice, idx) => (
                    <div key={choice.choice_id} className="text-xs leading-relaxed">
                      <span className={`font-bold mr-1 ${choice.is_correct ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
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

