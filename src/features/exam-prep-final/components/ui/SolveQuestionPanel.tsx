/**
 * @file SolveQuestionPanel.tsx
 * @description 풀이 페이지 메인 — 즉시 채점 흐름 (정오답/해설 표시) + 힌트 버튼
 * @module features/exam-prep-final/components/ui
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Check,
  X as XIcon,
  FileText,
  Flag,
  Lightbulb,
  Minus,
  Star,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/shared/lib/utils'
import type {
  CoreTestQuestionItemDto,
  GradeSingleResponseDto,
} from '../../services/examPrepService'

interface MasterySummary {
  learning: number
  skilled: number
  master: number
}

interface SolveQuestionPanelProps {
  question: CoreTestQuestionItemDto
  currentSeq: number
  total: number
  /** 학생이 선택한 옵션 (0-based). 없으면 null */
  selectedChoice: number | null
  /** 채점 결과 — 있으면 정오답/해설 표시 + 선지 disable */
  graded: GradeSingleResponseDto | null
  /** 힌트로 disable된 옵션 인덱스 */
  hintDisabledOption: number | null
  /** 채점 API 호출 중 — 제출 버튼 disable */
  isGrading: boolean
  masterySummary: MasterySummary
  /** 현재 문항의 mastery state. 'master' 면 상단에 ★ 배지 영구 노출 + 진전도 배지에 보더. */
  currentQuestionState: 'learning' | 'skilled' | 'master' | null
  /** 현재 문항이 즐겨찾기 되어있는지 — 북마크 아이콘 채움 표시 */
  isBookmarked: boolean
  /** 북마크 토글 콜백 (질문 id 기준) */
  onBookmarkToggle: () => void
  onSelectChoice: (idx: number) => void
  onSubmit: () => void
  onHint: () => void
  onPrev: () => void
  onNext: () => void
  hasPrev: boolean
  hasNext: boolean
}

const OPTION_LABELS = ['A', 'B', 'C', 'D']
const HINT_DELAY_SEC = 20

export function SolveQuestionPanel({
  question,
  currentSeq,
  total,
  selectedChoice,
  graded,
  hintDisabledOption,
  isGrading,
  masterySummary,
  currentQuestionState,
  isBookmarked,
  onBookmarkToggle,
  onSelectChoice,
  onSubmit,
  onHint,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: SolveQuestionPanelProps) {
  const t = useTranslations()
  // 힌트 버튼 타이머 — currentSeq 가 바뀌면 리셋
  const [hintRemainingSec, setHintRemainingSec] = useState(HINT_DELAY_SEC)
  // 해설보기 토글 — currentSeq 가 바뀌면 자동 닫힘
  const [showExplanation, setShowExplanation] = useState(false)
  const seqRef = useRef(currentSeq)

  useEffect(() => {
    if (seqRef.current !== currentSeq) {
      seqRef.current = currentSeq
      setHintRemainingSec(HINT_DELAY_SEC)
      setShowExplanation(false)
    }
  }, [currentSeq])

  useEffect(() => {
    if (hintRemainingSec <= 0) return
    const id = setInterval(() => {
      setHintRemainingSec((s) => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [hintRemainingSec])

  // 정답 인덱스 (백엔드 graded.correct_answer 또는 question.answer)
  const correctIdx = (() => {
    if (graded?.correct_answer) return parseInt(graded.correct_answer, 10)
    return parseInt(question.answer, 10)
  })()

  // 이미 마스터 도달한 문항 — 풀이 자체 차단 + 정답 영구 노출 (graded 와 별개로 락)
  const isMasterLocked = currentQuestionState === 'master' && !graded
  const isLocked = graded !== null || isMasterLocked
  const hintAvailable = !isLocked && hintRemainingSec === 0 && hintDisabledOption == null
  const hintTimerActive = !isLocked && hintRemainingSec > 0
  // 힌트 버튼 conic-gradient progress (0 → 100% 시계방향 채움)
  const hintProgressPct = ((HINT_DELAY_SEC - hintRemainingSec) / HINT_DELAY_SEC) * 100

  return (
    <div className="flex h-full flex-1 flex-col overflow-y-auto bg-[#F5F7F8] dark:bg-gray-950">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-8 py-8">
        {/* 상단 메타 — 단일 선택 (+ master 배지) + Learning/Skilled/Master 카운트
              현재 문항이 master 면 단일선택 배지 옆에 ★ MASTER 배지 영구 표시.
              현재 문항 진전도와 일치하는 카운트 배지에 ring 보더로 강조. */}
        <div className="mb-5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-gray-500 dark:border-gray-700 dark:text-gray-400">
              <Minus className="h-3 w-3" />
              {t('examPrepFinal.singleChoice')}
            </span>
            {currentQuestionState === 'master' && (
              <span
                aria-label="이 문항은 마스터 도달"
                className="flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 font-bold text-violet-700"
              >
                <Star className="h-3 w-3 fill-violet-600 text-violet-600" />
                MASTER
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-gray-500">
            <span
              className={cn(
                'flex items-center gap-1 rounded-full px-2 py-0.5',
                currentQuestionState === 'learning'
                  ? 'ring-2 ring-gray-400 ring-offset-1'
                  : '',
              )}
            >
              <span className="inline-block h-2 w-2 rounded-full bg-gray-300" />
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {masterySummary.learning}
              </span>
              <span>Learning</span>
            </span>
            <span
              className={cn(
                'flex items-center gap-1 rounded-full px-2 py-0.5',
                currentQuestionState === 'skilled'
                  ? 'ring-2 ring-cyan-400 ring-offset-1'
                  : '',
              )}
            >
              <span className="inline-block h-2 w-2 rounded-full bg-cyan-400" />
              <span className="font-semibold text-cyan-600">
                {masterySummary.skilled}
              </span>
              <span>Skilled</span>
            </span>
            <span
              className={cn(
                'flex items-center gap-1 rounded-full px-2 py-0.5',
                currentQuestionState === 'master'
                  ? 'ring-2 ring-emerald-500 ring-offset-1'
                  : '',
              )}
            >
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              <span className="font-semibold text-emerald-600">
                {masterySummary.master}
              </span>
              <span>Master</span>
            </span>
          </div>
        </div>

        {/* 문제 stem */}
        <h1 className="text-3xl font-bold leading-snug text-gray-900 dark:text-gray-50">
          {question.stem}
        </h1>

        {/* 채점 결과 배지 (graded 시) */}
        {graded && (
          <div className="mt-5 flex items-center gap-2">
            {graded.is_correct ? (
              <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                <Check className="h-4 w-4" /> 정답
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-sm font-semibold text-rose-700">
                <XIcon className="h-4 w-4" /> 오답
              </span>
            )}
            {graded.hint_used && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                힌트 사용 (숙련도 미반영)
              </span>
            )}
            {graded.mastery.first_master_transition && (
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
                🔥 Master 도달!
              </span>
            )}
          </div>
        )}

        {/* 선지 */}
        <div className="mt-6 flex flex-col gap-3">
          {question.options.map((opt, idx) => {
            const label = OPTION_LABELS[idx] ?? String.fromCharCode(65 + idx)
            const isSelected = selectedChoice === idx
            const isHintDisabled = hintDisabledOption === idx
            // master 락 시: 정답을 무조건 초록 강조 (graded 없이도 정답 노출)
            const isCorrect =
              (graded && idx === correctIdx) ||
              (isMasterLocked && idx === correctIdx)
            const isWrongPick = graded && isSelected && !graded.is_correct

            // 시각 우선순위: 채점 후 정답 초록, 오답 선택 빨강, 힌트 disable 회색, 선택 보라
            return (
              <button
                key={idx}
                type="button"
                disabled={isLocked || isHintDisabled || isGrading}
                onClick={() => onSelectChoice(idx)}
                className={cn(
                  'group flex w-full items-center gap-4 rounded-xl border px-5 py-4 text-left transition-colors',
                  isCorrect
                    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
                    : isWrongPick
                      ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/30'
                      : isHintDisabled
                        ? 'border-gray-200 bg-gray-50 opacity-50 dark:border-gray-700 dark:bg-gray-900'
                        : isSelected
                          ? 'border-[#6366F1] bg-[#6366F1]/5 dark:border-[#6366F1] dark:bg-[#6366F1]/10'
                          : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800',
                  (isLocked || isHintDisabled) && 'cursor-not-allowed',
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-bold transition-colors',
                    isCorrect
                      ? 'bg-emerald-500 text-white'
                      : isWrongPick
                        ? 'bg-rose-500 text-white'
                        : isSelected
                          ? 'bg-[#6366F1] text-white'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
                  )}
                >
                  {isHintDisabled ? <XIcon className="h-4 w-4" /> : label}
                </span>
                <span
                  className={cn(
                    'flex-1 text-base text-gray-800 dark:text-gray-100',
                    isHintDisabled && 'line-through text-gray-400',
                  )}
                >
                  {opt}
                </span>
              </button>
            )
          })}
        </div>

        {/* 해설 (채점 후 + [해설보기] 토글 켜진 경우) */}
        {graded?.explanation && showExplanation && (
          <div className="mt-5 rounded-xl border border-gray-200 bg-white p-4 text-sm leading-relaxed text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              해설
            </p>
            {Object.entries(graded.explanation).map(([key, val]) => (
              <p key={key} className="mb-1 last:mb-0">
                <span className="font-semibold">
                  {key.startsWith('opt')
                    ? OPTION_LABELS[parseInt(key.slice(3), 10)]
                    : key}
                  :
                </span>{' '}
                {val}
              </p>
            ))}
          </div>
        )}

        {/* 하단 액션 영역 */}
        <div className="mt-8 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-400">
            <button
              type="button"
              onClick={onBookmarkToggle}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
                isBookmarked
                  ? 'text-blue-500 hover:text-blue-600'
                  : 'hover:text-gray-700',
              )}
              aria-label={isBookmarked ? '즐겨찾기 해제' : '즐겨찾기 추가'}
            >
              <Bookmark
                className={cn('h-4 w-4', isBookmarked && 'fill-current')}
              />
            </button>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
              aria-label="memo"
            >
              <FileText className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
              aria-label="flag"
            >
              <Flag className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* 힌트 버튼 — master 락 상태에선 숨김 */}
            {!isMasterLocked && (
              <button
                type="button"
                disabled={!hintAvailable}
                onClick={onHint}
                className={cn(
                  'relative flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-semibold transition-colors',
                  hintAvailable
                    ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200'
                    : 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-300 dark:border-gray-700 dark:bg-gray-800',
                )}
                style={
                  hintTimerActive
                    ? {
                        backgroundImage: `conic-gradient(#6366F1 ${hintProgressPct}%, transparent ${hintProgressPct}%)`,
                        backgroundOrigin: 'border-box',
                        backgroundClip: 'border-box, padding-box',
                      }
                    : undefined
                }
              >
                <Lightbulb className="h-4 w-4" />
                {hintTimerActive ? `${hintRemainingSec}s` : t('examPrepFinal.hint')}
              </button>
            )}
            {/* master 락: [다음] 으로 넘어가기만 / 채점 전: [제출] / 채점 후: [해설보기] 토글 */}
            {isMasterLocked ? (
              <button
                type="button"
                onClick={onNext}
                disabled={!hasNext}
                className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:opacity-40"
              >
                다음 문항
              </button>
            ) : graded ? (
              <button
                type="button"
                onClick={() => setShowExplanation((v) => !v)}
                className="rounded-lg bg-[#6366F1] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#5558E6]"
              >
                {showExplanation ? '해설 닫기' : '해설보기'}
              </button>
            ) : (
              <button
                type="button"
                onClick={onSubmit}
                disabled={selectedChoice === null || isLocked || isGrading}
                className="rounded-lg bg-[#6366F1] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#5558E6] disabled:opacity-40"
              >
                {isGrading ? '채점 중...' : t('examPrepFinal.submit')}
              </button>
            )}
          </div>
        </div>

        {/* 페이지네이션 */}
        <div className="mt-6 flex items-center justify-between">
          <p className="text-base font-semibold text-gray-700 dark:text-gray-300">
            <span className="text-gray-900 dark:text-gray-50">{currentSeq}</span>
            <span className="mx-1.5 text-gray-300">/</span>
            <span className="text-gray-400">{total}</span>
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onPrev}
              disabled={!hasPrev}
              aria-label="prev"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!hasNext}
              aria-label="next"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
