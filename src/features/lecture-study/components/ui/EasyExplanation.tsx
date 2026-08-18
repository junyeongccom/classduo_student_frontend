/**
 * @file EasyExplanation.tsx
 * @description 요약 섹션의 쉬운 설명 접힘 박스 (기본 닫힘) — 펼치면 4덩어리 구조화 카드로 렌더
 * @module features/lecture-study/components/ui
 * @dependencies next-intl, lucide-react, domain/parseEasyExplanation
 */

'use client'

import { useId, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown, Lightbulb, Link2, PenLine, Star, type LucideIcon } from 'lucide-react'
import { summaryTabAnalytics } from '@/shared/lib/analytics'
import { MathText } from '@/shared/components/math/MathText'
import { parseEasyExplanation, type EasyBlockKind } from '../../domain/parseEasyExplanation'

/** 덩어리 종류별 아이콘·색. plain(4덩어리 초과분)은 라벨 없이 평문 카드로 뿌린다. */
const BLOCK_STYLES: Record<
  Exclude<EasyBlockKind, 'plain'>,
  { Icon: LucideIcon; card: string; accent: string }
> = {
  summary: {
    Icon: Lightbulb,
    card: 'border-l-4 border-amber-400 bg-amber-50 dark:border-amber-500/70 dark:bg-amber-500/10',
    accent: 'text-amber-700 dark:text-amber-300',
  },
  analogy: {
    Icon: Link2,
    card: 'border-l-4 border-sky-400 bg-sky-50 dark:border-sky-500/70 dark:bg-sky-500/10',
    accent: 'text-sky-700 dark:text-sky-300',
  },
  example: {
    Icon: PenLine,
    card: 'border-l-4 border-emerald-400 bg-emerald-50 dark:border-emerald-500/70 dark:bg-emerald-500/10',
    accent: 'text-emerald-700 dark:text-emerald-300',
  },
  why: {
    Icon: Star,
    card: 'border-l-4 border-violet-400 bg-violet-50 dark:border-violet-500/70 dark:bg-violet-500/10',
    accent: 'text-violet-700 dark:text-violet-300',
  },
}

const PLAIN_CARD =
  'border-l-4 border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800/60'

interface EasyExplanationProps {
  text: string
  lectureId: string
  sectionKey: string
}

export function EasyExplanation({ text, lectureId, sectionKey }: EasyExplanationProps) {
  const t = useTranslations('lectureStudy')
  const [isOpen, setIsOpen] = useState(false)
  const panelId = useId()
  const blocks = useMemo(() => parseEasyExplanation(text), [text])

  if (!text) return null

  const handleToggle = () => {
    const next = !isOpen
    setIsOpen(next)
    summaryTabAnalytics.easyExplanationToggle(lectureId, {
      section_key: sectionKey,
      action: next ? 'open' : 'close',
    })
  }

  // 덩어리가 갈리지 않는 원문(구버전 데이터·한 문단짜리)은 기존 평문 렌더를 그대로 쓴다.
  const isStructured = blocks.length > 1

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
      {isOpen &&
        (isStructured ? (
          <div
            id={panelId}
            className="flex flex-col gap-2 border-t border-gray-100 dark:border-gray-700 px-4 py-3"
          >
            {blocks.map((block, index) => {
              const style = block.kind === 'plain' ? null : BLOCK_STYLES[block.kind]
              const Icon = style?.Icon
              return (
                <div
                  key={`easy-${index}`}
                  className={`rounded-lg px-3 py-2.5 ${style ? style.card : PLAIN_CARD}`}
                >
                  {style && Icon && (
                    <div className={`mb-1 flex items-center gap-1.5 text-xs font-semibold ${style.accent}`}>
                      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {t(`summary.easyBlock.${block.kind}`)}
                    </div>
                  )}
                  <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                    <MathText text={block.text} />
                  </p>
                </div>
              )
            })}
          </div>
        ) : (
          <div
            id={panelId}
            className="whitespace-pre-line border-t border-gray-100 dark:border-gray-700 px-4 py-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300"
          >
            {text}
          </div>
        ))}
    </div>
  )
}
