/**
 * @file PayloadQuestionPanel.tsx
 * @description payload 유형(매칭/빈칸/복수/서술형) 풀이 패널 + question_format 디스패처.
 *   레거시 단일 4지선다는 SolveQuestionPanel 이 담당하고, 본 패널은 question_format 이 있는
 *   신규 유형만 렌더(컨테이너에서 분기). 응답 값은 유형별 polymorphic.
 * @module features/exam-prep-final/components/ui
 */

'use client'

import { useState } from 'react'
import { Bookmark, Check, X as XIcon, FileText, Mic, Bot, ChevronLeft, ChevronRight } from 'lucide-react'
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
  canFinish: boolean
  onFinish: () => void
  mobileBottomSpacer?: boolean
}

export function PayloadQuestionPanel({
  question,
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
  canFinish,
  onFinish,
  mobileBottomSpacer = false,
}: PayloadQuestionPanelProps) {
  const t = useTranslations()
  const { locale } = useI18n()
  const isEn = locale === 'en'

  const qf = question.question_format ?? null
  const isEssay = qf === ESSAY_FORMAT
  const payload = (question.payload ?? {}) as Record<string, unknown>
  const stem = (isEn && question.stem_eng) ? question.stem_eng : question.stem
  const choices = (payload.choices as string[] | undefined) ?? []
  const result = buildResult(question, graded)
  const isLocked = graded !== null
  const complete = isPayloadResponseComplete(qf, payload, response)

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
          />
        )
      case 'category_fill_blank5_single':
        return (
          <FillBlank5SingleForm
            questionText={stem}
            choices={choices}
            value={(response as number | null) ?? null}
            onChange={(v) => onResponseChange(v)}
            disabled={isLocked}
            result={result}
          />
        )
      case 'category_fill_blank7_multi':
        return (
          <FillBlank7MultiForm
            questionText={stem}
            choices={choices}
            value={(response as (number | null)[] | null) ?? null}
            onChange={(v) => onResponseChange(v)}
            disabled={isLocked}
            result={result}
          />
        )
      case 'description_mcq6_multi':
        return (
          <Mcq6MultiForm
            questionText={stem}
            choices={choices}
            value={(response as number[] | null) ?? null}
            onChange={(v) => onResponseChange(v)}
            disabled={isLocked}
            result={result}
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
            choices={choices}
            value={(response as number | null) ?? null}
            onChange={(v) => onResponseChange(v)}
            disabled={isLocked}
            result={result}
          />
        )
    }
  }

  const sr = (question.source_ref ?? null) as
    | { source_pages?: number[]; source_chunks?: number[] }
    | null
  const hasMaterial = (sr?.source_pages ?? []).some((p) => p > 0)
  const hasRecording = (sr?.source_chunks ?? []).some((c) => c > 0)

  return (
    <div className="flex h-full flex-1 flex-col overflow-y-auto bg-[#F5F7F8] dark:bg-gray-950">
      <div className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-8 py-8">
        {/* 정오답 배지 (서술형은 채점 없음 → 제출 완료 배지) */}
        <div className="mb-4 flex h-9 items-center gap-2">
          {graded && !isEssay && (
            graded.is_correct ? (
              <span className="flex items-center gap-1 rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-700">
                <Check className="h-4 w-4" /> 정답
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-sm font-semibold text-rose-700">
                <XIcon className="h-4 w-4" /> 오답
              </span>
            )
          )}
          {graded && isEssay && (
            <span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-700">
              제출 완료 · 모범답안 확인
            </span>
          )}
        </div>

        {/* 유형별 폼 본문 (폼이 stem + body 렌더) */}
        {renderForm()}

        {/* 하단 액션 */}
        <div className="mt-8 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-400">
            <button
              type="button"
              onClick={onBookmarkToggle}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
                isBookmarked ? 'text-blue-500 hover:text-blue-600' : 'hover:text-gray-700',
              )}
              aria-label={isBookmarked ? '즐겨찾기 해제' : '즐겨찾기 추가'}
            >
              <Bookmark className={cn('h-4 w-4', isBookmarked && 'fill-current')} />
            </button>
            {hasMaterial && (
              <button
                type="button"
                onClick={() => onSourceClick?.('materials')}
                disabled={!onSourceClick}
                className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="강의자료 출처 보기"
              >
                <FileText className="h-4 w-4" />
              </button>
            )}
            {hasRecording && (
              <button
                type="button"
                onClick={() => onSourceClick?.('recordings')}
                disabled={!onSourceClick}
                className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="녹음본 출처 보기"
              >
                <Mic className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onAskChatbot}
              disabled={!onAskChatbot}
              className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="AI 챗봇에게 물어보기"
            >
              <Bot className="h-4 w-4" />
            </button>
          </div>

          {/* 제출 (채점 후엔 비활성 — 서술형은 제출=모범답안 노출) */}
          {!isLocked && (
            <button
              type="button"
              onClick={onSubmit}
              disabled={!complete || isGrading}
              className="flex h-10 min-w-[104px] items-center justify-center rounded-lg bg-violet-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-violet-600 disabled:opacity-40"
            >
              {isGrading ? '채점 중...' : t('examPrepFinal.submit')}
            </button>
          )}
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
            <button
              type="button"
              onClick={onNext}
              disabled={!hasNext}
              aria-label="next"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            {canFinish && (
              <button
                type="button"
                onClick={onFinish}
                aria-label={t('examPrepFinal.endQuizAria')}
                className="flex h-9 items-center justify-center rounded-lg bg-violet-600 px-4 text-sm font-bold text-white transition-colors hover:bg-violet-700"
              >
                {t('examPrepFinal.endQuiz')}
              </button>
            )}
          </div>
        </div>
        {mobileBottomSpacer && <div className="h-[60dvh] shrink-0 md:hidden" aria-hidden />}
      </div>
    </div>
  )
}
