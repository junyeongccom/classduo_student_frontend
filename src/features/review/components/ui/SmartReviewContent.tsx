'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { LectureReviewItem } from '@/features/review/types'
import { AddReviewWordModal } from './AddReviewWordModal'
import { ConfirmDialog } from './ConfirmDialog'
import { DefinitionBuilderGame } from './DefinitionBuilderGame'
import { ReviewMatchingGame } from './ReviewMatchingGame'
import type { DefinitionBuilderGameResponse } from '@/features/review/types'

export type SmartReviewTab = 'list' | 'deck' | 'game'

interface SmartReviewContentProps {
  activeTab: SmartReviewTab
  onTabChange: (tab: SmartReviewTab) => void
  activeGameId: string | null
  onSelectGame: (gameId: string) => void
  onExitGame: () => void
  reviewItems: LectureReviewItem[]
  isReviewItemsLoading: boolean
  reviewItemsError: string | null
  hasSelectedLecture: boolean
  definitionBuilderData: DefinitionBuilderGameResponse | null
  isDefinitionBuilderLoading: boolean
  definitionBuilderError: string | null
  onRetryDefinitionBuilder: () => void
  isMutating: boolean
  mutationError: string | null
  onAddReviewWord: (keyword: string, description: string) => Promise<boolean>
  onUpdateReviewWord: (reviewItemId: string, keyword: string, description: string) => Promise<boolean>
  onDeleteReviewWord: (reviewItemId: string) => Promise<boolean>
  onImportRecommendedWords: () => Promise<boolean>
  onRequestImportPreview: () => Promise<void>
  importPreviewItems: Array<{ keyword: string; description: string }>
  isImportPreviewLoading: boolean
  importPreviewError: string | null
}

export function SmartReviewContent({
  activeTab,
  onTabChange,
  activeGameId,
  onSelectGame,
  onExitGame,
  reviewItems,
  isReviewItemsLoading,
  reviewItemsError,
  hasSelectedLecture,
  definitionBuilderData,
  isDefinitionBuilderLoading,
  definitionBuilderError,
  onRetryDefinitionBuilder,
  isMutating,
  mutationError,
  onAddReviewWord,
  onUpdateReviewWord,
  onDeleteReviewWord,
  onImportRecommendedWords,
  onRequestImportPreview,
  importPreviewItems,
  isImportPreviewLoading,
  importPreviewError,
}: SmartReviewContentProps) {
  const t = useTranslations('review.ui')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<LectureReviewItem | null>(null)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<LectureReviewItem | null>(null)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [isTabGuardOpen, setIsTabGuardOpen] = useState(false)
  const [definitionScore, setDefinitionScore] = useState(0)
  const [scoreDelta, setScoreDelta] = useState(0)
  const [scoreTone, setScoreTone] = useState<'positive' | 'negative' | null>(null)
  useEffect(() => {
    if (activeGameId === 'definition-builder') {
      setDefinitionScore(0)
      setScoreDelta(0)
      setScoreTone(null)
    }
  }, [activeGameId])
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)
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
      thumbnail: '/matching_thumbnail.png',
    },
    {
      id: 'definition-builder',
      title: t('games.quickfill.title'),
      description: t('games.quickfill.description'),
      thumbnail: '/DB_thumbnail.png',
    },
  ]
  return (
    <div className="flex h-full flex-col gap-6">
      <div className="border-b border-slate-200">
        <div className="flex items-center gap-6">
          {tabItems.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                if ((tab.id === 'deck' || tab.id === 'game') && reviewItems.length === 0) {
                  setIsTabGuardOpen(true)
                  return
                }
                onTabChange(tab.id)
              }}
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
                <div className="group relative">
                  <button
                    type="button"
                    onClick={() => {
                      onRequestImportPreview()
                      setIsConfirmDialogOpen(true)
                    }}
                    disabled={isMutating}
                    className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 transition-colors disabled:opacity-60"
                  >
                    {isMutating ? '처리 중...' : '추천 단어 불러오기'}
                  </button>
                  <div className="pointer-events-none absolute left-1/2 top-0 z-30 hidden w-max -translate-x-1/2 -translate-y-full rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-medium text-purple-700 shadow-lg group-hover:block">
                    {t('importTooltip')}
                    <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-purple-200 bg-purple-50" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {mutationError && (
            <div className="w-full max-w-[66%] rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-700">
              {mutationError}
            </div>
          )}

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
              role="button"
              tabIndex={0}
              onClick={() => {
                setExpandedItemId(prev => (prev === item.id ? null : item.id))
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setExpandedItemId(prev => (prev === item.id ? null : item.id))
                }
              }}
              className="group relative w-full max-w-[66%] rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
            >
              <div className="pointer-events-none absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  disabled={isMutating}
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingItem(item)
                  }}
                  className="pointer-events-auto rounded-lg border border-indigo-100 bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-600 shadow-sm hover:border-indigo-200 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {t('actions.edit')}
                </button>
                <button
                  type="button"
                  disabled={isMutating}
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteTarget(item)
                    setIsDeleteConfirmOpen(true)
                  }}
                  className="pointer-events-auto rounded-lg border border-rose-100 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-600 shadow-sm hover:border-rose-200 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {t('actions.delete')}
                </button>
              </div>
              <div className="flex items-start text-sm">
                <span className="font-semibold text-slate-900 shrink-0">{item.keyword}</span>
                <span className="mx-2 text-slate-300 shrink-0">|</span>
                <span
                  className={[
                    'text-slate-600 font-normal min-w-0 flex-1',
                    expandedItemId === item.id
                      ? 'whitespace-normal break-words'
                      : 'truncate whitespace-nowrap overflow-hidden text-ellipsis',
                  ].join(' ')}
                >
                  {item.description}
                </span>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            disabled={!hasSelectedLecture || isMutating}
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
        <div className="flex flex-col gap-6">
          {activeGameId === 'definition-builder' ? (
            <div className="flex flex-col gap-4">
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-semibold text-slate-900">{t('games.quickfill.title')}</div>
                </div>
                <button
                  type="button"
                  onClick={onExitGame}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {t('definitionBuilder.back')}
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">{t('definitionBuilder.scorePrefix')}</span>
                <span
                  className={`text-2xl font-bold ${
                    scoreTone === 'positive'
                      ? 'text-emerald-600'
                      : scoreTone === 'negative'
                        ? 'text-rose-600'
                        : 'text-slate-800'
                  }`}
                >
                  {definitionScore}
                </span>
                {scoreDelta !== 0 && (
                  <span
                    className={`text-sm font-semibold ${
                      scoreDelta > 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta}
                  </span>
                )}
              </div>
              <DefinitionBuilderGame
                data={definitionBuilderData}
                isLoading={isDefinitionBuilderLoading}
                error={definitionBuilderError}
                onRetry={onRetryDefinitionBuilder}
                isEnabled={hasSelectedLecture}
                currentScore={definitionScore}
                onScoreDelta={(delta) => {
                  setDefinitionScore(prev => prev + delta)
                  setScoreDelta(delta)
                  setScoreTone(delta > 0 ? 'positive' : 'negative')
                  window.setTimeout(() => {
                    setScoreDelta(0)
                    setScoreTone(null)
                  }, 800)
                }}
                onRestart={() => {
                  setDefinitionScore(0)
                  setScoreDelta(0)
                  setScoreTone(null)
                  onRetryDefinitionBuilder()
                }}
              />
            </div>
          ) : activeGameId === 'matching' ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">{t('games.matching.title')}</div>
                <button
                  type="button"
                  onClick={onExitGame}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {t('definitionBuilder.back')}
                </button>
              </div>
              <ReviewMatchingGame
                reviewItems={reviewItems}
                isEnabled={hasSelectedLecture}
                onExit={onExitGame}
              />
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {gameItems.map(game => {
                const isPlayable = game.id === 'definition-builder' || game.id === 'matching'
                return (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => {
                      if (isPlayable) onSelectGame(game.id)
                    }}
                    className={`flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition ${
                      isPlayable ? 'hover:-translate-y-0.5 hover:border-slate-300' : 'cursor-not-allowed opacity-60'
                    }`}
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
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 단어 추가 모달 */}
      <AddReviewWordModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        isSubmitting={isMutating}
        errorMessage={mutationError}
        title="단어 추가하기"
        submitLabel="단어 추가하기"
        onSubmit={async (keyword, description) => {
          return await onAddReviewWord(keyword, description)
        }}
      />

      {/* 단어 수정 모달 */}
      <AddReviewWordModal
        isOpen={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        isSubmitting={isMutating}
        errorMessage={mutationError}
        title="단어 수정하기"
        submitLabel="수정하기"
        initialKeyword={editingItem?.keyword || ''}
        initialDescription={editingItem?.description || ''}
        onSubmit={async (keyword, description) => {
          if (!editingItem) return false
          const ok = await onUpdateReviewWord(editingItem.id, keyword, description)
          if (ok) setEditingItem(null)
          return ok
        }}
      />

      {/* 추천 단어 불러오기 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={isConfirmDialogOpen}
        title="추천 단어 불러오기"
        message="이번 회차의 추천 단어를 불러오시겠습니까?"
        confirmLabel="예"
        cancelLabel="아니오"
        isLoading={isMutating}
        onConfirm={async () => {
          const ok = await onImportRecommendedWords()
          if (ok) setIsConfirmDialogOpen(false)
        }}
        onCancel={() => setIsConfirmDialogOpen(false)}
      >
        <div className="text-xs text-slate-500">
          이미 추가된 단어들은 제외하고 아래의 새로운 단어들만 추가됩니다
        </div>

        {importPreviewError && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {importPreviewError}
          </div>
        )}

        {isImportPreviewLoading && (
          <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
            불러오는 중...
          </div>
        )}

        {!isImportPreviewLoading && !importPreviewError && (
          <div className="mt-3 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white">
            {importPreviewItems.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-500">
                불러올 추천 단어가 없습니다.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {importPreviewItems.slice(0, 10).map((it, idx) => (
                  <div key={`${it.keyword}-${idx}`} className="px-3 py-2">
                    <div className="text-[11px] font-semibold text-slate-900 truncate">
                      {it.keyword}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-600 truncate">
                      {it.description}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </ConfirmDialog>

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="단어 삭제"
        message={deleteTarget ? `\"${deleteTarget.keyword}\"를 삭제하시겠습니까?` : '삭제하시겠습니까?'}
        confirmLabel="예"
        cancelLabel="아니오"
        isLoading={isMutating}
        onConfirm={async () => {
          if (!deleteTarget) return
          const ok = await onDeleteReviewWord(deleteTarget.id)
          if (ok) {
            setIsDeleteConfirmOpen(false)
            setDeleteTarget(null)
          }
        }}
        onCancel={() => {
          setIsDeleteConfirmOpen(false)
          setDeleteTarget(null)
        }}
      />

      <ConfirmDialog
        isOpen={isTabGuardOpen}
        title={t('guard.title')}
        message={t('guard.message')}
        confirmLabel={t('guard.confirm')}
        cancelLabel={t('guard.cancel')}
        onConfirm={() => setIsTabGuardOpen(false)}
        onCancel={() => setIsTabGuardOpen(false)}
      />
    </div>
  )
}

