"use client"

import type { ExamPrepSummary } from '../../types'
import { ExamPrepLoadingState } from './ExamPrepLoadingState'

interface ExamPrepSummaryPanelProps {
  summary: ExamPrepSummary | null
  isLoading: boolean
  emptyText: string
  loadingMessage: string
}

export function ExamPrepSummaryPanel({
  summary,
  isLoading,
  emptyText,
  loadingMessage,
}: ExamPrepSummaryPanelProps) {
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
        <h3 className="text-lg font-semibold text-gray-900">요약</h3>
        <p className="mt-2 leading-relaxed text-gray-700">{summary.overview}</p>
      </section>

      {summary.sections.map(section => (
        <section key={section.title} className="space-y-3">
          <h4 className="text-base font-semibold text-gray-900">{section.title}</h4>
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
          <h4 className="text-base font-semibold text-gray-900">최근 쟁점</h4>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-700">
            {summary.recent_issues.map((issue, index) => (
              <li key={`issue-${index}`}>{issue}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {summary.exam_points && summary.exam_points.length > 0 ? (
        <section>
          <h4 className="text-base font-semibold text-gray-900">요점 정리(시험 대비)</h4>
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

