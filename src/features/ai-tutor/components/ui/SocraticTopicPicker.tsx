/**
 * @file SocraticTopicPicker.tsx
 * @description 소크라 문답 주제 선택 카드 목록 (ChatComposer topOverlay로 표시)
 * @module features/ai-tutor
 * @dependencies 없음 (pure UI)
 */
'use client'

import { useTranslations } from 'next-intl'
import type { SocraticTopic } from '../../types'

interface Props { topics: SocraticTopic[]; onSelect: (t: SocraticTopic) => void }

export default function SocraticTopicPicker({ topics, onSelect }: Props) {
  const t = useTranslations('aiTutorChat')
  if (topics.length === 0) {
    return <div className="mb-2 rounded-xl border bg-white p-3 text-sm text-gray-500">{t('socraticNoTopics')}</div>
  }
  return (
    <div className="mb-2 grid gap-2 sm:grid-cols-2">
      {topics.map((topic) => (
        <button key={topic.id} type="button" onClick={() => onSelect(topic)}
          className="relative rounded-xl border bg-white p-3 text-left transition hover:border-indigo-400 hover:shadow-sm">
          {topic.mastered && (
            <span className="absolute right-2 top-2 inline-flex items-center gap-0.5 rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600">
              <span aria-hidden="true">✓</span>
              {t('socraticMasteredBadge')}
            </span>
          )}
          <div className={`text-sm font-semibold ${topic.mastered ? 'pr-16' : ''}`}>{topic.title}</div>
          <div className="mt-1 line-clamp-2 text-xs text-gray-500">{topic.description}</div>
        </button>
      ))}
    </div>
  )
}
