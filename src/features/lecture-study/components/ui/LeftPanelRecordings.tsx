/**
 * @file LeftPanelRecordings.tsx
 * @description 좌측 패널 - 녹음본 탭 (Accordion 기반 청크 표시)
 * @module features/lecture-study/components/ui
 * @dependencies lucide-react, shared/components/ui/Accordion
 */

import { Mic } from 'lucide-react'
import { useTranslations } from 'next-intl'
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
      <div className="flex flex-col gap-3">
        {recordings.map((rec, idx) => (
          <div key={rec.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Mic className="h-4 w-4 text-emerald-500" />
              <span>{t('lectureStudy.leftPanel.segmentFallback', { n: idx + 1 })}</span>
              <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
                {rec.status}
              </span>
            </div>
            {rec.summary ? (
              <p className="mt-2 text-xs text-gray-600 leading-relaxed">{rec.summary}</p>
            ) : (
              <p className="mt-2 text-xs text-gray-400 italic">
                {t('lectureStudy.leftPanel.recordingSummaryNull')}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
