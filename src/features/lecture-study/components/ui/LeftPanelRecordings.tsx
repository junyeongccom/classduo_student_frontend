/**
 * @file LeftPanelRecordings.tsx
 * @description 좌측 패널 - 녹음본 탭 (핵심 내용 + 청크 단위 Accordion + 출처 이동)
 * @module features/lecture-study/components/ui
 * @dependencies lucide-react, shared/components/ui/Accordion
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Mic, Sparkles, Clock } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/shared/components/ui'
import type { Recording, RecordingChunkSummary } from '../../types'

interface LeftPanelRecordingsProps {
  recordings: Recording[]
  essenceOneLine?: string | null
  essence7Words?: string | null
  /** 출처 클릭 시 이동할 청크 합산 인덱스 (0-indexed) */
  targetChunkIndex?: number | null
  /** targetChunkIndex 소비 완료 콜백 */
  onTargetConsumed?: () => void
}

function formatTime(seconds: number | null): string {
  if (seconds == null) return '--:--'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** 합산 인덱스를 개별 recording + chunk_index로 역매핑 (Task 783) */
function resolveChunkTarget(
  recordings: Recording[],
  globalIndex: number,
  hasMultiple: boolean,
): { recordingIdx: number; chunkIdx: number; valueKey: string } | null {
  let offset = 0
  for (let rIdx = 0; rIdx < recordings.length; rIdx++) {
    const chunks = recordings[rIdx].chunk_summaries
    if (globalIndex < offset + chunks.length) {
      const localIdx = globalIndex - offset
      const valueKey = hasMultiple
        ? `${recordings[rIdx].id}-${localIdx}`
        : `chunk-${globalIndex}`
      return { recordingIdx: rIdx, chunkIdx: localIdx, valueKey }
    }
    offset += chunks.length
  }
  return null
}

function ChunkAccordionItem({
  chunk,
  valueKey,
  chunkRef,
}: {
  chunk: RecordingChunkSummary
  valueKey: string
  chunkRef?: React.Ref<HTMLDivElement>
}) {
  const t = useTranslations()
  const hasTime = chunk.start_time != null || chunk.end_time != null
  const title = chunk.title || t('lectureStudy.leftPanel.segmentFallback', { n: chunk.chunk_index + 1 })

  return (
    <AccordionItem
      ref={chunkRef as React.Ref<HTMLDivElement>}
      value={valueKey}
      className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-gray-900 mb-2 last:mb-0"
    >
      <AccordionTrigger className="px-4 py-3 text-sm hover:no-underline">
        <div className="flex items-start gap-2.5 text-left">
          <Mic className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-1">{title}</span>
            {hasTime && (
              <span className="flex items-center gap-1 text-[10px] text-gray-400">
                <Clock className="h-3 w-3" />
                {formatTime(chunk.start_time)} – {formatTime(chunk.end_time)}
              </span>
            )}
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-3">
        {chunk.content ? (
          <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">{chunk.content}</p>
        ) : (
          <p className="text-xs text-gray-400 dark:text-gray-500 italic">{t('lectureStudy.leftPanel.recordingSummaryNull')}</p>
        )}
      </AccordionContent>
    </AccordionItem>
  )
}

export function LeftPanelRecordings({
  recordings,
  essenceOneLine,
  essence7Words,
  targetChunkIndex,
  onTargetConsumed,
}: LeftPanelRecordingsProps) {
  const t = useTranslations()

  // controlled accordion state
  const [openItems, setOpenItems] = useState<string[]>([])
  // 타겟 청크 DOM ref
  const targetChunkRef = useRef<HTMLDivElement>(null)

  const allChunks = useMemo(
    () => recordings.flatMap((rec) => rec.chunk_summaries.map((chunk) => ({ ...chunk, recordingId: rec.id }))),
    [recordings],
  )
  const hasMultipleRecordings = recordings.length > 1
  const hasAnyChunks = allChunks.length > 0

  // ─── targetChunkIndex 소비 (Task 783) ───
  useEffect(() => {
    if (targetChunkIndex == null || !hasAnyChunks) return

    const target = resolveChunkTarget(recordings, targetChunkIndex, hasMultipleRecordings)
    if (!target) {
      onTargetConsumed?.()
      return
    }

    // Accordion 열기
    setOpenItems((prev) => {
      if (prev.includes(target.valueKey)) return prev
      return [...prev, target.valueKey]
    })

    // DOM 렌더링 대기 후 스크롤 (Accordion 확장 트랜지션 완료 대기)
    requestAnimationFrame(() => {
      setTimeout(() => {
        targetChunkRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        onTargetConsumed?.()
      }, 300)
    })
  }, [targetChunkIndex, recordings, hasAnyChunks, hasMultipleRecordings, onTargetConsumed])

  // targetChunkIndex에 해당하는 valueKey
  const targetValueKey = targetChunkIndex != null
    ? resolveChunkTarget(recordings, targetChunkIndex, hasMultipleRecordings)?.valueKey
    : null

  if (recordings.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-400">
        <Mic className="h-10 w-10" />
        <p className="text-sm">{t('lectureStudy.leftPanel.recordingsEmpty')}</p>
      </div>
    )
  }

  if (!hasAnyChunks) {
    const hasProcessing = recordings.some((r) => r.status !== 'completed')
    return (
      <div className="h-full overflow-y-auto p-4">
        {(essenceOneLine || essence7Words) && (
          <div className="mb-4 rounded-xl border border-violet-100 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/30 p-4">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-violet-700">
              <Sparkles className="h-3.5 w-3.5" />
              {t('lectureStudy.leftPanel.essenceTitle')}
            </div>
            {essence7Words && (
              <p className="mb-1 text-sm font-medium text-gray-800 dark:text-gray-200">{essence7Words}</p>
            )}
            {essenceOneLine && (
              <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">{essenceOneLine}</p>
            )}
          </div>
        )}
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-gray-400">
          <Mic className="h-8 w-8" />
          <p className="text-xs">
            {hasProcessing
              ? t('lectureStudy.leftPanel.statusProcessing')
              : t('lectureStudy.leftPanel.recordingSummaryNull')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      {/* Essence section */}
      {(essenceOneLine || essence7Words) && (
        <div className="mb-4 rounded-xl border border-violet-100 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/30 p-4">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-violet-700">
            <Sparkles className="h-3.5 w-3.5" />
            {t('lectureStudy.leftPanel.essenceTitle')}
          </div>
          {essence7Words && (
            <p className="mb-1 text-sm font-medium text-gray-800 dark:text-gray-200">{essence7Words}</p>
          )}
          {essenceOneLine && (
            <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">{essenceOneLine}</p>
          )}
        </div>
      )}

      {hasMultipleRecordings ? (
        recordings.map((rec, recIdx) => {
          let globalOffset = 0
          for (let i = 0; i < recIdx; i++) {
            globalOffset += recordings[i].chunk_summaries.length
          }

          return (
            <div key={rec.id} className={recIdx > 0 ? 'mt-5' : ''}>
              <div className="mb-2 flex items-center gap-2">
                <Mic className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs font-semibold text-gray-500">
                  {t('lectureStudy.leftPanel.segmentFallback', { n: recIdx + 1 })}
                </span>
                <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
              </div>
              {rec.chunk_summaries.length > 0 ? (
                <Accordion
                  type="multiple"
                  value={openItems}
                  onValueChange={setOpenItems}
                >
                  {rec.chunk_summaries.map((chunk, i) => {
                    const vk = `${rec.id}-${i}`
                    const isTarget = vk === targetValueKey
                    return (
                      <ChunkAccordionItem
                        key={i}
                        chunk={chunk}
                        valueKey={vk}
                        chunkRef={isTarget ? targetChunkRef : undefined}
                      />
                    )
                  })}
                </Accordion>
              ) : (
                <p className="py-2 text-xs text-gray-400 italic">
                  {t('lectureStudy.leftPanel.recordingSummaryNull')}
                </p>
              )}
            </div>
          )
        })
      ) : (
        <Accordion
          type="multiple"
          value={openItems}
          onValueChange={setOpenItems}
        >
          {allChunks.map((chunk, i) => {
            const vk = `chunk-${i}`
            const isTarget = vk === targetValueKey
            return (
              <ChunkAccordionItem
                key={i}
                chunk={chunk}
                valueKey={vk}
                chunkRef={isTarget ? targetChunkRef : undefined}
              />
            )
          })}
        </Accordion>
      )}
    </div>
  )
}
