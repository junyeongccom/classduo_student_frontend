"use client"

import type { ExamPrepGlossaryTerm } from '../../types'
import { ExamPrepLoadingState } from './ExamPrepLoadingState'

interface ExamPrepGlossaryPanelProps {
  terms: ExamPrepGlossaryTerm[]
  isLoading: boolean
  emptyText: string
  loadingMessage: string
}

export function ExamPrepGlossaryPanel({
  terms,
  isLoading,
  emptyText,
  loadingMessage,
}: ExamPrepGlossaryPanelProps) {
  if (isLoading) {
    return <ExamPrepLoadingState message={loadingMessage} />
  }

  if (!terms.length) {
    return (
      <div className="flex h-full items-center justify-center px-6 py-10 text-sm text-gray-400">
        {emptyText}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto px-6 py-6 text-sm text-gray-700">
      {terms.map(term => (
        <div key={term.term_id} className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-semibold text-gray-900">{term.term}</h4>
            {term.source_page ? (
              <span className="text-xs text-gray-400">p.{term.source_page}</span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-gray-700">{term.definition}</p>
          {term.example ? (
            <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
              예시: {term.example}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  )
}

