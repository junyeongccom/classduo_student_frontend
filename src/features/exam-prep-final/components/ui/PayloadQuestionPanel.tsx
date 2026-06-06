/**
 * @file PayloadQuestionPanel.tsx
 * @description payload 유형(매칭/빈칸/복수/서술형) 풀이 패널 + question_format 디스패처.
 *   레거시 단일 4지선다는 SolveQuestionPanel 이 담당하고, 본 패널은 question_format 이 있는
 *   신규 유형만 렌더(컨테이너에서 분기). 응답 값은 유형별 polymorphic.
 *   레이아웃은 SolveCanvas(1920×1080) 안에서 cqw 비례 — Figma 시안 매칭.
 * @module features/exam-prep-final/components/ui
 */

'use client'

import {
  Bookmark,
  Check,
  X as XIcon,
  FileText,
  Mic,
  MessageSquareText,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/shared/lib/utils'
import { useI18n } from '@/shared/i18n/I18nProvider'
import type {
  CoreTestQuestionItemDto,
  GradeSingleResponseDto,
} from '../../services/examPrepService'
import type { QuizFormResult, PrincipleQuiz } from './forms/types'
import { MatchForm } from './forms/MatchForm'
import { FillBlank5SingleForm } from './forms/FillBlank5SingleForm'
import { FillBlank7MultiForm } from './forms/FillBlank7MultiForm'
import { Mcq4SingleForm } from './forms/Mcq4SingleForm'
import { Mcq6MultiForm } from './forms/Mcq6MultiForm'
import { EssayForm } from './forms/EssayForm'
import { shuffleOrder } from '../../domain/shuffleOrder'

const ESSAY_FORMAT = 'error_diagnosis_evaluation'

/** 유형별 응답이 제출 가능한 상태인지 (submit 버튼 활성 판정). */
export function isPayloadResponseComplete(
  questionFormat: string | null | undefined,
  payload: Record<string, unknown> | null | undefined,
  response: unknown,
): boolean {
  if (!questionFormat) return false
  const p = (payload ?? {}) as Record<string, unknown>
  switch (questionFormat) {
    case 'term_definition_match3': {
      const left = Array.isArray(p.left_items) ? p.left_items.length : 3
      return Array.isArray(response) && response.length >= left
    }
    case 'category_fill_blank7_multi': {
      const arr = Array.isArray(response) ? response : []
      return arr.length >= 2 && arr.every((v) => typeof v === 'number')
    }
    case 'description_mcq6_multi':
      return Array.isArray(response) && response.length === 2
    case 'error_diagnosis_evaluation':
      return typeof response === 'string' && response.trim().length > 0
    default: // 단수 객관식/단일 빈칸
      return typeof response === 'number'
  }
}

/** 채점 응답 + 문항 payload 로 폼 result(정답 하이라이트용) 구성. */
function buildResult(
  question: CoreTestQuestionItemDto,
  graded: GradeSingleResponseDto | null,
): QuizFormResult | null {
  if (!graded) return null
  const payload = (question.payload ?? {}) as Record<string, unknown>
  return {
    is_correct: graded.is_correct,
    correct_answer:
      (payload.correct_pairs as [number, number][] | undefined) ??
      (payload.correct_answer as number | number[] | undefined) ??
      null,
    payload: payload as never,
  }
}

interface PayloadQuestionPanelProps {
  question: CoreTestQuestionItemDto
  /** 현재 attempt id — 선지 결정론 셔플 시드(재진입마다 새 순서). */
  attemptId?: string | null
  currentSeq: number
  total: number
  response: unknown
  graded: GradeSingleResponseDto | null
  isGrading: boolean
  isBookmarked: boolean
  onBookmarkToggle: () => void
  onResponseChange: (value: unknown) => void
  onSubmit: () => void
  onPrev: () => void
  onNext: () => void
  hasPrev: boolean
  hasNext: boolean
  onSourceClick?: (kind: 'materials' | 'recordings') => void
  onAskChatbot?: () => void
  /** 힌트(전구) 클릭 — 객관식/빈칸채우기에서 오답 선지 1개 제거. */
  onHint?: () => void
  /** 힌트로 제거된 오답 choice 인덱스 — 해당 선택지 비활성/취소선. */
  eliminatedIdx?: number
  canFinish: boolean
  onFinish: () => void
  mobileBottomSpacer?: boolean
}

export function PayloadQuestionPanel({
  question,
  attemptId,
  currentSeq,
  total,
  response,
  graded,
  isGrading,
  isBookmarked,
  onBookmarkToggle,
  onResponseChange,
  onSubmit,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  onSourceClick,
  onAskChatbot,
  onHint,
  eliminatedIdx,
  canFinish,
  onFinish,
}: PayloadQuestionPanelProps) {
  const t = useTranslations()
  const { locale } = useI18n()
  const isEn = locale === 'en'
  const [showExplanation, setShowExplanation] = useState(false)

  const qf = question.question_format ?? null
  const isEssay = qf === ESSAY_FORMAT
  const payload = (question.payload ?? {}) as Record<string, unknown>
  const stem = (isEn && question.stem_eng) ? question.stem_eng : question.stem
  const choices = (payload.choices as string[] | undefined) ?? []
  const result = buildResult(question, graded)
  const isLocked = graded !== null
  // ── 선지 결정론 셔플 (표시 전용) — attemptId+questionId 시드. 정규 인덱스는 보존하고
  //    표시 순서만 섞은 뒤 onChange 는 표시→정규로 되돌려 보내 채점/저장은 영향 없음.
  //    재진입(새 attempt) → 새 시드 → 새 순서, 이어풀기(같은 attempt) → 동일 순서. ──
  const choiceOrder =
    choices.length > 1 && attemptId
      ? shuffleOrder(choices.length, `${attemptId}:${question.id}`)
      : choices.map((_, i) => i)
  const choiceInverse: number[] = []
  choiceOrder.forEach((ci, di) => {
    choiceInverse[ci] = di
  })
  const displayChoices = choiceOrder.map((ci) => choices[ci])
  const toDisp = (ci: number) => choiceInverse[ci] ?? ci
  const toCanon = (di: number) => choiceOrder[di] ?? di
  const mapIdx = (v: unknown, fn: (n: number) => number): unknown =>
    v == null
      ? v
      : Array.isArray(v)
        ? v.map((x) => (typeof x === 'number' ? fn(x) : x))
        : typeof v === 'number'
          ? fn(v)
          : v
  const dispValue = mapIdx(response, toDisp)
  const dispResult = result
    ? { ...result, correct_answer: mapIdx(result.correct_answer, toDisp) as typeof result.correct_answer }
    : result
  const dispEliminated = typeof eliminatedIdx === 'number' ? toDisp(eliminatedIdx) : eliminatedIdx
  const onChoiceChange = (v: unknown) => onResponseChange(mapIdx(v, toCanon))
  const complete = isPayloadResponseComplete(qf, payload, response)
  // 해설 텍스트 — graded.explanation 우선, 없으면 question.explanation. key 'detailed' 우선.
  const explObj = (graded?.explanation ?? question.explanation) as Record<string, string> | null | undefined
  const explanationText = explObj?.detailed ?? (explObj ? Object.values(explObj)[0] ?? '' : '')

  // 정/오답 배지 — 채점 후 각 폼의 feedbackSlot(문제/지시문 밑)에 표시 (시안: 라벨이 문제 밑). Essay 제외.
  const feedbackBadge =
    graded && !isEssay ? (
      graded.is_correct ? (
        <span
          className="flex items-center rounded-full bg-violet-100 font-semibold text-violet-700"
          style={{ gap: '0.356cqw', padding: '0.356cqw 0.948cqw', fontSize: '0.924cqw' }}
        >
          <Check style={{ width: '1.067cqw', height: '1.067cqw' }} /> 정답
        </span>
      ) : (
        <span
          className="flex items-center rounded-full bg-rose-100 font-semibold text-rose-700"
          style={{ gap: '0.356cqw', padding: '0.356cqw 0.948cqw', fontSize: '0.924cqw' }}
        >
          <XIcon style={{ width: '1.067cqw', height: '1.067cqw' }} /> 오답
        </span>
      )
    ) : null

  // ── 유형별 폼 디스패치 ──
  const renderForm = () => {
    switch (qf) {
      case 'term_definition_match3':
        return (
          <MatchForm
            questionText={stem}
            leftItems={(payload.left_items as string[]) ?? []}
            rightItems={(payload.right_items as string[]) ?? []}
            value={(response as [number, number][] | null) ?? null}
            onChange={(v) => onResponseChange(v)}
            disabled={isLocked}
            result={result}
            feedbackSlot={feedbackBadge}
          />
        )
      case 'category_fill_blank5_single':
        return (
          <FillBlank5SingleForm
            questionText={stem}
            choices={displayChoices}
            value={(dispValue as number | null) ?? null}
            onChange={onChoiceChange}
            disabled={isLocked}
            result={dispResult}
            eliminatedIdx={dispEliminated}
            feedbackSlot={feedbackBadge}
          />
        )
      case 'category_fill_blank7_multi':
        return (
          <FillBlank7MultiForm
            questionText={stem}
            choices={displayChoices}
            value={(dispValue as (number | null)[] | null) ?? null}
            onChange={onChoiceChange}
            disabled={isLocked}
            result={dispResult}
            eliminatedIdx={dispEliminated}
            feedbackSlot={feedbackBadge}
          />
        )
      case 'description_mcq6_multi':
        return (
          <Mcq6MultiForm
            questionText={stem}
            choices={displayChoices}
            value={(dispValue as number[] | null) ?? null}
            onChange={onChoiceChange}
            disabled={isLocked}
            result={dispResult}
            eliminatedIdx={dispEliminated}
            feedbackSlot={feedbackBadge}
          />
        )
      case 'error_diagnosis_evaluation': {
        const quiz: PrincipleQuiz = {
          id: question.id,
          sub_type: 'error_diagnosis_evaluation',
          question_text: stem,
          payload: payload as never,
        }
        return (
          <EssayForm
            quiz={quiz}
            value={(response as string) ?? ''}
            onChange={(v) => onResponseChange(v)}
            hasSubmitted={isLocked}
            result={result}
          />
        )
      }
      // compare_contrast_mcq4 / reason_purpose_mcq4 / description_mcq4_single
      default:
        return (
          <Mcq4SingleForm
            questionText={stem}
            choices={displayChoices}
            value={(dispValue as number | null) ?? null}
            onChange={onChoiceChange}
            disabled={isLocked}
            result={dispResult}
            eliminatedIdx={dispEliminated}
            feedbackSlot={feedbackBadge}
          />
        )
    }
  }

  const sr = (question.source_ref ?? null) as
    | { source_pages?: number[]; source_chunks?: number[] }
    | null
  // #0(또는 음수) 항목은 UI/네비게이션 제외 — #1 부터 (사용자 정책).
  const sourcePages = (sr?.source_pages ?? []).filter((p) => p > 0)
  const sourceChunks = (sr?.source_chunks ?? []).filter((c) => c > 0)
  const hasMaterial = sourcePages.length > 0
  const hasRecording = sourceChunks.length > 0
  const materialTooltip = hasMaterial
    ? `강의자료 ${sourcePages.map((p) => `p.${p}`).join(', ')}`
    : null
  const recordingTooltip = hasRecording
    ? `녹음본 청크 ${sourceChunks.map((c) => `#${c}`).join(', ')}`
    : null

  // 하단 좌측 아이콘 버튼 공통 스타일 (cqw)
  const iconBtn =
    'flex items-center justify-center rounded-[0.498cqw] text-gray-400 transition-colors hover:bg-black/5 hover:text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed dark:hover:bg-white/10'
  const iconBtnStyle = { width: '2.714cqw', height: '2.714cqw' } as const /* figma 44px */
  const iconSize = { width: '1.481cqw', height: '1.481cqw' } as const /* figma 24px */

  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col bg-[#F6F7F9] dark:bg-gray-950"
      style={{ padding: '2.465cqw 21.452cqw 3.5cqw 18.205cqw' /* figma content x=595 (사이드바300+좌295), 폼폭 ~977. 하단 여백 = 툴바/네비가 화면 바닥에 붙지 않게 띄움(시안 간격) */ }}
    >
      <div className="flex h-full w-full min-h-0 flex-col">
        {/* 폼 영역 (stem + body) — 상단 정렬, 남는 높이 차지 */}
        <div className="flex min-h-0 flex-1 flex-col" style={{ overflowY: 'auto' }}>
          {/* Essay 는 feedbackSlot 이 없어 제출완료 배지를 폼 위에 유지. 그 외 유형은 폼 내부 feedbackSlot(문제 밑). */}
          {graded && isEssay && (
            <div className="mb-[1.185cqw] flex items-center" style={{ gap: '0.593cqw' }}>
              <span
                className="rounded-full bg-violet-100 font-semibold text-violet-700"
                style={{ padding: '0.356cqw 0.948cqw', fontSize: '0.924cqw' }}
              >
                제출 완료 · 모범답안 확인
              </span>
            </div>
          )}

          {/* 유형별 폼 본문 (폼이 stem + body 렌더) */}
          {renderForm()}

          {/* 해설 영역 — 채점 후 [해설보기] 시 펼침. 매칭은 정답 다이어그램 + 텍스트. */}
          {showExplanation && (
            <div className="mt-[2cqw] flex w-full flex-col border-t border-gray-200 pt-[1.5cqw]" style={{ gap: '1.5cqw' }}>
              <p className="font-bold" style={{ fontSize: '1.5cqw', color: 'var(--color-neutral-black-hex)' }}>
                해설
              </p>
              {qf === 'term_definition_match3' && (
                <MatchForm
                  questionText=""
                  showHeader={false}
                  leftItems={(payload.left_items as string[]) ?? []}
                  rightItems={(payload.right_items as string[]) ?? []}
                  value={(payload.correct_pairs as [number, number][]) ?? null}
                  onChange={() => {}}
                  disabled
                  result={{
                    is_correct: true,
                    correct_answer: (payload.correct_pairs as [number, number][]) ?? null,
                    payload: payload as never,
                  }}
                />
              )}
              {explanationText && (
                <p className="break-keep text-center whitespace-pre-line" style={{ fontSize: '1.1cqw', lineHeight: 1.7, color: 'rgb(75 85 99)' }}>
                  {explanationText}
                </p>
              )}
            </div>
          )}
        </div>

        {/* 하단 툴바 — 좌: 보조 아이콘 / 우: 힌트(전구) + 제출 */}
        <div className="flex shrink-0 items-center justify-between" style={{ marginTop: '0.498cqw' /* figma 폼끝~하단세트 8px */ }}>
          <div className="flex items-center" style={{ gap: '0.474cqw' }}>
            <button
              type="button"
              onClick={onBookmarkToggle}
              className={cn(iconBtn, isBookmarked && 'text-violet-500 hover:text-violet-600')}
              style={iconBtnStyle}
              aria-label={isBookmarked ? '즐겨찾기 해제' : '즐겨찾기 추가'}
            >
              <Bookmark style={iconSize} className={cn(isBookmarked && 'fill-current')} />
            </button>
            <div className="group/src-mat relative inline-flex">
              <button
                type="button"
                onClick={() => onSourceClick?.('materials')}
                disabled={!hasMaterial || !onSourceClick}
                className={iconBtn}
                style={iconBtnStyle}
                aria-label="강의자료 출처 보기"
              >
                <FileText style={iconSize} />
              </button>
              {materialTooltip && (
                <div
                  role="tooltip"
                  className="pointer-events-none absolute left-0 z-20 whitespace-nowrap bg-gray-900 font-medium text-white opacity-0 transition-opacity duration-150 group-hover/src-mat:opacity-100 dark:bg-gray-700"
                  style={{ bottom: 'calc(100% + 0.4cqw)', fontSize: '1cqw', padding: '0.3cqw 0.6cqw', borderRadius: '0.4cqw' }}
                >
                  {materialTooltip}
                </div>
              )}
            </div>
            <div className="group/src-rec relative inline-flex">
              <button
                type="button"
                onClick={() => onSourceClick?.('recordings')}
                disabled={!hasRecording || !onSourceClick}
                className={iconBtn}
                style={iconBtnStyle}
                aria-label="녹음본 출처 보기"
              >
                <Mic style={iconSize} />
              </button>
              {recordingTooltip && (
                <div
                  role="tooltip"
                  className="pointer-events-none absolute left-0 z-20 whitespace-nowrap bg-gray-900 font-medium text-white opacity-0 transition-opacity duration-150 group-hover/src-rec:opacity-100 dark:bg-gray-700"
                  style={{ bottom: 'calc(100% + 0.4cqw)', fontSize: '1cqw', padding: '0.3cqw 0.6cqw', borderRadius: '0.4cqw' }}
                >
                  {recordingTooltip}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onAskChatbot}
              disabled={!onAskChatbot}
              className={iconBtn}
              style={iconBtnStyle}
              aria-label="AI 챗봇에게 물어보기"
            >
              <MessageSquareText style={iconSize} />
            </button>
          </div>

          <div className="flex items-center" style={{ gap: '1.185cqw' }}>
            {/* 힌트(전구) — 객관식/빈칸채우기에서 오답 1개 제거. 선택지 없는 유형(매칭/서술형)·사용 후 숨김. */}
            {!isLocked && onHint && choices.length > 0 && eliminatedIdx == null && (
              <div className="group/hint relative flex items-center">
                <button
                  type="button"
                  onClick={onHint}
                  className="flex items-center justify-center text-amber-400 transition-transform hover:scale-110"
                  style={{ width: '2.844cqw', height: '2.844cqw' }}
                  aria-label="힌트"
                >
                  <Lightbulb style={{ width: '2.015cqw', height: '2.015cqw' }} className="fill-amber-200" />
                </button>
                <div
                  role="tooltip"
                  className="pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 whitespace-nowrap bg-gray-900 font-medium text-white opacity-0 transition-opacity duration-150 group-hover/hint:opacity-100 dark:bg-gray-700"
                  style={{ bottom: 'calc(100% + 0.4cqw)', fontSize: '1cqw', padding: '0.3cqw 0.6cqw', borderRadius: '0.4cqw' }}
                >
                  힌트보기
                </div>
              </div>
            )}
            {/* 제출 (채점 후엔 숨김 — 서술형은 제출=모범답안 노출) */}
            {!isLocked && (
              <button
                type="button"
                onClick={onSubmit}
                disabled={!complete || isGrading}
                className="flex items-center justify-center bg-[#7c7aec] font-semibold text-white transition-colors hover:brightness-95 disabled:opacity-40"
                style={{
                  minWidth: '8.024cqw' /* figma 130px */,
                  height: '3.704cqw' /* figma 60px */,
                  borderRadius: '0.747cqw',
                  padding: '0 1.730cqw',
                  fontSize: '1.233cqw',
                }}
              >
                {isGrading ? '채점 중...' : t('examPrepFinal.submit')}
              </button>
            )}
            {/* 해설보기 / 닫기 (채점 후, 서술형 제외 — 서술형은 모범답안이 폼에 노출) */}
            {isLocked && !isEssay && (
              <button
                type="button"
                onClick={() => setShowExplanation((s) => !s)}
                className="flex items-center justify-center bg-[#7c7aec] font-semibold text-white transition-colors hover:brightness-95"
                style={{
                  minWidth: '8.024cqw',
                  height: '3.704cqw',
                  borderRadius: '0.747cqw',
                  padding: '0 1.730cqw',
                  fontSize: '1.233cqw',
                }}
              >
                {showExplanation ? '닫기' : '해설보기'}
              </button>
            )}
          </div>
        </div>

        {/* 푸터 — 좌: n/total / 우: 이전·다음 화살표 (+ 종료) */}
        <div className="flex shrink-0 items-center justify-between" style={{ marginTop: '1.304cqw' }}>
          <p className="font-bold" style={{ fontSize: '1.363cqw' /* figma 1/10 ~22px */ }}>
            <span className="text-gray-900 dark:text-gray-50">{currentSeq}</span>
            <span className="mx-[0.474cqw] text-gray-300">/</span>
            <span className="text-gray-400">{total}</span>
          </p>
          <div className="flex items-center" style={{ gap: '0.593cqw' }}>
            <button
              type="button"
              onClick={onPrev}
              disabled={!hasPrev}
              aria-label="prev"
              className="flex items-center justify-center border border-gray-300 bg-white text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
              style={{ width: '3.390cqw', height: '3.390cqw', borderRadius: '0.616cqw' }} /* figma 55px */
            >
              <ChevronLeft style={{ width: '1.778cqw', height: '1.778cqw' }} />
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!hasNext}
              aria-label="next"
              className="flex items-center justify-center border border-gray-300 bg-white text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
              style={{ width: '3.390cqw', height: '3.390cqw', borderRadius: '0.616cqw' }} /* figma 55px */
            >
              <ChevronRight style={{ width: '1.778cqw', height: '1.778cqw' }} />
            </button>
            {canFinish && (
              <button
                type="button"
                onClick={onFinish}
                aria-label={t('examPrepFinal.endQuizAria')}
                className="flex items-center justify-center bg-[#7c7aec] font-bold text-white transition-colors hover:brightness-95"
                style={{ height: '3.390cqw', borderRadius: '0.616cqw', padding: '0 1.304cqw', fontSize: '1.114cqw' }}
              >
                {t('examPrepFinal.endQuiz')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
