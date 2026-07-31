/**
 * @file EasyExplanation.tsx
 * @description 요약 섹션의 쉬운 설명 접힘 박스 (기본 닫힘)
 * @module features/lecture-study/components/ui
 * @dependencies next-intl, lucide-react
 */

'use client'

import { useId, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown } from 'lucide-react'
import { summaryTabAnalytics } from '@/shared/lib/analytics'

interface EasyExplanationProps {
  text: string
  lectureId: string
  sectionKey: string
}

export function EasyExplanation({ text, lectureId, sectionKey }: EasyExplanationProps) {
  const t = useTranslations('lectureStudy')
  const [isOpen, setIsOpen] = useState(false)
  const panelId = useId()

  if (!text) return null

  const handleToggle = () => {
    const next = !isOpen
    setIsOpen(next)
    summaryTabAnalytics.easyExplanationToggle(lectureId, {
      section_key: sectionKey,
      action: next ? 'open' : 'close',
    })
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700">
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl"
      >
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
        {t('summary.easyExplanationLabel')}
      </button>
      {isOpen && (
        <div
          id={panelId}
          className="whitespace-pre-line border-t border-gray-100 dark:border-gray-700 px-4 py-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300"
        >
          {text}
        </div>
      )}
    </div>
  )
}
