/**
 * @file SolitaireBoard.tsx
 * @description 판 렌더링 — 상단 기초 슬롯 / 바로 아래 테이블로 / 우상단 스톡·웨이스트 (props 만 받는다)
 * @module features/review/games/word-solitaire/components
 * @dependencies engine 타입, selection 키 유틸, SolitaireCardView
 */
'use client'

import { useTranslations } from 'next-intl'
import { Layers, RotateCcw } from 'lucide-react'
import type { MoveSource, MoveTarget, SolitaireState } from '../engine/index.ts'
import { sourceKey, targetKey, type SolitaireSelection } from '../selection.ts'
import { isSameSource } from '../selection.ts'
import { CARD_HEIGHT, MIN_CARD_WIDTH, TARGET_RING_CLASS, cardTopOffsets, columnHeight } from '../uiConstants.ts'
import { SolitaireCardView } from './SolitaireCardView'

export interface SolitaireBoardProps {
  state: SolitaireState
  selection: SolitaireSelection | null
  /** 하이라이트할 목적지 키 (`foundation:0` / `tableau:2`) */
  highlightKeys: Set<string>
  /** 지금 집을 수 있는 카드 키 */
  movableKeys: Set<string>
  /** 방금 거절된 탭의 키 — 잠깐 흔든다 */
  rejectedKey: string | null
  canDraw: boolean
  /** 승리 후에는 판을 잠근다 */
  locked: boolean
  onTapCard: (source: MoveSource, key: string) => void
  onTapTarget: (target: MoveTarget, key: string) => void
  onDraw: () => void
}

const EMPTY_SLOT_CLASS =
  'flex w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-[10px] text-gray-400'

export function SolitaireBoard({
  state,
  selection,
  highlightKeys,
  movableKeys,
  rejectedKey,
  canDraw,
  locked,
  onTapCard,
  onTapTarget,
  onDraw,
}: SolitaireBoardProps) {
  const t = useTranslations('review.ui.wordSolitaire')
  const { deck, foundations, tableau, stock, waste } = state

  const wasteTopId = waste.length > 0 ? waste[waste.length - 1] : null
  const wasteKey = sourceKey({ type: 'waste' })
  const isWasteSelected = isSameSource(selection, { type: 'waste' })

  return (
    <div className="flex flex-col gap-4">
      {/* 턴 카운터(좌상단) + 스톡·웨이스트(우상단) */}
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-xl bg-gray-900 px-3 py-2 text-white">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-300">{t('turnsLabel')}</div>
          <div className="text-xl font-bold leading-none" aria-live="polite">
            {state.turns}
          </div>
        </div>

        <div className="flex items-end gap-2">
          {/* 웨이스트: 맨 위 1장만 옮길 수 있다 */}
          <div className="relative w-[84px]" style={{ height: CARD_HEIGHT }}>
            {wasteTopId === null ? (
              <div className={EMPTY_SLOT_CLASS} style={{ height: CARD_HEIGHT }}>
                {t('wasteEmpty')}
              </div>
            ) : (
              <SolitaireCardView
                kind={deck.cards[wasteTopId].kind}
                label={deck.cards[wasteTopId].label}
                progress={
                  deck.cards[wasteTopId].kind === 'category'
                    ? { done: 0, total: deck.categoryWordCounts[deck.cards[wasteTopId].categoryId] }
                    : null
                }
                selected={isWasteSelected}
                movable={movableKeys.has(wasteKey)}
                rejected={rejectedKey === wasteKey}
                disabled={locked}
                ariaLabel={t('wasteCardAria', { label: deck.cards[wasteTopId].label })}
                onClick={() => onTapCard({ type: 'waste' }, wasteKey)}
              />
            )}
          </div>

          {/* 스톡: 열기 = 1턴 */}
          <button
            type="button"
            onClick={onDraw}
            disabled={locked || !canDraw}
            aria-label={t('drawAria', { count: stock.length })}
            style={{ height: CARD_HEIGHT }}
            className={`flex w-[84px] flex-col items-center justify-center gap-0.5 rounded-lg border text-white transition ${
              canDraw && !locked
                ? 'border-indigo-300 bg-gradient-to-br from-indigo-400 to-indigo-600 hover:brightness-110'
                : 'cursor-not-allowed border-gray-200 bg-gray-300'
            }`}
          >
            {stock.length === 0 ? (
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Layers className="h-4 w-4" aria-hidden="true" />
            )}
            <span className="text-[11px] font-bold">{stock.length}</span>
          </button>
        </div>
      </div>

      {/*
        기초 슬롯과 테이블로는 열 수가 같아 세로로 맞물려야 한다 —
        좁은 화면에서 어긋나지 않도록 **하나의 가로 스크롤 컨테이너** 안에 함께 넣는다.
      */}
      <div className="flex flex-col gap-4 overflow-x-auto pb-1">
        {/* 기초 슬롯 */}
        <div>
          <div className="mb-1.5 text-[11px] font-semibold text-gray-500">{t('foundationLabel')}</div>
          <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${foundations.length}, minmax(${MIN_CARD_WIDTH}px, 1fr))` }}
          >
          {foundations.map((slot, index) => {
            const key = targetKey({ type: 'foundation', slot: index })
            const isTarget = highlightKeys.has(key)
            const target: MoveTarget = { type: 'foundation', slot: index }
            return (
              <div
                key={key}
                className={`relative rounded-lg ${isTarget ? TARGET_RING_CLASS : ''}`}
                style={{ height: CARD_HEIGHT }}
              >
                {slot.categoryId === null ? (
                  <button
                    type="button"
                    onClick={() => onTapTarget(target, key)}
                    disabled={locked || !isTarget}
                    aria-label={t('emptyFoundationAria')}
                    className={`${EMPTY_SLOT_CLASS} ${isTarget ? 'cursor-pointer' : 'cursor-default'}`}
                    style={{ height: CARD_HEIGHT }}
                  >
                    {t('emptySlot')}
                  </button>
                ) : (
                  <SolitaireCardView
                    kind="category"
                    label={deck.categoryNames[slot.categoryId]}
                    progress={{ done: slot.wordIds.length, total: deck.categoryWordCounts[slot.categoryId] }}
                    disabled={locked || !isTarget}
                    rejected={rejectedKey === key}
                    ariaLabel={t('foundationAria', {
                      name: deck.categoryNames[slot.categoryId],
                      done: slot.wordIds.length,
                      total: deck.categoryWordCounts[slot.categoryId],
                    })}
                    onClick={() => onTapTarget(target, key)}
                  />
                )}
              </div>
            )
          })}
          </div>
        </div>

        {/* 테이블로 — 기초 바로 아래 (계획서 §2 확정) */}
        <div
          className="grid items-start gap-1.5"
          style={{ gridTemplateColumns: `repeat(${tableau.length}, minmax(${MIN_CARD_WIDTH}px, 1fr))` }}
        >
          {tableau.map((column, columnIndex) => {
            const key = targetKey({ type: 'tableau', column: columnIndex })
            const isTarget = highlightKeys.has(key)
            const target: MoveTarget = { type: 'tableau', column: columnIndex }
            const offsets = cardTopOffsets(column.cardIds.length, column.faceUpFrom)

            return (
              <div
                key={key}
                className={`relative rounded-lg ${isTarget ? TARGET_RING_CLASS : ''}`}
                style={{ height: columnHeight(column.cardIds.length, column.faceUpFrom) }}
              >
                {column.cardIds.length === 0 && (
                  <button
                    type="button"
                    onClick={() => onTapTarget(target, key)}
                    disabled={locked || !isTarget}
                    aria-label={t('emptyColumnAria', { column: columnIndex + 1 })}
                    className={`${EMPTY_SLOT_CLASS} absolute inset-x-0 top-0`}
                    style={{ height: CARD_HEIGHT }}
                  >
                    {t('emptySlot')}
                  </button>
                )}

                {column.cardIds.map((cardId, index) => {
                  const card = deck.cards[cardId]
                  const faceDown = index < column.faceUpFrom
                  const source: MoveSource = { type: 'tableau', column: columnIndex, index }
                  const cardKey = sourceKey(source)
                  // 목적지로 켜진 열에서는 카드 탭도 "여기에 놓기"로 해석한다.
                  const actsAsTarget = isTarget && Boolean(selection)
                  return (
                    <SolitaireCardView
                      key={cardId}
                      faceDown={faceDown}
                      kind={card.kind}
                      label={card.label}
                      progress={
                        card.kind === 'category'
                          ? { done: 0, total: deck.categoryWordCounts[card.categoryId] }
                          : null
                      }
                      selected={isSameSource(selection, source)}
                      movable={movableKeys.has(cardKey)}
                      rejected={rejectedKey === cardKey}
                      disabled={locked || (faceDown && !actsAsTarget)}
                      top={offsets[index]}
                      alignTop
                      ariaLabel={
                        faceDown
                          ? t('faceDownAria')
                          : card.kind === 'category'
                            ? t('categoryCardAria', { name: card.label })
                            : t('wordCardAria', { label: card.label })
                      }
                      onClick={
                        actsAsTarget
                          ? () => onTapTarget(target, key)
                          : faceDown
                            ? undefined
                            : () => onTapCard(source, cardKey)
                      }
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
