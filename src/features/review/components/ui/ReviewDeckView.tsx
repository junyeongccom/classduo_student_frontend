'use client'

import { useTranslations } from 'next-intl'
import type { ReviewDeckViewModel } from '@/features/review/hooks/useReviewDeck'

interface ReviewDeckViewProps {
  hasSelectedLecture: boolean
  isReviewItemsLoading: boolean
  reviewItemsError: string | null
  deck: ReviewDeckViewModel
}

export function ReviewDeckView({ hasSelectedLecture, isReviewItemsLoading, reviewItemsError, deck }: ReviewDeckViewProps) {
  const t = useTranslations('review.ui.deck')

  if (!hasSelectedLecture) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6">
        <p className="text-sm font-medium text-slate-500">{t('needLecture')}</p>
      </div>
    )
  }

  if (isReviewItemsLoading) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6">
        <p className="text-sm font-medium text-slate-500">{t('loading')}</p>
      </div>
    )
  }

  if (reviewItemsError) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-6">
        <p className="text-sm font-medium text-rose-700">{reviewItemsError}</p>
      </div>
    )
  }

  if (deck.reviewItemsCount === 0) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6">
        <p className="text-sm font-medium text-slate-500">{t('empty')}</p>
      </div>
    )
  }

  if (deck.allCompleted) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 px-6 py-10">
        <div className="text-center">
          <div className="text-sm font-semibold text-emerald-800">{t('allCompletedTitle')}</div>
          <div className="mt-1 text-xs text-emerald-700/80">{t('allCompletedBody')}</div>
        </div>
        <button
          type="button"
          onClick={deck.restartRound}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2"
        >
          {t('restart')}
        </button>
      </div>
    )
  }

  if (deck.roundCompleted) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-10">
        <div className="text-center">
          <div className="text-sm font-semibold text-slate-900">{t('roundCompletedTitle')}</div>
          <div className="mt-1 text-xs text-slate-500">{t('roundCompletedBody')}</div>
        </div>
        <button
          type="button"
          onClick={deck.restartRound}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
        >
          {t('restart')}
        </button>
      </div>
    )
  }

  const keyword = deck.currentItem?.keyword ?? ''

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">{t('progressLabel')}</div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="text-2xl font-bold text-slate-900">
              {Math.min(deck.roundCursor + 1, deck.roundTotal)}
            </div>
            <div className="text-sm font-semibold text-slate-400">/ {deck.roundTotal}</div>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${deck.roundTotal ? (deck.roundCursor / deck.roundTotal) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">{t('levelsLabel')}</div>
          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            {[1, 2, 3, 4].map((lv) => (
              <div key={lv} className="rounded-xl border border-slate-100 bg-slate-50 px-2 py-2">
                <div className="text-[11px] font-semibold text-slate-500">{t('level', { level: lv })}</div>
                <div className="mt-1 text-sm font-bold text-slate-900">
                  {deck.levelCounts[lv as 1 | 2 | 3 | 4]}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-10 shadow-sm">
        <div className="text-xs font-semibold text-slate-500">{t('cardLabel')}</div>
        <div className="mt-2 text-center text-3xl font-extrabold tracking-tight text-slate-900">{keyword}</div>
        <div className="mt-3 text-xs font-semibold text-slate-400">
          {t('currentLevelLabel', { level: deck.currentLevel ?? 1 })}
        </div>

        <div className="mt-8 grid w-full max-w-md grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => deck.rateCurrent('bad')}
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:ring-offset-2"
          >
            {t('bad')}
          </button>
          <button
            type="button"
            onClick={() => deck.rateCurrent('okay')}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
          >
            {t('okay')}
          </button>
          <button
            type="button"
            onClick={() => deck.rateCurrent('good')}
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2"
          >
            {t('good')}
          </button>
        </div>
      </div>
    </div>
  )
}


