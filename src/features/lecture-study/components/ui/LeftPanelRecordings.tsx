/**
 * @file LeftPanelRecordings.tsx
 * @description 좌측 패널 - 녹음본 탭 (핵심 내용 + Accordion 기반 녹음 목록)
 * @module features/lecture-study/components/ui
 * @dependencies lucide-react, shared/components/ui/Accordion
 */

import { Mic, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/shared/components/ui'
import type { Recording } from '../../types'

interface LeftPanelRecordingsProps {
  recordings: Recording[]
  essenceOneLine?: string | null
  essence7Words?: string | null
}

function StatusBadge({ status, t }: { status: string; t: ReturnType<typeof useTranslations> }) {
  const isCompleted = status === 'completed'
  return (
    <span
      className={`ml-2 rounded-full px-2 py-0.5 text-[10px] ${
        isCompleted
          ? 'bg-emerald-50 text-emerald-600'
          : 'bg-amber-50 text-amber-600'
      }`}
    >
      {isCompleted
        ? t('lectureStudy.leftPanel.statusCompleted')
        : t('lectureStudy.leftPanel.statusProcessing')}
    </span>
  )
}

export function LeftPanelRecordings({ recordings, essenceOneLine, essence7Words }: LeftPanelRecordingsProps) {
  const t = useTranslations()

  if (recordings.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-400">
        <Mic className="h-10 w-10" />
        <p className="text-sm">{t('lectureStudy.leftPanel.recordingsEmpty')}</p>
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

      <Accordion type="multiple" defaultValue={recordings.map(r => r.id)}>
        {recordings.map((rec, idx) => (
          <AccordionItem key={rec.id} value={rec.id} className="rounded-lg border border-gray-200 bg-white mb-3 last:mb-0">
            <AccordionTrigger className="px-4 py-3 text-sm hover:no-underline">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Mic className="h-4 w-4 text-emerald-500" />
                <span>{t('lectureStudy.leftPanel.segmentFallback', { n: idx + 1 })}</span>
                <StatusBadge status={rec.status} t={t} />
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4">
              {rec.summary ? (
                <p className="text-xs text-gray-600 leading-relaxed">{rec.summary}</p>
              ) : (
                <p className="text-xs text-gray-400 italic">
                  {t('lectureStudy.leftPanel.recordingSummaryNull')}
                </p>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
