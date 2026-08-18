/**
 * @file SummarySection.tsx
 * @description 요약 섹션 1개 렌더링 — 제목·출처 뱃지·불릿·표·쉬운설명
 * @module features/lecture-study/components/ui
 * @dependencies next-intl, SourceButton, EasyExplanation
 */

'use client'

import { useTranslations } from 'next-intl'
import { SourceButton } from './SourceButton'
import { EasyExplanation } from './EasyExplanation'
import { MathText } from '@/shared/components/math/MathText'
import type { ContentSummarySection } from '../../types'

interface SummarySectionProps {
  section: ContentSummarySection
  sectionKey: string
  /** DOM id(aria-describedby)용 키 — 공백/한글 없는 인덱스 기반 값 (Task A 회귀 수정) */
  idPrefix: string
  index: number
  lectureId: string
  easyExplanation?: string
  timeSharePct?: number
  onMaterialClick: (key: string, pages: number[]) => void
  onRecordingClick: (key: string, chunks: number[], quotes?: { chunk: number; text: string }[]) => void
}

export function SummarySection({
  section,
  sectionKey,
  idPrefix,
  index,
  lectureId,
  easyExplanation,
  timeSharePct,
  onMaterialClick,
  onRecordingClick,
}: SummarySectionProps) {
  const t = useTranslations('lectureStudy')
  const hasSourcePages = section.source_pages.length > 0
  const hasSourceChunks = section.source_chunks.length > 0
  const roundedPercent = timeSharePct !== undefined ? Math.round(timeSharePct) : null
  const percent = roundedPercent !== null && roundedPercent >= 1 ? roundedPercent : null

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-base font-semibold text-gray-900 dark:text-gray-50">
          <MathText text={section.title} />
        </h4>

        {percent !== null && (
          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
            {t('summary.timeShareBadge', { percent })}
          </span>
        )}

        <SourceButton
          label={t('summary.sourceButtonMaterials')}
          tooltipId={`material-source-${idPrefix}`}
          tooltipContent={
            hasSourcePages
              ? t('summary.sourceTooltipPages', { pages: section.source_pages.join(', ') })
              : t('summary.sourceEmptyTooltip')
          }
          disabled={!hasSourcePages}
          disabledClick={false}
          onClick={() => onMaterialClick(sectionKey, section.source_pages)}
        />

        <SourceButton
          label={t('summary.sourceButtonRecordings')}
          tooltipId={`recording-source-${idPrefix}`}
          tooltipContent={
            hasSourceChunks
              ? t('summary.sourceTooltipChunks', { chunks: section.source_chunks.join(', ') })
              : t('summary.sourceEmptyTooltip')
          }
          disabled={!hasSourceChunks}
          disabledClick={false}
          onClick={() => onRecordingClick(sectionKey, section.source_chunks, section.source_quotes)}
        />
      </div>

      <ul className="list-disc space-y-1 pl-5 text-gray-700 dark:text-gray-300">
        {section.bullets.map((bullet, bIdx) => (
          <li key={`${sectionKey}-bullet-${bIdx}`}>
            <MathText text={bullet} />
          </li>
        ))}
      </ul>

      {(section.tables ?? []).map((table, tIdx) => (
        <div
          key={`${sectionKey}-table-${tIdx}`}
          className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
        >
          {table.title && (
            <div className="border-b border-gray-100 dark:border-gray-700 px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
              {table.title}
            </div>
          )}
          <table className="w-full text-left text-xs text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-700 text-[11px] uppercase text-gray-400 dark:text-gray-500">
              <tr>
                {table.headers.map((header) => (
                  <th key={header} className="px-3 py-2 font-semibold">
                    <MathText text={header} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, rIdx) => (
                <tr key={`row-${index}-${tIdx}-${rIdx}`} className="border-t border-gray-100 dark:border-gray-700">
                  {row.map((cell, cIdx) => (
                    <td key={`cell-${index}-${tIdx}-${rIdx}-${cIdx}`} className="px-3 py-2">
                      <MathText text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {easyExplanation && (
        <EasyExplanation text={easyExplanation} lectureId={lectureId} sectionKey={sectionKey} />
      )}
    </section>
  )
}
