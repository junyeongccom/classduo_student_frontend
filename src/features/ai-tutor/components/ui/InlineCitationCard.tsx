/**
 * @file InlineCitationCard.tsx
 * @description 답변 본문 출처 칩 아래에 인라인 아코디언으로 펼쳐지는 출처 카드 (모바일 전용)
 * @module features/ai-tutor
 * @dependencies next-intl, types(Reference)
 *
 * 마크다운 <p> 내부에 렌더되므로 block 요소(div) 대신 span(+display 유틸)만 사용한다
 * — <p> 안의 <div> 는 React hydration 오류를 낸다.
 */
'use client'

import { useTranslations } from 'next-intl'
import type { Reference } from '../../types'
import { MathText } from '@/shared/components/math/MathText'

/** 추출 마커([강의자료 텍스트]/[시각자료 설명])와 **볼드** 마킹을 벗겨 미리보기용 평문으로.
 *  수학 과목에서 원문을 그대로 뿌리면 카드가 LaTeX 마킹 소스로 보인다 (2026-08-23 실측). */
const cleanSourceText = (raw: string): string =>
  raw
    .replace(/\[강의자료 텍스트\]|\[시각자료 설명\]|---텍스트---|---시각자료 설명---/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*\*/g, '')
    .trim()

interface InlineCitationCardProps {
  reference: Reference
  type: 'recording' | 'material'
  /** 답변 표기 번호 — 녹음본은 1-based(chunk_index+1), 페이지는 실제 페이지 번호 */
  no: number
}

/** 초 → M:SS (Invalid/미정의 값은 빈 문자열) */
const formatTime = (seconds?: number): string => {
  if (seconds === undefined || !Number.isFinite(seconds)) return ''
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function InlineCitationCard({ reference, type, no }: InlineCitationCardProps) {
  const t = useTranslations('aiTutorReference')
  // 녹음 ref 는 요약(summary)이 실려 오는 경우가 있다 (ReferencePanel 과 동일 우선순위)
  const summary = (reference as { summary?: { title?: string; content?: string } }).summary
  const bodyText = (type === 'recording' ? summary?.content : undefined) || reference.content || ''
  const title =
    type === 'recording'
      ? `${t('recordingSegmentLabel')}${no}`
      : reference.metadata.original_filename || t('materialFallback')
  const imageUrl = type === 'material' ? reference.metadata.image_url : undefined

  return (
    <span className="my-2 block max-w-full rounded-xl border border-indigo-200 bg-indigo-50/40 p-3 text-left dark:border-indigo-800 dark:bg-indigo-950/40">
      <span className="flex items-center gap-2">
        <span className="block min-w-0 truncate text-xs font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </span>
        {type === 'recording' && reference.metadata.start_time !== undefined && (
          <span className="shrink-0 text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
            {formatTime(reference.metadata.start_time)} - {formatTime(reference.metadata.end_time)}
          </span>
        )}
        {type === 'material' && reference.metadata.page_number != null && (
          <span className="shrink-0 text-[11px] text-gray-500 dark:text-gray-400">
            {t('page')} {reference.metadata.page_number}
          </span>
        )}
      </span>
      {imageUrl && (
        <img
          src={imageUrl}
          alt={title}
          className="mt-2 block max-h-[30dvh] w-full rounded-lg border border-gray-200 bg-white object-contain dark:border-gray-700"
        />
      )}
      <span className="mt-1.5 block max-h-40 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-gray-700 dark:text-gray-300">
        <MathText text={cleanSourceText(bodyText)} />
      </span>
    </span>
  )
}
