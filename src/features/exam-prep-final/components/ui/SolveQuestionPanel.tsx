/**
 * @file SolveQuestionPanel.tsx
 * @description 풀이 페이지 메인 — 즉시 채점 흐름 (정오답/해설 표시) + 힌트 버튼 + 키보드 조작
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
  Mic,
  Bot,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/shared/lib/utils'
import { HintBulbButton } from './HintBulbButton'
import type {
  CoreTestQuestionItemDto,
  GradeSingleResponseDto,
} from '../../services/examPrepService'

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
  /** 현재 문항의 mastery state. 'master' 면 풀이 락 + 정답 자동 노출 (사이드바에서 색으로 표시). */
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
  /** 출처(강의자료/녹음본) 클릭 — 좌측 자료 패널 열고 해당 페이지/청크로 점프. kind 미정시 source_ref 자동 분기. */
  onSourceClick?: (kind: 'materials' | 'recordings') => void
  /** AI 챗봇 호출 — 우측 패널 열고 현재 문항 컨텍스트 주입 */
  onAskChatbot?: () => void
  /** 모든 문항(채점 가능한 모든) 채점 완료 → "퀴즈 종료" 버튼 활성화 */
  canFinish: boolean
  /** "퀴즈 종료" 클릭 — 결과 화면 전환 */
  onFinish: () => void
}

const OPTION_LABELS = ['A', 'B', 'C', 'D']
const HINT_DELAY_SEC = 20
/** 오답 shake 지속시간 — 끝난 뒤 정답 강조 표시. tailwind keyframes shake-x 와 동기. */
const SHAKE_MS = 420

export function SolveQuestionPanel({
  question,
  currentSeq,
  total,
  selectedChoice,
  graded,
  hintDisabledOption,
  isGrading,
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
  onSourceClick,
  onAskChatbot,
  canFinish,
  onFinish,
}: SolveQuestionPanelProps) {
  const t = useTranslations()
  // 힌트 진행률 0~100 (% 단위) — RAF 로 매 프레임 갱신, 끊김 없음
  const [hintProgressPct, setHintProgressPct] = useState(0)
  const hintStartRef = useRef<number | null>(null)
  // 해설보기 토글 — currentSeq 가 바뀌면 자동 닫힘
  const [showExplanation, setShowExplanation] = useState(false)
  // 오답 시 shake 모션 중 여부 — true 동안엔 정답 표시를 보류
  const [shaking, setShaking] = useState(false)
  const seqRef = useRef(currentSeq)

  // 문항 전환 시 힌트/해설/shake 리셋
  useEffect(() => {
    if (seqRef.current !== currentSeq) {
      seqRef.current = currentSeq
      setHintProgressPct(0)
      hintStartRef.current = null
      setShowExplanation(false)
      setShaking(false)
    }
  }, [currentSeq])

  // 정답 인덱스 (백엔드 graded.correct_answer 또는 question.answer)
  const correctIdx = (() => {
    if (graded?.correct_answer) return parseInt(graded.correct_answer, 10)
    return parseInt(question.answer, 10)
  })()

  // master 락 + 채점 락
  const isMasterLocked = currentQuestionState === 'master' && !graded
  const isLocked = graded !== null || isMasterLocked

  // 오답 채점 도착 시 shake 시작 → SHAKE_MS 후 종료 (정답 강조 노출 트리거)
  useEffect(() => {
    if (graded && !graded.is_correct) {
      setShaking(true)
      const id = setTimeout(() => setShaking(false), SHAKE_MS)
      return () => clearTimeout(id)
    }
    setShaking(false)
  }, [graded])

  // 힌트 progress RAF — isLocked / 100% 도달 / 문항 전환 시 정지
  useEffect(() => {
    if (isLocked) return
    if (hintProgressPct >= 100) return
    let rafId = 0
    const tick = (now: number) => {
      if (hintStartRef.current === null) hintStartRef.current = now
      const elapsed = (now - hintStartRef.current) / 1000
      const pct = Math.min(100, (elapsed / HINT_DELAY_SEC) * 100)
      setHintProgressPct(pct)
      if (pct < 100) rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [currentSeq, isLocked, hintProgressPct])

  const hintRemainingSec = Math.max(
    0,
    Math.ceil(HINT_DELAY_SEC - (hintProgressPct / 100) * HINT_DELAY_SEC),
  )
  const hintAvailable =
    !isLocked && hintProgressPct >= 100 && hintDisabledOption == null
  const hintTimerActive = !isLocked && hintProgressPct < 100

  // 키보드 조작 — ↑/↓ 선지 이동, ←/→ 문제 이동.
  // 첫 진입 시 ↓ 누르면 0번, ↑ 누르면 마지막. 채점/락 상태에서 ↑↓ 무시.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (isLocked || isGrading) return
        e.preventDefault()
        const max = question.options.length
        if (max === 0) return
        if (selectedChoice === null) {
          onSelectChoice(e.key === 'ArrowDown' ? 0 : max - 1)
          return
        }
        let next = selectedChoice + (e.key === 'ArrowDown' ? 1 : -1)
        // 힌트로 disable된 옵션은 건너뛰기
        const isBlocked = (i: number) => hintDisabledOption === i
        let safety = max
        while (isBlocked(next) && safety-- > 0) {
          next += e.key === 'ArrowDown' ? 1 : -1
        }
        next = Math.max(0, Math.min(max - 1, next))
        if (!isBlocked(next)) onSelectChoice(next)
      } else if (e.key === 'ArrowLeft') {
        if (hasPrev) {
          e.preventDefault()
          onPrev()
        }
      } else if (e.key === 'ArrowRight') {
        if (hasNext) {
          e.preventDefault()
          onNext()
        }
      } else if (e.key === 'Enter') {
        // 포커스된 [다음] chevron 버튼이 브라우저 기본 동작으로 click 되는 것을 차단하고
        // 항상 [제출] 동작으로 통일. 이미 채점됐거나 락/채점 중이면 no-op.
        e.preventDefault()
        if (isLocked || isGrading) return
        if (graded) return
        if (selectedChoice === null) return
        onSubmit()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [
    selectedChoice,
    question.options.length,
    hintDisabledOption,
    isLocked,
    isGrading,
    hasPrev,
    hasNext,
    graded,
    onSelectChoice,
    onPrev,
    onNext,
    onSubmit,
  ])

  return (
    <div className="flex h-full flex-1 flex-col overflow-y-auto bg-[#F5F7F8] dark:bg-gray-950">
      <div className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-8 py-8">
        {/* 마스터 도달 도장 — 첫 마스터 시 문제 우상단에 absolute 로 쾅 찍힘 (스케일 인 + 살짝 회전) */}
        {graded?.mastery.first_master_transition && (
          <img
            src="/master.png"
            alt="Master 도달!"
            aria-hidden
            draggable={false}
            className="master-stamp-pop pointer-events-none absolute right-4 top-2 z-10 h-24 w-24 select-none"
          />
        )}

        {/* 문제 stem — 상단 메타(단일선택/숙련도 카운트)는 사이드바로 통합 */}
        <h1 className="text-3xl font-bold leading-snug text-gray-900 dark:text-gray-50">
          {question.stem}
        </h1>

        {/* 채점 결과 배지 영역 — 항상 고정 높이 (h-9 mt-5) 로 비워둬서 채점 후 높낮이 변동 방지 */}
        <div className="mt-5 flex h-9 items-center gap-2">
          {graded && (
            <>
              {graded.is_correct ? (
                <span className="flex items-center gap-1 rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-700">
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
            </>
          )}
        </div>

        {/* 선지 — 그림자 추가, 정답=연보라 outline, 오답=빨강 + shake-then-reveal */}
        <div className="mt-6 flex flex-col gap-3">
          {question.options.map((opt, idx) => {
            const label = OPTION_LABELS[idx] ?? String.fromCharCode(65 + idx)
            const isSelected = selectedChoice === idx
            const isHintDisabled = hintDisabledOption === idx
            // 정답 강조: 채점되면 즉시 표시 (오답 흔들림과 동시).
            const showCorrectHighlight =
              (graded && idx === correctIdx) ||
              (isMasterLocked && idx === correctIdx)
            const isWrongPick = !!(graded && isSelected && !graded.is_correct)
            const shouldShake = isWrongPick && shaking

            return (
              <button
                key={idx}
                type="button"
                disabled={isLocked || isHintDisabled || isGrading}
                onClick={() => onSelectChoice(idx)}
                className={cn(
                  'group relative flex w-full items-center gap-4 rounded-xl border bg-white px-5 py-4 text-left shadow-sm transition-all',
                  // base / hover / select — violet 계열로 통일
                  !isLocked &&
                    !isHintDisabled &&
                    'hover:bg-violet-50/50 hover:shadow-md dark:bg-gray-900 dark:hover:bg-gray-800',
                  isSelected &&
                    !graded &&
                    !isHintDisabled &&
                    'border-violet-400 bg-violet-50 shadow-md dark:border-violet-500 dark:bg-violet-950/30',
                  !isSelected && !graded && 'border-gray-200 dark:border-gray-700',
                  // 정답 강조 — outline 으로 박스 크기 영향 X
                  showCorrectHighlight &&
                    'outline outline-[3px] outline-offset-[-2px] outline-[#A78BFA] bg-[#F5F3FF] dark:bg-violet-950/30',
                  // 오답 선택 — 빨강 (border 두께는 동일, 색만 변경)
                  isWrongPick &&
                    'border-rose-400 bg-rose-50 dark:border-rose-500 dark:bg-rose-950/30',
                  // 힌트 disable
                  isHintDisabled &&
                    'border-gray-200 bg-gray-50 opacity-50 dark:border-gray-700 dark:bg-gray-900',
                  (isLocked || isHintDisabled) && 'cursor-not-allowed',
                  shouldShake && 'animate-shake-x',
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-bold transition-colors',
                    showCorrectHighlight
                      ? 'bg-[#A78BFA] text-white'
                      : isWrongPick
                        ? 'bg-rose-500 text-white'
                        : isSelected
                          ? 'bg-violet-500 text-white'
                          : 'text-gray-500 dark:text-gray-400',
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

        {/* 해설 — 채점 후엔 graded.explanation, master 락이면 question.explanation 사용 */}
        {showExplanation &&
          (() => {
            const explanation = graded?.explanation ?? question.explanation
            if (!explanation || Object.keys(explanation).length === 0) return null
            return (
              <div className="mt-5 rounded-xl border border-gray-200 bg-white p-4 text-sm leading-relaxed text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  해설
                </p>
                {Object.entries(explanation).map(([key, val]) => (
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
            )
          })()}

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
            {(() => {
              const sr = (question.source_ref ?? null) as
                | { source_pages?: number[]; source_chunks?: number[] }
                | null
              // #0 (또는 음수) 항목은 UI/네비게이션에서 제외 — #1번부터 시작 (사용자 정책).
              const pages = (sr?.source_pages ?? []).filter((p) => p > 0)
              const chunks = (sr?.source_chunks ?? []).filter((c) => c > 0)
              const hasMaterial = pages.length > 0
              const hasRecording = chunks.length > 0
              const sourceClickable = !!onSourceClick && (hasMaterial || hasRecording)
              const materialTooltip = hasMaterial
                ? `강의자료 ${pages.map((p) => `p.${p}`).join(', ')}`
                : null
              const recordingTooltip = hasRecording
                ? `녹음본 청크 ${chunks.map((c) => `#${c}`).join(', ')}`
                : null
              // 강의자료 / 녹음본 동시에 있으면 두 버튼 모두 노출 — 단일 버튼이라 녹음본
              // 클릭 경로가 막혔던 회귀 fix.
              return (
                <div className="flex items-center gap-1">
                  {hasMaterial && (
                    <div className="group/source-mat relative inline-flex items-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (!onSourceClick) return
                          onSourceClick('materials')
                        }}
                        disabled={!onSourceClick}
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
                          onSourceClick
                            ? 'hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800'
                            : 'opacity-40 cursor-not-allowed',
                        )}
                        aria-label="강의자료 출처 보기"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                      {materialTooltip && (
                        <div
                          role="tooltip"
                          className="pointer-events-none absolute left-1/2 top-0 z-20 w-max max-w-[260px] -translate-x-1/2 -translate-y-[calc(100%+8px)] opacity-0 transition-opacity duration-150 group-hover/source-mat:opacity-100"
                        >
                          <div className="rounded-md bg-gray-900 px-2 py-1 text-[11px] font-medium text-white shadow-md dark:bg-gray-700">
                            {materialTooltip}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {hasRecording && (
                    <div className="group/source-rec relative inline-flex items-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (!onSourceClick) return
                          onSourceClick('recordings')
                        }}
                        disabled={!onSourceClick}
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
                          onSourceClick
                            ? 'hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800'
                            : 'opacity-40 cursor-not-allowed',
                        )}
                        aria-label="녹음본 출처 보기"
                      >
                        <Mic className="h-4 w-4" />
                      </button>
                      {recordingTooltip && (
                        <div
                          role="tooltip"
                          className="pointer-events-none absolute left-1/2 top-0 z-20 w-max max-w-[260px] -translate-x-1/2 -translate-y-[calc(100%+8px)] opacity-0 transition-opacity duration-150 group-hover/source-rec:opacity-100"
                        >
                          <div className="rounded-md bg-gray-900 px-2 py-1 text-[11px] font-medium text-white shadow-md dark:bg-gray-700">
                            {recordingTooltip}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {!sourceClickable && (
                    <button
                      type="button"
                      disabled
                      className="flex h-9 w-9 items-center justify-center rounded-lg opacity-40 cursor-not-allowed"
                      aria-label="출처 없음"
                    >
                      <FileText className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )
            })()}
            <button
              type="button"
              onClick={onAskChatbot}
              disabled={!onAskChatbot}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
                onAskChatbot
                  ? 'hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800'
                  : 'opacity-40 cursor-not-allowed',
              )}
              aria-label="AI 챗봇에게 물어보기"
              title="AI 챗봇에게 이 문제 물어보기"
            >
              <Bot className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* 힌트 — 노란 전구 버튼. 20초 동안 시계방향 conic-gradient 채움. */}
            {!isMasterLocked && (
              <HintBulbButton
                progressPct={hintProgressPct}
                onClick={onHint}
                available={hintAvailable}
                inactive={!!graded || hintDisabledOption != null}
              />
            )}
            {isMasterLocked || graded ? (
              <button
                type="button"
                onClick={() => setShowExplanation((v) => !v)}
                className="flex h-10 min-w-[104px] items-center justify-center rounded-lg bg-violet-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-violet-600"
              >
                {showExplanation ? '해설 닫기' : '해설보기'}
              </button>
            ) : (
              <button
                type="button"
                onClick={onSubmit}
                disabled={selectedChoice === null || isLocked || isGrading}
                className="flex h-10 min-w-[104px] items-center justify-center rounded-lg bg-violet-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-violet-600 disabled:opacity-40"
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrev}
              disabled={!hasPrev}
              aria-label="prev"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {canFinish ? (
              <button
                type="button"
                onClick={onFinish}
                aria-label="퀴즈 종료"
                className="flex h-9 items-center justify-center rounded-lg bg-violet-600 px-4 text-sm font-bold text-white transition-colors hover:bg-violet-700"
              >
                퀴즈 종료
              </button>
            ) : (
              <button
                type="button"
                onClick={onNext}
                disabled={!hasNext}
                aria-label="next"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
