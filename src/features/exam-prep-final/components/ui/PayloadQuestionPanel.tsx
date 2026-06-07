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

/**
 * 번호식 보기별 해설('1: …\n2: …')을 표시 순서로 재배열·재번호.
 * 백엔드 _reorder_numbered_explanation 의 프론트 포팅 — 선지를 프론트에서 다시 셔플할 때
 * 저장된 순서로 번호 매겨진 해설이 표시 순서와 어긋나는 문제(선지↔해설 불일치) 보정.
 *
 * @param text       저장된 해설 텍스트 (저장 순서 기준 '1: …\n2: …').
 * @param toCanon    표시 위치(0-based) → 정규(저장) 위치(0-based).
 * @param n          선지 개수.
 * @returns 표시 순서로 재번호된 텍스트. 번호식 n줄 형식이 아니면 null(콘텐츠 기반 → 그대로 사용).
 */
function reorderNumberedExplanation(
  text: string,
  toCanon: (displayIdx: number) => number,
  n: number,
): string | null {
  if (!text) return null
  const bodies: Record<number, string> = {}
  for (const line of text.split('\n')) {
    const s = line.trim()
    if (!s) continue
    const m = /^(\d+)\s*[:.)]\s*(.+)$/.exec(s)
    if (!m) return null
    const oldIdx = parseInt(m[1], 10) - 1
    if (!(oldIdx >= 0 && oldIdx < n) || oldIdx in bodies) return null
    bodies[oldIdx] = m[2].trim()
  }
  if (Object.keys(bodies).length !== n) return null
  return Array.from({ length: n }, (_, pos) => `${pos + 1}: ${bodies[toCanon(pos)]}`).join('\n')
}

/**
 * 번호식 보기별 해설('1: …')의 줄머리 번호를 선지 표기(A, B, …)에 맞춰 영문 라벨로 변환.
 * ABCD letter 선지를 쓰는 객관식에서 해설 번호(1234)와 선지 표기가 어긋나는 문제 보정.
 * reorderNumberedExplanation 과 동일한 엄격 검증(1..n 연속 번호 n줄)일 때만 변환, 아니면 원문 유지.
 *
 * @param text 해설 텍스트(표시 순서 기준 '1: …\n2: …').
 * @param n    선지 개수.
 */
function letterizeNumberedExplanation(text: string, n: number): string {
  if (!text || n < 1) return text
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length !== n) return text
  const out: string[] = []
  const seen = new Set<number>()
  for (const line of lines) {
    const m = /^(\d+)\s*[:.)]\s*(.+)$/.exec(line)
    if (!m) return text
    const idx = parseInt(m[1], 10) - 1
    if (!(idx >= 0 && idx < n) || seen.has(idx)) return text
    seen.add(idx)
    out.push(`${String.fromCharCode(65 + idx)}: ${m[2].trim()}`)
  }
  return out.join('\n')
}

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

/** ABCD(letter) 표기로 선지를 노출하는 객관식 — 해설의 보기 번호(1234)도 letter 로 맞춤. */
const LETTER_CHOICE_FORMATS = new Set([
  'description_mcq6_multi', // A~F 6지선다 복수 (Mcq6MultiForm)
  'compare_contrast_mcq4', // A~D 4지선다 단수 (Mcq4SingleForm, default)
  'reason_purpose_mcq4',
  'description_mcq4_single',
])

/** Active Recall 게이트 대상 question_format — skilled 숙련도일 때 선지 전 '먼저 떠올려보기' 노출. */
const ACTIVE_RECALL_FORMATS = new Set([
  'category_fill_blank5_single', // 기억-5지선다 단수 빈칸채우기-종류/구성요소
  'category_fill_blank7_multi', // 기억-7지선다 복수 빈칸채우기-종류/구성요소
  'reason_purpose_mcq4', // 이해-4지선다 단수 객관식-원인/이유
])

interface PayloadQuestionPanelProps {
  question: CoreTestQuestionItemDto
  /** 현재 attempt id — 선지 결정론 셔플 시드(재진입마다 새 순서). */
  attemptId?: string | null
  /** 현재 문항 mastery state — 'skilled' + 대상 유형이면 Active Recall 게이트 노출. */
  currentQuestionState?: 'learning' | 'skilled' | 'master' | null
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
  currentQuestionState,
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
  // Active Recall 게이트 — '선지 보기' 클릭 전엔 false(박스 노출). 문항 전환 시 패널이
  // key={currentSeq} 로 리마운트되므로 자동 리셋 → 매 skilled 문항마다 다시 떠올리기 유도.
  const [recallRevealed, setRecallRevealed] = useState(false)

  const qf = question.question_format ?? null
  const isEssay = qf === ESSAY_FORMAT
  const payload = (question.payload ?? {}) as Record<string, unknown>
  const payloadEng = (question.payload_eng ?? {}) as Record<string, unknown>
  const stem = (isEn && question.stem_eng) ? question.stem_eng : question.stem
  const choices = (isEn
    ? ((payloadEng.choices as string[] | undefined) ?? (payload.choices as string[] | undefined))
    : (payload.choices as string[] | undefined)) ?? []
  const result = buildResult(question, graded)
  const isLocked = graded !== null
  // ── Active Recall 게이트 — skilled 숙련도 + 대상 유형(빈칸5/빈칸7/원인이유mcq4)에서
  //    채점 전·미공개 동안 선지를 가리고 '먼저 떠올려보기' 박스 노출. 클릭 시 선지 공개. ──
  const recallGated =
    currentQuestionState === 'skilled' &&
    qf != null &&
    ACTIVE_RECALL_FORMATS.has(qf) &&
    !isLocked &&
    !recallRevealed
  const recallNode = recallGated ? (
    <ActiveRecallGate onReveal={() => setRecallRevealed(true)} t={t} />
  ) : undefined
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
  // EN 모드: graded.explanation_eng → question.explanation_eng → KO fallback.
  const explObj = isEn
    ? ((graded?.explanation_eng ?? question.explanation_eng ?? graded?.explanation ?? question.explanation) as Record<string, string> | null | undefined)
    : ((graded?.explanation ?? question.explanation) as Record<string, string> | null | undefined)
  const rawExplanationText = explObj?.detailed ?? (explObj ? Object.values(explObj)[0] ?? '' : '')
  // 선지를 프론트에서 셔플했다면(같은 시드로) 번호식 보기별 해설도 동일 permutation 으로 재배열.
  // 번호식이 아닌 일반 해설(detailed/text 프로즈)은 reorder 가 null → 원문 그대로 사용.
  const reorderedExplanation =
    choices.length > 1 && attemptId
      ? reorderNumberedExplanation(rawExplanationText, toCanon, choices.length)
      : null
  // ABCD letter 선지를 쓰는 객관식은 해설 보기 번호(1234)도 선지 표기에 맞춰 letter 로 변환.
  const explanationText =
    qf != null && LETTER_CHOICE_FORMATS.has(qf)
      ? letterizeNumberedExplanation(reorderedExplanation ?? rawExplanationText, choices.length)
      : (reorderedExplanation ?? rawExplanationText)

  // 정/오답 배지 — 채점 후 각 폼의 feedbackSlot(문제/지시문 밑)에 표시 (시안: 라벨이 문제 밑). Essay 제외.
  const feedbackBadge =
    graded && !isEssay ? (
      graded.is_correct ? (
        <span
          className="flex items-center rounded-full bg-violet-100 font-semibold text-violet-700"
          style={{ gap: '0.356cqw', padding: '0.356cqw 0.948cqw', fontSize: '0.924cqw' }}
        >
          <Check style={{ width: '1.067cqw', height: '1.067cqw' }} /> {t('examPrepFinal.solve.correct')}
        </span>
      ) : (
        <span
          className="flex items-center rounded-full bg-rose-100 font-semibold text-rose-700"
          style={{ gap: '0.356cqw', padding: '0.356cqw 0.948cqw', fontSize: '0.924cqw' }}
        >
          <XIcon style={{ width: '1.067cqw', height: '1.067cqw' }} /> {t('examPrepFinal.solve.incorrect')}
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
            leftItems={(isEn
              ? ((payloadEng.left_items as string[] | undefined) ?? (payload.left_items as string[] | undefined))
              : (payload.left_items as string[] | undefined)) ?? []}
            rightItems={(isEn
              ? ((payloadEng.right_items as string[] | undefined) ?? (payload.right_items as string[] | undefined))
              : (payload.right_items as string[] | undefined)) ?? []}
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
            recallSlot={recallNode}
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
            recallSlot={recallNode}
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
      // recallNode 는 reason_purpose_mcq4(ACTIVE_RECALL_FORMATS) + skilled 일 때만 비어있지 않음 →
      // 나머지 mcq4 유형은 recallSlot=undefined 로 게이트 미적용 (안전).
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
            recallSlot={recallNode}
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
    ? t('examPrepFinal.solve.materialTooltip', { pages: sourcePages.map((p) => `p.${p}`).join(', ') })
    : null
  const recordingTooltip = hasRecording
    ? t('examPrepFinal.solve.recordingTooltip', { chunks: sourceChunks.map((c) => `#${c}`).join(', ') })
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
                {t('examPrepFinal.solve.submittedModelAnswer')}
              </span>
            </div>
          )}

          {/* 유형별 폼 본문 (폼이 stem + body 렌더) */}
          {renderForm()}

          {/* 해설 영역 — 채점 후 [해설보기] 시 펼침. 매칭은 정답 다이어그램 + 텍스트. */}
          {showExplanation && (
            <div className="mt-[2cqw] flex w-full flex-col border-t border-gray-200 pt-[1.5cqw]" style={{ gap: '1.5cqw' }}>
              <p className="font-bold" style={{ fontSize: '1.5cqw', color: 'var(--color-exam-canvas-fg)' }}>
                {t('examPrepFinal.solve.explanation')}
              </p>
              {qf === 'term_definition_match3' && (
                <MatchForm
                  questionText=""
                  showHeader={false}
                  leftItems={(isEn
                    ? ((payloadEng.left_items as string[] | undefined) ?? (payload.left_items as string[] | undefined))
                    : (payload.left_items as string[] | undefined)) ?? []}
                  rightItems={(isEn
                    ? ((payloadEng.right_items as string[] | undefined) ?? (payload.right_items as string[] | undefined))
                    : (payload.right_items as string[] | undefined)) ?? []}
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
              aria-label={isBookmarked ? t('examPrepFinal.solve.bookmarkRemove') : t('examPrepFinal.solve.bookmarkAdd')}
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
                aria-label={t('examPrepFinal.solve.sourceMaterialsAria')}
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
                aria-label={t('examPrepFinal.solve.sourceRecordingsAria')}
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
              aria-label={t('examPrepFinal.solve.askChatbotAria')}
            >
              <MessageSquareText style={iconSize} />
            </button>
          </div>

          <div className="flex items-center" style={{ gap: '1.185cqw' }}>
            {/* 힌트(전구) — 객관식/빈칸채우기에서 오답 1개 제거. 선택지 없는 유형(매칭/서술형)은 미노출.
                사용 후에도 숨기지 않고 연하게(opacity-40) + 비활성. hover 시 효과/숙련도 패널티 안내 툴팁. */}
            {!isLocked && !recallGated && onHint && choices.length > 0 && (
              <div className="group/hint relative flex items-center">
                <button
                  type="button"
                  onClick={eliminatedIdx == null ? onHint : undefined}
                  aria-disabled={eliminatedIdx != null}
                  className={cn(
                    'flex items-center justify-center text-amber-400 transition-transform',
                    eliminatedIdx == null ? 'hover:scale-110' : 'cursor-default opacity-40',
                  )}
                  style={{ width: '2.844cqw', height: '2.844cqw' }}
                  aria-label={t('examPrepFinal.solve.hint')}
                >
                  <Lightbulb style={{ width: '2.015cqw', height: '2.015cqw' }} className="fill-amber-200" />
                </button>
                <div
                  role="tooltip"
                  className="pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 whitespace-normal break-keep bg-gray-900 text-center font-medium text-white opacity-0 transition-opacity duration-150 group-hover/hint:opacity-100 dark:bg-gray-700"
                  style={{ bottom: 'calc(100% + 0.4cqw)', width: '16cqw', fontSize: '1cqw', lineHeight: 1.45, padding: '0.5cqw 0.7cqw', borderRadius: '0.4cqw' }}
                >
                  {t('examPrepFinal.solve.hintTooltip')}
                </div>
              </div>
            )}
            {/* 제출 (채점 후엔 숨김 — 서술형은 제출=모범답안 노출. Active Recall 게이트 중에도 숨김) */}
            {!isLocked && !recallGated && (
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
                {isGrading ? t('examPrepFinal.solve.grading') : t('examPrepFinal.submit')}
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
                {showExplanation ? t('examPrepFinal.solve.hideExplanation') : t('examPrepFinal.solve.showExplanation')}
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

/**
 * Active Recall 게이트 박스 — skilled 숙련도 대상 유형에서 선지(칩) 자리에 노출.
 * 전구 아이콘(연보라 원) + 안내문 + 구분선 + '선지 보기' 버튼. 클릭 시 onReveal → 선지 공개.
 * 치수는 SolveCanvas 기준 cqw — 다른 폼과 동일 비례 스케일. 다크모드 대응.
 */
function ActiveRecallGate({
  onReveal,
  t,
}: {
  onReveal: () => void
  t: ReturnType<typeof useTranslations>
}) {
  return (
    <div
      className="flex w-full flex-col items-center justify-center rounded-[0.984cqw] border border-dashed border-violet-300 bg-violet-50/60 dark:border-violet-500/40 dark:bg-violet-500/10"
      style={{ padding: '3.210cqw 1.730cqw', gap: '1.234cqw' }}
    >
      {/* 전구 — 연보라 원 안 */}
      <span
        className="flex items-center justify-center rounded-full bg-violet-100 text-violet-500 dark:bg-violet-500/20 dark:text-violet-300"
        style={{ width: '4.444cqw', height: '4.444cqw' }}
      >
        <Lightbulb style={{ width: '2.222cqw', height: '2.222cqw' }} />
      </span>
      {/* 안내문 */}
      <p
        className="text-center font-semibold break-keep"
        style={{ fontSize: '1.481cqw', color: 'var(--color-exam-canvas-fg)' }}
      >
        {t('examPrepFinal.solve.activeRecallPrompt')}
      </p>
      {/* 구분선 */}
      <div
        className="border-t border-violet-200/70 dark:border-violet-500/20"
        style={{ width: '60%', marginTop: '0.494cqw', marginBottom: '0.494cqw' }}
      />
      {/* 선지 보기 버튼 */}
      <button
        type="button"
        onClick={onReveal}
        className="flex items-center justify-center bg-[#7c7aec] font-semibold text-white transition-colors hover:brightness-95"
        style={{
          minWidth: '12cqw',
          height: '3.704cqw',
          borderRadius: '0.747cqw',
          padding: '0 2.222cqw',
          fontSize: '1.233cqw',
        }}
      >
        {t('examPrepFinal.solve.activeRecallShowOptions')}
      </button>
    </div>
  )
}
