"use client"

import { useRef } from 'react'
import type { ExamPrepSummary } from '../../types'
import { ExamPrepLoadingState } from './ExamPrepLoadingState'

interface ExamPrepSummaryPanelProps {
  summary: ExamPrepSummary | null
  isLoading: boolean
  emptyText: string
  loadingMessage: string
  summaryTitle: string
  recentIssuesTitle: string
  examPointsTitle: string
  sourceButtonLabel: string
  formatSourceTooltip: (pages: number[]) => string
  sourceEmptyTooltip: string
  onJumpToSlide: (pageNumber: number) => void
}

export function ExamPrepSummaryPanel({
  summary,
  isLoading,
  emptyText,
  loadingMessage,
  summaryTitle,
  recentIssuesTitle,
  examPointsTitle,
  sourceButtonLabel,
  formatSourceTooltip,
  sourceEmptyTooltip,
  onJumpToSlide,
}: ExamPrepSummaryPanelProps) {
  const sourceCursorBySection = useRef<Record<string, number>>({})

  if (isLoading) {
    return <ExamPrepLoadingState message={loadingMessage} />
  }

  if (!summary) {
    return (
      <div className="flex h-full items-center justify-center px-6 py-10 text-sm text-gray-400">
        {emptyText}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto px-6 py-6 text-sm text-gray-700">
      <section>
        <h3 className="text-lg font-semibold text-gray-900">{summaryTitle}</h3>
        <p className="mt-2 leading-relaxed text-gray-700">{summary.overview}</p>
      </section>

      {summary.sections.map((section, index) => (
        <section key={section.title} className="space-y-3">
          <div className="flex items-center gap-2">
            <h4 className="text-base font-semibold text-gray-900">{section.title}</h4>
            <div className="group relative inline-flex items-center">
              <button
                type="button"
                aria-describedby={`exam-prep-source-tooltip-${index}`}
                className={[
                  'rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
                  section.source_pages && section.source_pages.length > 0
                    ? 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    : 'border-gray-100 bg-gray-50 text-gray-400 cursor-default',
                ].join(' ')}
                onClick={() => {
                  const rawPages = section.source_pages ?? []
                  const pages = Array.from(new Set(rawPages)).filter(Number.isFinite).sort((a, b) => a - b)
                  if (pages.length === 0) return
                  const key = section.title || String(index)
                  const cursor = sourceCursorBySection.current[key] ?? 0
                  const safeCursor = cursor >= 0 && cursor < pages.length ? cursor : 0
                  const target = pages[safeCursor]
                  sourceCursorBySection.current[key] = (safeCursor + 1) % pages.length
                  onJumpToSlide(target)
                }}
              >
                {sourceButtonLabel}
              </button>
              <div
                id={`exam-prep-source-tooltip-${index}`}
                role="tooltip"
                className="pointer-events-none absolute left-1/2 top-0 z-20 w-max max-w-[240px] -translate-x-1/2 -translate-y-[calc(100%+10px)] opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
              >
                <div className="rounded-md bg-gray-900 px-2 py-1 text-[11px] text-white shadow-sm">
                  {section.source_pages && section.source_pages.length > 0
                    ? formatSourceTooltip(section.source_pages)
                    : sourceEmptyTooltip}
                </div>
                <div className="mx-auto mt-1 h-2 w-2 rotate-45 bg-gray-900" />
              </div>
            </div>
          </div>
          <ul className="list-disc space-y-1 pl-5 text-gray-700">
            {section.bullets.map((bullet, index) => (
              <li key={`${section.title}-bullet-${index}`}>{bullet}</li>
            ))}
          </ul>
          {(section.tables ?? []).map((table, index) => (
            <div
              key={`${section.title}-table-${index}`}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white"
            >
              {table.title ? (
                <div className="border-b border-gray-100 px-4 py-2 text-xs font-semibold text-gray-500">
                  {table.title}
                </div>
              ) : null}
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="bg-gray-50 text-[11px] uppercase text-gray-400">
                  <tr>
                    {table.headers.map(header => (
                      <th key={header} className="px-3 py-2 font-semibold">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, rowIndex) => (
                    <tr key={`${section.title}-row-${rowIndex}`} className="border-t border-gray-100">
                      {row.map((cell, cellIndex) => (
                        <td key={`${section.title}-cell-${rowIndex}-${cellIndex}`} className="px-3 py-2">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </section>
      ))}

      {summary.recent_issues && summary.recent_issues.length > 0 ? (
        <section>
          <h4 className="text-base font-semibold text-gray-900">{recentIssuesTitle}</h4>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-700">
            {summary.recent_issues.map((issue, index) => (
              <li key={`issue-${index}`}>{issue}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {summary.exam_points && summary.exam_points.length > 0 ? (
        <section>
          <h4 className="text-base font-semibold text-gray-900">{examPointsTitle}</h4>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-700">
            {summary.exam_points.map((point, index) => (
              <li key={`point-${index}`}>{point}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

