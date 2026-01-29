'use client'

import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { LectureReviewItem } from '@/features/review/types'
import type { DeckLevel } from '@/features/review/domain/deck'

interface DeckLevelWordsModalProps {
  isOpen: boolean
  onClose: () => void
  level: DeckLevel
  items: LectureReviewItem[]
}

export function DeckLevelWordsModal({ isOpen, onClose, level, items }: DeckLevelWordsModalProps) {
  const t = useTranslations('review.ui.deck')

  if (!isOpen) return null

  const levelLabel = t(`level${level}` as 'level1' | 'level2' | 'level3' | 'level4')

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div 
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      
      {/* 모달 컨텐츠 */}
      <div className="relative z-10 w-full max-w-2xl max-h-[80vh] rounded-2xl bg-white shadow-xl flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">
            {levelLabel} ({items.length})
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 내용 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-slate-500">{t('levelModal.empty')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 p-4"
                >
                  <div className="text-sm font-semibold text-slate-900 mb-2">
                    {item.keyword}
                  </div>
                  <div className="text-sm text-slate-700 leading-relaxed">
                    {item.description}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="border-t border-slate-200 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 transition-colors"
          >
            {t('levelModal.close')}
          </button>
        </div>
      </div>
    </div>
  )
}

