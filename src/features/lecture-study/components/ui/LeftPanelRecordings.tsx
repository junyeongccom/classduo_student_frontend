/**
 * @file LeftPanelRecordings.tsx
 * @description 좌측 패널 - 녹음본 탭 (핵심 내용 + 청크 단위 Accordion)
 * @module features/lecture-study/components/ui
 * @dependencies lucide-react, shared/components/ui/Accordion
 */

import { Mic, Sparkles, Clock } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/shared/components/ui'
import type { Recording, RecordingChunkSummary } from '../../types'

interface LeftPanelRecordingsProps {
  recordings: Recording[]
  essenceOneLine?: string | null
  essence7Words?: string | null
}

function formatTime(seconds: number | null): string {
  if (seconds == null) return '--:--'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function ChunkAccordionItem({ chunk, valueKey }: { chunk: RecordingChunkSummary; valueKey: string }) {
  const hasTime = chunk.start_time != null || chunk.end_time != null
  const title = chunk.title || `구간 ${chunk.chunk_index + 1}`

  return (
    <AccordionItem value={valueKey} className="rounded-lg border border-emerald-200 bg-white mb-2 last:mb-0">
      <AccordionTrigger className="px-4 py-3 text-sm hover:no-underline">
        <div className="flex items-start gap-2.5 text-left">
          <Mic className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-gray-800 line-clamp-1">{title}</span>
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
          <p className="text-xs leading-relaxed text-gray-600">{chunk.content}</p>
        ) : (
          <p className="text-xs text-gray-400 italic">요약 내용 없음</p>
        )}
      </AccordionContent>
    </AccordionItem>
  )
}

export function LeftPanelRecordings({ recordings, essenceOneLine, essence7Words }: LeftPanelRecordingsProps) {
  const t = useTranslations()

  // 모든 청크를 flat하게 수집 (녹음본 구분 포함)
  const allChunks = recordings.flatMap(rec =>
    rec.chunk_summaries.map(chunk => ({ ...chunk, recordingId: rec.id }))
  )
  const hasMultipleRecordings = recordings.length > 1
  const hasAnyChunks = allChunks.length > 0

  if (recordings.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-400">
        <Mic className="h-10 w-10" />
        <p className="text-sm">{t('lectureStudy.leftPanel.recordingsEmpty')}</p>
      </div>
    )
  }

  if (!hasAnyChunks) {
    const hasProcessing = recordings.some(r => r.status !== 'completed')
    return (
      <div className="h-full overflow-y-auto p-4">
        {/* Essence section */}
        {(essenceOneLine || essence7Words) && (
          <div className="mb-4 rounded-xl border border-violet-100 bg-violet-50/50 p-4">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-violet-700">
              <Sparkles className="h-3.5 w-3.5" />
              {t('lectureStudy.leftPanel.essenceTitle')}
            </div>
            {essence7Words && (
              <p className="mb-1 text-sm font-medium text-gray-800">{essence7Words}</p>
            )}
            {essenceOneLine && (
              <p className="text-xs leading-relaxed text-gray-600">{essenceOneLine}</p>
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
        <div className="mb-4 rounded-xl border border-violet-100 bg-violet-50/50 p-4">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-violet-700">
            <Sparkles className="h-3.5 w-3.5" />
            {t('lectureStudy.leftPanel.essenceTitle')}
          </div>
          {essence7Words && (
            <p className="mb-1 text-sm font-medium text-gray-800">{essence7Words}</p>
          )}
          {essenceOneLine && (
            <p className="text-xs leading-relaxed text-gray-600">{essenceOneLine}</p>
          )}
        </div>
      )}

      {hasMultipleRecordings ? (
        // 녹음본이 여러 개: 녹음본별로 라벨 구분
        recordings.map((rec, recIdx) => (
          <div key={rec.id} className={recIdx > 0 ? 'mt-5' : ''}>
            <div className="mb-2 flex items-center gap-2">
              <Mic className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-xs font-semibold text-gray-500">
                {t('lectureStudy.leftPanel.segmentFallback', { n: recIdx + 1 })}
              </span>
              <div className="flex-1 border-t border-gray-200" />
            </div>
            {rec.chunk_summaries.length > 0 ? (
              <Accordion type="multiple" defaultValue={rec.chunk_summaries.map((_, i) => `${rec.id}-${i}`)}>
                {rec.chunk_summaries.map((chunk, i) => (
                  <ChunkAccordionItem key={i} chunk={chunk} valueKey={`${rec.id}-${i}`} />
                ))}
              </Accordion>
            ) : (
              <p className="py-2 text-xs text-gray-400 italic">
                {t('lectureStudy.leftPanel.recordingSummaryNull')}
              </p>
            )}
          </div>
        ))
      ) : (
        // 녹음본 1개: 청크만 나열
        <Accordion type="multiple" defaultValue={allChunks.map((_, i) => `chunk-${i}`)}>
          {allChunks.map((chunk, i) => (
            <ChunkAccordionItem key={i} chunk={chunk} valueKey={`chunk-${i}`} />
          ))}
        </Accordion>
      )}
    </div>
  )
}
