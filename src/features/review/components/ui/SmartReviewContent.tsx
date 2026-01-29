'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { LectureReviewItem } from '@/features/review/types'
import { AddReviewWordModal } from './AddReviewWordModal'
import { ConfirmDialog } from './ConfirmDialog'

export type SmartReviewTab = 'list' | 'deck' | 'game'

interface SmartReviewContentProps {
  activeTab: SmartReviewTab
  onTabChange: (tab: SmartReviewTab) => void
  reviewItems: LectureReviewItem[]
  isReviewItemsLoading: boolean
  reviewItemsError: string | null
  hasSelectedLecture: boolean
}

export function SmartReviewContent({
  activeTab,
  onTabChange,
  reviewItems,
  isReviewItemsLoading,
  reviewItemsError,
  hasSelectedLecture,
}: SmartReviewContentProps) {
  const t = useTranslations('review.ui')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
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
      thumbnail: '/스크린샷 2026-01-29 171432.png',
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
            <div className="mb-1 flex items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                {t('countLabel', { count: reviewItems.length })}
              </div>
              {hasSelectedLecture && (
                <button
                  type="button"
                  onClick={() => setIsConfirmDialogOpen(true)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 transition-colors"
                >
                  추천 단어 불러오기
                </button>
              )}
            </div>
          </div>

          {/* 상태 UI */}
          {!hasSelectedLecture && (
            <div className="w-full max-w-[66%] rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-4 text-sm text-slate-500">
              회차를 선택하면 복습 단어 목록이 표시됩니다.
            </div>
          )}

          {hasSelectedLecture && isReviewItemsLoading && (
            <div className="w-full max-w-[66%] rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-4 text-sm text-slate-500">
              불러오는 중...
            </div>
          )}

          {hasSelectedLecture && !isReviewItemsLoading && reviewItemsError && (
            <div className="w-full max-w-[66%] rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
              {reviewItemsError}
            </div>
          )}

          {hasSelectedLecture && !isReviewItemsLoading && !reviewItemsError && reviewItems.length === 0 && (
            <div className="w-full max-w-[66%] rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-4 text-sm text-slate-500">
              아직 등록된 복습어휘가 없습니다.
            </div>
          )}

          {reviewItems.map(item => (
            <div
              key={item.id}
              className="group relative w-full max-w-[66%] rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
            >
              <div className="pointer-events-none absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  disabled
                  className="pointer-events-auto cursor-not-allowed rounded-lg border border-indigo-100 bg-indigo-50/60 px-2 py-1 text-[11px] font-semibold text-indigo-400 shadow-sm"
                >
                  {t('actions.edit')}
                </button>
                <button
                  type="button"
                  disabled
                  className="pointer-events-auto cursor-not-allowed rounded-lg border border-rose-100 bg-rose-50/60 px-2 py-1 text-[11px] font-semibold text-rose-400 shadow-sm"
                >
                  {t('actions.delete')}
                </button>
              </div>
              <div className="text-sm font-semibold text-slate-900">
                {item.keyword}
                <span className="mx-2 text-slate-300">|</span>
                <span className="font-normal text-slate-600">{item.description}</span>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
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
              <div className="aspect-[4/3] w-full rounded-xl border border-slate-100 bg-slate-50 overflow-hidden">
                {game.thumbnail ? (
                  <img
                    src={game.thumbnail}
                    alt={`${game.title} 썸네일`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : null}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">{game.title}</h3>
                <p className="mt-1 text-xs text-slate-500">{game.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 단어 추가 모달 */}
      <AddReviewWordModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={(keyword, description) => {
          // 백엔드 연동은 나중에 추가
          console.log('Add word:', { keyword, description })
        }}
      />

      {/* 추천 단어 불러오기 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={isConfirmDialogOpen}
        title="추천 단어 불러오기"
        message="이번 회차의 추천 단어를 불러오시겠습니까?"
        confirmLabel="예"
        cancelLabel="아니오"
        onConfirm={() => {
          // 백엔드 연동은 나중에 추가
          console.log('Load recommended words')
          setIsConfirmDialogOpen(false)
        }}
        onCancel={() => setIsConfirmDialogOpen(false)}
      />
    </div>
  )
}

