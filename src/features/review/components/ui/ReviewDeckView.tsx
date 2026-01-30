'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { ReviewDeckViewModel } from '@/features/review/hooks/useReviewDeck'
import { DeckLevelWordsModal } from './DeckLevelWordsModal'
import type { DeckLevel } from '@/features/review/domain/deck'

interface ReviewDeckViewProps {
  hasSelectedLecture: boolean
  isReviewItemsLoading: boolean
  reviewItemsError: string | null
  deck: ReviewDeckViewModel
}

export function ReviewDeckView({ hasSelectedLecture, isReviewItemsLoading, reviewItemsError, deck }: ReviewDeckViewProps) {
  const t = useTranslations('review.ui.deck')
  const [isFlipped, setIsFlipped] = useState(false)
  const [selectedLevel, setSelectedLevel] = useState<DeckLevel | null>(null)

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

  const keyword = deck.currentItem?.keyword ?? ''
  const description = deck.currentItem?.description ?? ''
  const frontLabel = t('keyword')
  const backLabel = t('description')

  return (
    <div className="flex flex-1 justify-center">
      {/* 목록과 동일한 가로 폭(max-w-[66%])로 통일 */}
      <div className="flex w-full max-w-[66%] flex-col gap-4">
        {/* 모드 정보 + 이해 단계 분포 */}
        <div className="flex justify-center">
          <div className="w-full max-w-[780px] grid grid-cols-[1fr_2fr] gap-2">
            {/* 모드 정보 칸 */}
            <div className={`rounded-2xl border px-4 py-3 shadow-sm flex flex-col items-center justify-center ${
              deck.mode === 'lowest' 
                ? 'border-rose-200 bg-rose-50' 
                : 'border-slate-200 bg-white'
            }`}>
              <div className="text-[22px] font-semibold text-slate-500 mb-2">
                {deck.mode === 'basic' ? t('modeBasic') : t('modeLowest')}
              </div>
            </div>
            
            {/* 이해 단계 분포 칸 */}
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div className="grid grid-cols-4 gap-2 text-center">
                {[1, 2, 3, 4].map((lv) => (
                  <button
                    key={lv}
                    type="button"
                    onClick={() => setSelectedLevel(lv as DeckLevel)}
                    className="rounded-xl border border-slate-100 bg-slate-50 px-2 py-2 hover:bg-slate-100 hover:border-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
                  >
                    <div className="text-[10px] font-semibold text-slate-500">{t(`level${lv}` as 'level1' | 'level2' | 'level3' | 'level4')}</div>
                    <div className="mt-0.5 text-[35px] font-bold text-slate-900">
                      {deck.levelCounts[lv as 1 | 2 | 3 | 4]}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 카드(단어/설명) 플립 */}
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5 shadow-sm">
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
              aria-label={isFlipped ? frontLabel : backLabel}
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
                      {/* 내용 영역 - 항상 단어 */}
                      <div className="flex-1 flex items-center justify-center w-full">
                        <div className="text-center text-5xl font-extrabold tracking-tight text-slate-900">
                          {keyword}
                        </div>
                      </div>
                      {/* 힌트 - 항상 같은 위치 */}
                      <div className="mb-3 text-[11px] font-medium text-slate-400 opacity-80">
                        {t('clickToRevealDescription')}
                      </div>
                    </div>
                  </div>

                  {/* Back */}
                  <div className="absolute inset-0 h-full w-full rounded-2xl px-5 py-5 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <div className="flex h-full w-full flex-col items-center justify-center">
                      {/* 내용 영역 - 항상 설명 */}
                      <div className="flex-1 flex items-center justify-center w-full">
                        <div className="w-full px-4">
                          <div className="text-[11px] font-semibold text-slate-500 mb-2 text-center">{backLabel}</div>
                          <div className="text-sm font-medium leading-relaxed text-slate-800 text-center">
                            {description || '-'}
                          </div>
                        </div>
                      </div>
                      {/* 힌트 - 항상 같은 위치 */}
                      <div className="mb-3 text-[11px] font-medium text-slate-400 opacity-80">
                        {t('clickToRevealKeyword')}
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

        {/* 초기화 버튼 */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => deck.resetDeck()}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
          >
            초기화
          </button>
        </div>
      </div>

      {/* 단계별 단어 목록 모달 */}
      {selectedLevel && (
        <DeckLevelWordsModal
          isOpen={selectedLevel !== null}
          onClose={() => setSelectedLevel(null)}
          level={selectedLevel}
          items={deck.itemsByLevel[selectedLevel]}
        />
      )}
    </div>
  )
}


