'use client'

import { useEffect, useState } from 'react'
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
  const [isFlipped, setIsFlipped] = useState(false)

  // 카드가 바뀌면(다음 단어로 진행) 자동으로 앞면(키워드)로 복귀
  useEffect(() => {
    setIsFlipped(false)
  }, [deck.currentItem?.id])

  if (!hasSelectedLecture) {
    return (
      <div className="flex flex-1 justify-center">
        <div className="w-full max-w-[66%]">
          <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-6">
            <p className="text-sm font-medium text-slate-500">{t('needLecture')}</p>
          </div>
        </div>
      </div>
    )
  }

  if (isReviewItemsLoading) {
    return (
      <div className="flex flex-1 justify-center">
        <div className="w-full max-w-[66%]">
          <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-6">
            <p className="text-sm font-medium text-slate-500">{t('loading')}</p>
          </div>
        </div>
      </div>
    )
  }

  if (reviewItemsError) {
    return (
      <div className="flex flex-1 justify-center">
        <div className="w-full max-w-[66%]">
          <div className="flex items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-5 py-6">
            <p className="text-sm font-medium text-rose-700">{reviewItemsError}</p>
          </div>
        </div>
      </div>
    )
  }

  if (deck.reviewItemsCount === 0) {
    return (
      <div className="flex flex-1 justify-center">
        <div className="w-full max-w-[66%]">
          <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-6">
            <p className="text-sm font-medium text-slate-500">{t('empty')}</p>
          </div>
        </div>
      </div>
    )
  }

  if (deck.allCompleted) {
    return (
      <div className="flex flex-1 justify-center">
        <div className="w-full max-w-[66%]">
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 px-5 py-8">
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
        </div>
      </div>
    )
  }

  if (deck.roundCompleted) {
    return (
      <div className="flex flex-1 justify-center">
        <div className="w-full max-w-[66%]">
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-8">
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
        </div>
      </div>
    )
  }

  const keyword = deck.currentItem?.keyword ?? ''
  const description = deck.currentItem?.description ?? ''
  const cardSide = deck.currentCardSide

  // 앞면과 뒷면 내용 결정
  const frontContent = cardSide === 'keyword' ? keyword : description
  const backContent = cardSide === 'keyword' ? description : keyword
  const frontLabel = cardSide === 'keyword' ? t('keyword') : t('description')
  const backLabel = cardSide === 'keyword' ? t('description') : t('keyword')

  return (
    <div className="flex flex-1 justify-center">
      {/* 목록과 동일한 가로 폭(max-w-[66%])로 통일 */}
      <div className="flex w-full max-w-[66%] flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="text-[11px] font-semibold text-slate-500">{t('progressLabel')}</div>
            <div className="mt-1 flex items-baseline gap-2">
              <div className="text-xl font-bold text-slate-900">
                {Math.min(deck.roundCursor + 1, deck.roundTotal)}
              </div>
              <div className="text-xs font-semibold text-slate-400">/ {deck.roundTotal}</div>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all"
                style={{ width: `${deck.roundTotal ? (deck.roundCursor / deck.roundTotal) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="text-[11px] font-semibold text-slate-500">{t('levelsLabel')}</div>
            <div className="mt-2 grid grid-cols-4 gap-2 text-center">
              {[1, 2, 3, 4].map((lv) => (
                <div key={lv} className="rounded-xl border border-slate-100 bg-slate-50 px-2 py-2">
                  <div className="text-[10px] font-semibold text-slate-500">{t('level', { level: lv })}</div>
                  <div className="mt-0.5 text-sm font-bold text-slate-900">
                    {deck.levelCounts[lv as 1 | 2 | 3 | 4]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 카드(키워드/단계) + description 플립 */}
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5 shadow-sm">
          <div className="mb-3 text-[11px] font-semibold text-slate-500">{t('cardLabel')}</div>

          <div className="mx-auto w-full max-w-[520px]">
            <button
              type="button"
              onClick={() => setIsFlipped((v) => !v)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setIsFlipped((v) => !v)
                }
              }}
              className="group block w-full rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
              aria-pressed={isFlipped}
              aria-label={isFlipped ? `Show ${frontLabel.toLowerCase()}` : `Show ${backLabel.toLowerCase()}`}
            >
              <div className="perspective-[1100px]">
                <div
                  className={[
                    'relative h-[210px] w-full rounded-2xl border border-slate-200 bg-slate-50/60',
                    'transition-transform duration-500 [transform-style:preserve-3d]',
                    isFlipped ? '[transform:rotateY(180deg)]' : '',
                  ].join(' ')}
                >
                  {/* Front */}
                  <div className="absolute inset-0 flex h-full w-full flex-col items-center justify-center rounded-2xl px-5 [backface-visibility:hidden]">
                    <div className="flex h-full w-full flex-col items-center justify-center">
                      {/* 내용 영역 - 단어든 설명이든 같은 위치 */}
                      <div className="flex-1 flex items-center justify-center w-full">
                        {cardSide === 'keyword' ? (
                          <div className="text-center text-2xl font-extrabold tracking-tight text-slate-900">
                            {frontContent}
                          </div>
                        ) : (
                          <div className="w-full px-4">
                            <div className="text-[11px] font-semibold text-slate-500 mb-2 text-center">{frontLabel}</div>
                            <div className="text-sm font-medium leading-relaxed text-slate-800 text-center">
                              {frontContent || '-'}
                            </div>
                          </div>
                        )}
                      </div>
                      {/* 단계 배지 - 항상 같은 위치 */}
                      <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                        {t('currentLevelLabel', { level: deck.currentLevel ?? 1 })}
                      </div>
                      {/* 힌트 - 항상 같은 위치 */}
                      <div className="mt-3 text-[11px] font-medium text-slate-400 opacity-80">
                        {cardSide === 'keyword' ? t('clickToRevealDescription') : t('clickToRevealKeyword')}
                      </div>
                    </div>
                  </div>

                  {/* Back */}
                  <div className="absolute inset-0 h-full w-full rounded-2xl px-5 py-5 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <div className="flex h-full w-full flex-col items-center justify-center">
                      {/* 내용 영역 - 단어든 설명이든 같은 위치 */}
                      <div className="flex-1 flex items-center justify-center w-full">
                        {cardSide === 'keyword' ? (
                          <div className="w-full px-4">
                            <div className="text-[11px] font-semibold text-slate-500 mb-2 text-center">{backLabel}</div>
                            <div className="text-sm font-medium leading-relaxed text-slate-800 text-center">
                              {backContent || '-'}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-2xl font-extrabold tracking-tight text-slate-900">
                            {backContent}
                          </div>
                        )}
                      </div>
                      {/* 힌트 - 항상 같은 위치 */}
                      <div className="mt-3 text-[11px] font-medium text-slate-400">
                        {t('clickToGoBack')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </button>
          </div>

          <div className="mt-5 grid w-full max-w-[520px] grid-cols-3 gap-2 mx-auto">
            <button
              type="button"
              onClick={() => deck.rateCurrent('bad')}
              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:ring-offset-2"
            >
              {t('bad')}
            </button>
            <button
              type="button"
              onClick={() => deck.rateCurrent('okay')}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
            >
              {t('okay')}
            </button>
            <button
              type="button"
              onClick={() => deck.rateCurrent('good')}
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2"
            >
              {t('good')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


