/**
 * @file LeftPanelRecordings.tsx
 * @description 좌측 패널 - 녹음본 탭 (Accordion 기반 청크 표시)
 * @module features/lecture-study/components/ui
 * @dependencies lucide-react, shared/components/ui/Accordion
 */

import { Mic } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/shared/components/ui'
import type { Recording } from '../../types'

interface LeftPanelRecordingsProps {
  recordings: Recording[]
}

export function LeftPanelRecordings({ recordings }: LeftPanelRecordingsProps) {
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
      <Accordion type="multiple" defaultValue={recordings.map(r => r.id)}>
        {recordings.map((rec, idx) => (
          <AccordionItem key={rec.id} value={rec.id} className="rounded-lg border border-gray-200 bg-white mb-3 last:mb-0">
            <AccordionTrigger className="px-4 py-3 text-sm hover:no-underline">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Mic className="h-4 w-4 text-emerald-500" />
                <span>{t('lectureStudy.leftPanel.segmentFallback', { n: idx + 1 })}</span>
                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
                  {rec.status}
                </span>
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
