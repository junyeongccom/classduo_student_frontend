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
  RotateCcw,
  Eye,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { MarkdownMessage } from '@/features/ai-tutor/components/ui/MarkdownMessage'
import { MathText } from '@/shared/components/math/MathText'
import { EssayGradingPanel, type EssayGradingView } from './EssayGradingPanel'

/* ───────────── 타입 ───────────── */

export type StudentQuizType =
  // 레거시 — 기존 미재생성 회차 호환
  | 'RECALL'
  | 'STRUCTURE'
  | 'STRUCTURE_OBJ'
  | 'MISCONCEPTION'
  | 'DEF_TO_TERM'
  | 'TERM_TO_DEF'
  | 'EXAM_PREP'
  // 신규 4유형 (2026-07 개편) — 앞 2개=객관식, 뒤 2개=서술형
  | 'TERM_MEMORY'
  | 'CONCEPT'
  | 'ANALYSIS_APPLY'
  | 'JUDGE_DESIGN'
  // 계산 트랙 (2026-08) — 5지선다
  | 'CALCULATION'

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
  /** 출처 회차 번호. 제공 시 헤더에 "N주차" 배지 표시 (다중 회차 출처 구분용). */
  lectureNo?: number | null
  /** 'multiple_choice' | 'essay'. 미제공(레거시 로우) 시 quiz_type 기반으로 판정. */
  answer_format?: 'multiple_choice' | 'essay'
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
  /** 서술형(essay) 이전 제출 답안 텍스트. 재방문 시 입력창/제출 뷰 복원용 */
  essayAnswer?: string | null
  /** 즐겨찾기 토글 콜백 */
  onBookmarkToggle: (quizId: string) => void
  /** 풀이 결과 업데이트 콜백 (선지 클릭 시 호출, answer는 choice_order). answerText는 서술형 제출 시에만 전달 */
  onCorrectUpdate: (quizId: string, isCorrect: boolean, answer: number, answerText?: string) => void
  /**
   * 서술형 루브릭 채점 제출 콜백. 제공되면 서술형 제출이 이 경로를 타고(채점 API),
   * 없으면 기존 onCorrectUpdate 센티널 경로로 폴백한다 — 채점을 붙이지 않은 화면(오답노트·즐겨찾기)의
   * 동작을 그대로 유지하기 위한 분기다.
   */
  onEssaySubmit?: (quizId: string, answerText: string) => void
  /** 서술형 채점 상태. 없으면(=구경로 제출·미채점) 채점 UI 를 그리지 않는다. */
  essayGrading?: EssayGradingView | null
  /** 선택 해제(리셋) 콜백 — 제공 시 이미 선택한 선지 재클릭으로 풀이 초기화 가능 */
  onResetAnswer?: (quizId: string) => void
  /** 오답노트 삭제 모드 — true면 북마크 대신 삭제 버튼 표시 */
  wrongNoteMode?: boolean
  /** 오답노트 삭제 콜백 */
  onDismissWrongNote?: (quizId: string) => void
  /** 해설 영역 하단에 삽입할 추가 콘텐츠 (출처 버튼 등) */
  renderAnswerExtra?: React.ReactNode
  /** 해설 토글 클릭 콜백 — 트래킹용 */
  onRevealToggle?: (quizId: string, shown: boolean) => void
}

/* ───────────── 상수 ───────────── */

// 4지/5지선다 모두 호환 — 인덱스 기반 라벨 동적 생성 (A~Z 자동 확장).
const choiceLabel = (idx: number): string => String.fromCharCode(65 + idx)

const QUIZ_TYPE_BADGE: Record<StudentQuizType, string> = {
  RECALL: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  STRUCTURE: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  STRUCTURE_OBJ: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  MISCONCEPTION: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  DEF_TO_TERM: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  TERM_TO_DEF: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  EXAM_PREP: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  // 신규 4유형 (2026-07 개편)
  TERM_MEMORY: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  CONCEPT: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  ANALYSIS_APPLY: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  JUDGE_DESIGN: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  CALCULATION: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
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
  essayAnswer,
  onBookmarkToggle,
  onCorrectUpdate,
  onEssaySubmit,
  essayGrading,
  onResetAnswer,
  wrongNoteMode,
  onDismissWrongNote,
  renderAnswerExtra,
  onRevealToggle,
}: StudentQuizCardProps) {
  const isMultipleChoice =
    quiz.quiz_type === 'MISCONCEPTION' ||
    quiz.quiz_type === 'DEF_TO_TERM' ||
    quiz.quiz_type === 'TERM_TO_DEF' ||
    quiz.quiz_type === 'STRUCTURE_OBJ' ||
    quiz.quiz_type === 'TERM_MEMORY' ||
    quiz.quiz_type === 'CONCEPT' ||
    quiz.quiz_type === 'CALCULATION'

  // 서술형(분석과적용/판단과설계) — answer_format 우선, 레거시 로우는 quiz_type 폴백
  const isEssay =
    quiz.answer_format === 'essay' ||
    quiz.quiz_type === 'ANALYSIS_APPLY' ||
    quiz.quiz_type === 'JUDGE_DESIGN'

  const [selectedChoiceIdx, setSelectedChoiceIdx] = useState<number | null>(() => {
    if (isCorrect !== null && isMultipleChoice && selectedAnswer != null) {
      return quiz.choices.findIndex((c) => c.choice_order === selectedAnswer)
    }
    return null
  })
  /**
   * 루브릭 채점 도입 후 서술형은 채점이 끝나기 전(is_correct=NULL)에도 이미 '제출됨'이다.
   * 제출 여부의 근거를 정오답이 아니라 답안 본문의 존재로 잡아야 채점 중인 문항이
   * 입력창으로 되돌아가지 않는다. 객관식은 종전대로 isCorrect 로 판정한다.
   */
  const hasEssaySubmission = isEssay && (essayAnswer ?? '').trim() !== ''
  const [isSubmitted, setIsSubmitted] = useState(() => isCorrect !== null || hasEssaySubmission)
  const [showAnswer, setShowAnswer] = useState(false)
  // 서술형 답안 입력 draft — 제출 이력이 있으면 서버에서 복원된
  // essayAnswer(answer_text)로 초깃값을 채운다. 재진입/새로고침 시에도 유지됨.
  const [essayDraft, setEssayDraft] = useState(() => (hasEssaySubmission ? (essayAnswer ?? '') : ''))
  // "해설 보기" 안에서 다시 펼치는 상세 설명 토글 (마크다운 렌더링)
  const [showDetailedExplanation, setShowDetailedExplanation] = useState(false)
  // 이번 렌더 세션에서 방금 풀었는지 여부. 복원된 풀이(isCorrect !== null)도 다시 풀 수 있어야 하므로
  // 버튼 노출 조건은 justSolved || hasAnswered 로 판단한다(아래 canRetry).
  const [justSolved, setJustSolved] = useState(false)
  const t = useTranslations('lectureStudy.quiz')
  const { locale } = useI18n()
  const detailedExplanationLabel = locale === 'en' ? 'Detailed Explanation' : '상세 설명'
  const detailedExplanationHideLabel = locale === 'en' ? 'Hide Detailed Explanation' : '상세 설명 닫기'

  const badge = QUIZ_TYPE_BADGE[quiz.quiz_type]

  const hasAnswered = isCorrect !== null || isSubmitted

  /**
   * 오답으로 채점된 객관식인지. 방금 고른 선지(로컬)를 우선 보고, 재진입으로 복원된
   * 문항처럼 선지 인덱스가 없을 때만 상위가 준 isCorrect 로 폴백한다.
   */
  const selectedChoice = selectedChoiceIdx !== null ? quiz.choices[selectedChoiceIdx] : undefined
  const answeredWrong =
    isMultipleChoice &&
    hasAnswered &&
    (selectedChoice !== undefined ? !selectedChoice.is_correct : isCorrect === false)

  /**
   * 오답 직후에는 정답을 감춘 채 '정답 보기' 하나만 내보낸다 — 정답 위치를 바로 알려주면
   * 학생이 다시 생각해볼 여지가 없다. 정답을 확인한 뒤에야 '다시 풀기'로 바뀐다.
   * (맞힌 문항·서술형은 기존 그대로 '다시 풀기' + 해설 토글)
   */
  const showRevealButton = answeredWrong && !showAnswer
  const showRetryButton = (justSolved || hasAnswered) && onResetAnswer !== undefined && !showRevealButton

  const handleChoiceClick = useCallback(
    (idx: number) => {
      if (showAnswer) return

      // 이미 제출된 상태에서 선택했던 선지를 다시 클릭 → 리셋
      if (isSubmitted && selectedChoiceIdx === idx && onResetAnswer) {
        setSelectedChoiceIdx(null)
        setIsSubmitted(false)
        setJustSolved(false)
        onResetAnswer(quiz.quiz_id)
        return
      }

      if (isSubmitted) return

      setSelectedChoiceIdx(idx)
      const selectedChoice = quiz.choices[idx]
      if (selectedChoice) {
        setIsSubmitted(true)
        setJustSolved(true)
        onCorrectUpdate(quiz.quiz_id, selectedChoice.is_correct, selectedChoice.choice_order)
      }
    },
    [isSubmitted, showAnswer, selectedChoiceIdx, quiz.choices, quiz.quiz_id, onCorrectUpdate, onResetAnswer],
  )

  /**
   * 서술형 답안 제출.
   *
   * onEssaySubmit 이 있으면 루브릭 채점 경로로 보낸다 — 답안은 즉시 저장되고 채점은
   * 뒤따르므로, 정오답은 여기서 정하지 않는다(서버가 점수에서 파생).
   *
   * 없으면 기존 자가평가 경로로 폴백한다: onCorrectUpdate(correct=true, answer=0, answerText).
   * answer=0은 1~5 범위 밖이라 quizStatusService 에서 서버 전송 시 null 로 보정된다.
   */
  const handleEssaySubmit = useCallback(() => {
    const answerText = essayDraft.trim()
    if (isSubmitted || !answerText) return
    setIsSubmitted(true)
    setJustSolved(true)
    if (onEssaySubmit) {
      onEssaySubmit(quiz.quiz_id, answerText)
      return
    }
    onCorrectUpdate(quiz.quiz_id, true, 0, answerText)
  }, [isSubmitted, essayDraft, quiz.quiz_id, onCorrectUpdate, onEssaySubmit])

  /**
   * 문항별 "다시풀기" — 이 문항만 풀기 전 상태로 되돌린다.
   * 객관식은 선택 해제, 서술형은 답안 draft까지 비우고(제출 시 answer_text로 영속화되므로)
   * 상위 상태도 onResetAnswer로 되돌려 서버 기록(correct/answer)을 취소한다.
   */
  const handleRetryOne = useCallback(() => {
    setSelectedChoiceIdx(null)
    setIsSubmitted(false)
    setJustSolved(false)
    setShowAnswer(false)
    setShowDetailedExplanation(false)
    if (isEssay) setEssayDraft('')
    onResetAnswer?.(quiz.quiz_id)
  }, [isEssay, onResetAnswer, quiz.quiz_id])

  const handleToggleAnswer = useCallback(() => {
    setShowAnswer((prev) => {
      const next = !prev
      onRevealToggle?.(quiz.quiz_id, next)
      return next
    })
  }, [onRevealToggle, quiz.quiz_id])

  const handleBookmarkClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onBookmarkToggle(quiz.quiz_id)
    },
    [quiz.quiz_id, onBookmarkToggle],
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
      return 'text-gray-500 dark:text-gray-400'
    }

    if (isSelected && choice.is_correct) return 'text-green-600 dark:text-green-400 font-bold'
    if (isSelected && !choice.is_correct) return 'text-red-500 dark:text-red-400 font-bold'
    if (showAnswer && choice.is_correct) return 'text-green-600 dark:text-green-400 font-bold'
    return 'text-gray-500 dark:text-gray-400'
  }

  return (
    <article
      className={`rounded-2xl border bg-white dark:bg-gray-800 p-5 shadow-sm ${getCardBorderStyle(isCorrect)}`}
    >
      {/* 헤더: 번호 + 회차 뱃지 + 유형 뱃지 + 즐겨찾기 Star */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-bold text-[#6366F1]">Q{index + 1}</span>
        {quiz.lectureNo != null && (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
            {t('lectureBadge', { no: quiz.lectureNo })}
          </span>
        )}
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
        {(quiz.quiz_type === 'STRUCTURE' || isEssay) && (
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
            <button
              type="button"
              onClick={handleBookmarkClick}
              className="p-1 rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
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
          )}
        </div>
      </div>

      {/* 문제 */}
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-50 whitespace-pre-line leading-relaxed">
        <MathText text={quiz.question} />
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
                {choiceLabel(idx)}
              </span>
              <span className="flex-1 text-gray-700 dark:text-gray-300">
                <MathText text={choice.choice_text} />
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

      {/* 서술형 답안 입력 → 제출 → 내 답안 + 루브릭 채점 결과 + 모범답안 (세로 배치) */}
      {isEssay && (
        <div className="mt-4">
          {!isSubmitted ? (
            <div className="space-y-2">
              <textarea
                value={essayDraft}
                onChange={(e) => setEssayDraft(e.target.value)}
                placeholder={t('essayPlaceholder')}
                rows={4}
                className="w-full resize-none rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none transition-colors focus:border-indigo-300 dark:focus:border-indigo-600"
              />
              <button
                type="button"
                onClick={handleEssaySubmit}
                disabled={!essayDraft.trim()}
                className={`w-full rounded-xl py-2 text-sm font-semibold transition-colors ${
                  essayDraft.trim()
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'
                }`}
              >
                {t('essaySubmit')}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl bg-gray-50 dark:bg-gray-700/50 p-4">
                <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                  {t('essayMyAnswer')}
                </p>
                <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-line">
                  {essayDraft || '—'}
                </p>
              </div>
              {/* 루브릭 채점 결과 — 요소 체크리스트가 주(主)다.
                  채점 기록이 없는 제출(구경로 자가평가)에는 아예 그리지 않는다. */}
              {essayGrading && <EssayGradingPanel grading={essayGrading} />}

              {quiz.answer && (
                <div className="rounded-xl bg-indigo-50/60 dark:bg-indigo-900/20 p-4">
                  <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-300 mb-1">
                    {t('essayModelAnswerLabel')}
                  </p>
                  <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-line">
                    <MathText text={quiz.answer} />
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 오답이면 '정답 보기', 그 외(정답·서술형·정답 확인 후)에는 '다시풀기'.
          미풀이 상태에서는 둘 다 숨김. */}
      {(showRevealButton || showRetryButton) && (
        <div className="mt-3 flex justify-end">
          {showRevealButton ? (
            <button
              type="button"
              onClick={handleToggleAnswer}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
            >
              <Eye className="h-3.5 w-3.5" />
              {t('revealAnswer')}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRetryOne}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t('retryOne')}
            </button>
          )}
        </div>
      )}

      {/* 정답/해설 토글 — 오답 직후에는 위의 '정답 보기'가 유일한 공개 경로이므로 감춘다
          (같은 일을 하는 버튼이 둘이면 어느 쪽이 정답을 여는지 헷갈린다).
          정답을 확인한 뒤에는 다시 나타나 접기/펴기로 쓴다. */}
      <div className="mt-4">
        <div className={`group relative ${showRevealButton ? 'hidden' : 'inline-flex'}`}>
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
            {/* 서술형 화면에는 "정답/오답"이라는 낱말을 쓰지 않는다 — 해설로만 부른다 */}
            {isEssay
              ? showAnswer
                ? t('essayHideExplanation')
                : t('essayShowExplanation')
              : showAnswer
                ? t('hideAnswer')
                : t('showAnswer')}
          </button>
          {!hasAnswered && (
            <div className="pointer-events-none absolute left-0 bottom-full mb-2 z-20 w-max max-w-[220px] opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              <div className="rounded-md bg-gray-900 px-2.5 py-1.5 text-[11px] text-white shadow-sm">
                {isEssay ? t('essayExplanationDisabledTooltip') : t('answerDisabledTooltip')}
              </div>
              <div className="absolute left-4 top-full h-1.5 w-1.5 rotate-45 bg-gray-900" />
            </div>
          )}
        </div>

        {showAnswer && (
          <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
            {/* 정답 (주관식, 레거시 RECALL/STRUCTURE 전용) — 서술형(essay)은 제출 직후 위에서 이미 표시됨 */}
            {!isMultipleChoice && !isEssay && quiz.answer && (
              <div className="rounded-xl bg-gray-50 dark:bg-gray-700/50 p-4">
                <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                  {t('answer')}
                </p>
                <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-line">
                  <MathText text={quiz.answer} />
                </p>
              </div>
            )}

            {/* 선지별 분석 (객관식) — 짧은 한 줄 텍스트 (마크다운 X). 기존 동작 그대로. */}
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
                          {choiceLabel(idx)}:
                        </span>
                        <span className="text-gray-600 dark:text-gray-300">
                          <MathText text={choice.choice_explanation || '—'} />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* 서술형: 선지별 해설 표가 없어 '정답 및 해설'을 열면 상세 설명 토글 하나만 남아
                내용이 없는 것처럼 보였다. 서술형은 중첩 토글 없이 해설을 바로 펼쳐 보여준다. */}
            {isEssay && quiz.explanation && (
              <div className="rounded-xl bg-gray-50 dark:bg-gray-700/50 p-4">
                <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                  {detailedExplanationLabel}
                </div>
                <div className="mt-2 text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
                  <MarkdownMessage markdown={quiz.explanation} headingSize="compact" />
                </div>
              </div>
            )}

            {/* 상세 설명 — 2단계 토글. 마크다운 헤더 3섹션 (오답 원인 / 혼동되기 쉬운 개념 / 추가 학습 방향) 렌더링. */}
            {!isEssay && quiz.explanation && (
              <div className="rounded-xl bg-gray-50 dark:bg-gray-700/50 p-4">
                <button
                  type="button"
                  onClick={() => setShowDetailedExplanation((v) => !v)}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
                  aria-expanded={showDetailedExplanation}
                >
                  {showDetailedExplanation ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  {showDetailedExplanation ? detailedExplanationHideLabel : detailedExplanationLabel}
                </button>
                {showDetailedExplanation && (
                  <div className="mt-2 text-sm text-gray-900 dark:text-gray-100 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
                    <MarkdownMessage markdown={quiz.explanation} headingSize="compact" />
                  </div>
                )}
              </div>
            )}

            {/* 추가 콘텐츠 (출처 버튼 등) */}
            {renderAnswerExtra}
          </div>
        )}
      </div>
    </article>
  )
}
