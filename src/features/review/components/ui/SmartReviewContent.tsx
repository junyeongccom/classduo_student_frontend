'use client'

import { useTranslations } from 'next-intl'
import type { SmartReviewFlashcard } from '@/features/review/mocks/smartReviewMock'

export type SmartReviewTab = 'list' | 'deck' | 'game'

interface SmartReviewContentProps {
  activeTab: SmartReviewTab
  onTabChange: (tab: SmartReviewTab) => void
  flashcards: SmartReviewFlashcard[]
}

export function SmartReviewContent({
  activeTab,
  onTabChange,
  flashcards,
}: SmartReviewContentProps) {
  const t = useTranslations('review.ui')
  const tabItems: Array<{ id: SmartReviewTab; label: string }> = [
    { id: 'list', label: t('tabs.list') },
    { id: 'deck', label: t('tabs.deck') },
    { id: 'game', label: t('tabs.game') },
  ]
  const gameItems = [
    {
      id: 'matching',
      title: t('games.matching.title'),
      description: t('games.matching.description'),
    },
    {
      id: 'ox',
      title: t('games.ox.title'),
      description: t('games.ox.description'),
    },
    {
      id: 'quickfill',
      title: t('games.quickfill.title'),
      description: t('games.quickfill.description'),
    },
  ]
  return (
    <div className="flex h-full flex-col gap-6">
      <div className="border-b border-slate-200">
        <div className="flex items-center gap-6">
          {tabItems.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`pb-3 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? 'border-b-2 border-slate-900 text-slate-900'
                  : 'border-b-2 border-transparent text-slate-400 hover:text-slate-700'
              }`}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'list' && (
        <div className="flex flex-col items-center gap-3 pb-10">
          <div className="w-full max-w-[66%]">
            <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
              {t('countLabel', { count: flashcards.length })}
            </div>
          </div>
          {flashcards.map(card => (
            <div
              key={card.id}
              className="group relative w-full max-w-[66%] rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
            >
              <div className="pointer-events-none absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  className="pointer-events-auto rounded-lg border border-indigo-100 bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-600 shadow-sm hover:border-indigo-200 hover:bg-indigo-100"
                >
                  {t('actions.edit')}
                </button>
                <button
                  type="button"
                  className="pointer-events-auto rounded-lg border border-rose-100 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-600 shadow-sm hover:border-rose-200 hover:bg-rose-100"
                >
                  {t('actions.delete')}
                </button>
              </div>
              <div className="text-sm font-semibold text-slate-900">
                {card.term}
                <span className="mx-2 text-slate-300">|</span>
                <span className="font-normal text-slate-600">{card.definition}</span>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="mt-3 w-full max-w-[66%] rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-50"
          >
            <span className="inline-flex items-center justify-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-600">
                +
              </span>
              {t('actions.addWord')}
            </span>
          </button>
        </div>
      )}

      {activeTab === 'deck' && (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white">
          <p className="text-sm font-medium text-slate-400">{t('deckComingSoon')}</p>
        </div>
      )}

      {activeTab === 'game' && (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {gameItems.map(game => (
            <div
              key={game.id}
              className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="aspect-[4/3] w-full rounded-xl border border-slate-100 bg-slate-50" />
              <div>
                <h3 className="text-sm font-semibold text-slate-900">{game.title}</h3>
                <p className="mt-1 text-xs text-slate-500">{game.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

