/**
 * @file SocraticTopicPicker.tsx
 * @description 소크라 문답 주제 선택 카드 목록 (ChatComposer topOverlay로 표시)
 * @module features/ai-tutor
 * @dependencies 없음 (pure UI)
 */
'use client'

import type { SocraticTopic } from '../../types'

interface Props { topics: SocraticTopic[]; onSelect: (t: SocraticTopic) => void }

export default function SocraticTopicPicker({ topics, onSelect }: Props) {
  if (topics.length === 0) {
    return <div className="mb-2 rounded-xl border bg-white p-3 text-sm text-gray-500">이 회차에는 아직 소크라 문답 주제가 없어요.</div>
  }
  return (
    <div className="mb-2 grid gap-2 sm:grid-cols-2">
      {topics.map((t) => (
        <button key={t.id} type="button" onClick={() => onSelect(t)}
          className="rounded-xl border bg-white p-3 text-left transition hover:border-indigo-400 hover:shadow-sm">
          <div className="text-sm font-semibold">{t.title}</div>
          <div className="mt-1 line-clamp-2 text-xs text-gray-500">{t.description}</div>
        </button>
      ))}
    </div>
  )
}
