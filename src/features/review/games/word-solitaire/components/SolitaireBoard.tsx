/**
 * @file SolitaireBoard.tsx
 * @description 판 렌더링 — 상단 기초 슬롯 / 바로 아래 테이블로 / 우상단 스톡·웨이스트 (props 만 받는다)
 * @module features/review/games/word-solitaire/components
 * @dependencies engine 타입, selection 키 유틸, SolitaireCardView
 */
'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Crown, Layers, RotateCcw } from 'lucide-react'
import type { MoveSource, MoveTarget, SolitaireState } from '../engine/index.ts'
import { sourceKey, targetKey, type SolitaireSelection } from '../selection.ts'
import { isSameSource } from '../selection.ts'
import {
  CARD_ASPECT,
  COLUMN_GAP,
  TARGET_RING_CLASS,
  cardHeightFor,
  cardHeightForViewport,
  cardTopOffsets,
  cardWidthFor,
  columnHeight,
} from '../uiConstants.ts'
import { SolitaireCardView } from './SolitaireCardView'
import { useCardDrag } from '../useCardDrag.ts'
import { parseDropKey } from '../selection.ts'

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
  /** 경과 시간(ms) — 상단에 mm:ss 로 보여준다 */
  elapsedMs: number
  /** 승리 후에는 판을 잠근다 */
  locked: boolean
  onTapCard: (source: MoveSource, key: string) => void
  onTapTarget: (target: MoveTarget, key: string) => void
  /** 드래그로 놓기 — 출발지·목적지를 한 번에 받는다 */
  onDropCard: (source: MoveSource, target: MoveTarget, targetKey: string) => void
  onDraw: () => void
}

/** ms → `m:ss`. 한 시간을 넘길 게임이 아니라 분·초만 보여준다 */
const formatElapsed = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
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
  elapsedMs,
  locked,
  onTapCard,
  onTapTarget,
  onDropCard,
  onDraw,
}: SolitaireBoardProps) {
  const t = useTranslations('review.ui.wordSolitaire')
  const { deck, foundations, tableau, stock, waste } = state

  /**
   * 참고 게임처럼 열이 화면 폭을 나눠 갖게 한다 — 카드 폭을 고정하면 5열만 돼도 가로 스크롤이 생긴다.
   * 보드 폭을 실제로 재서 카드 치수를 계산하고, 폭이 바뀌면(회전·리사이즈) 다시 잰다.
   */
  const boardRef = useRef<HTMLDivElement>(null)
  const [boardWidth, setBoardWidth] = useState(0)
  const [availableHeight, setAvailableHeight] = useState(0)
  useEffect(() => {
    const el = boardRef.current
    if (!el) return
    const measure = () => {
      setBoardWidth(el.clientWidth)
      // 보드 위쪽(난이도 버튼·턴/스톡 바)이 쓰고 남은 세로를 좌표로 정확히 잰다.
      // offsetTop 은 offsetParent 기준이라 여기서는 맞지 않는다.
      const pane = el.closest('[data-solitaire-pane]')
      if (!pane) return
      const paneBottom = pane.getBoundingClientRect().bottom
      const boardTop = el.getBoundingClientRect().top
      setAvailableHeight(Math.max(0, paneBottom - boardTop - 12))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    const pane = el.closest('[data-solitaire-pane]')
    if (pane) observer.observe(pane)
    return () => observer.disconnect()
  }, [])

  const columnCount = Math.max(foundations.length, tableau.length)
  const longestColumn = tableau.reduce((max, col) => Math.max(max, col.cardIds.length), 1)
  const cardWidth = cardWidthFor(boardWidth, columnCount)
  /** 가로·세로 제약 중 빡빡한 쪽을 따른다 — 어느 한쪽만 보면 판이 화면 밖으로 나간다 */
  const heightFromWidth = cardHeightFor(cardWidth)
  const heightFromViewport =
    availableHeight > 0 ? cardHeightForViewport(availableHeight, longestColumn) : heightFromWidth
  const cardHeight = Math.max(56, Math.min(heightFromWidth, heightFromViewport))
  /** 세로 제약으로 높이가 줄면 폭도 같이 줄여 카드 비율을 지킨다 */
  const finalCardWidth = Math.min(cardWidth, Math.round(cardHeight / CARD_ASPECT))
  /**
   * 상단바(웨이스트·스톡)는 판이 아니라 보조 정보라 살짝 납작하게 둔다 —
   * 세로가 빠듯한 데스크톱에서 이 한 줄이 테이블로 카드 크기를 좌우한다.
   */
  const topBarCardHeight = Math.round(cardHeight * 0.8)
  /** 폭을 재기 전(첫 렌더)에는 카드를 그리지 않는다 — 잘못된 크기로 한 번 그렸다 튀는 걸 막는다 */
  const measured = boardWidth > 0

  const wasteTopId = waste.length > 0 ? waste[waste.length - 1] : null
  const wasteKey = sourceKey({ type: 'waste' })
  const isWasteSelected = isSameSource(selection, { type: 'waste' })

  // ── 드래그 앤 드롭 ────────────────────────────────────────
  type DragPayload = { source: MoveSource; key: string; label: string; kind: 'category' | 'word' }
  const { drag, start } = useCardDrag<DragPayload>({
    onDrop: (payload, dropKey) => {
      // 판 밖이나 빈 공간에 놓으면 아무 일도 없다 (제자리)
      if (!dropKey) return
      const target = parseDropKey(dropKey)
      if (!target) return
      onDropCard(payload.source, target, dropKey)
    },
    // 임계값을 넘지 않았으면 기존 탭 조작으로 처리한다 (탭·드래그 둘 다 쓸 수 있다)
    onTap: payload => onTapCard(payload.source, payload.key),
  })
  const draggingKey = drag?.active ? drag.payload.key : null

  return (
    <div className="flex flex-col gap-4">
      {/* 턴 카운터(좌상단) + 스톡·웨이스트(우상단) */}
      <div className="flex items-start justify-between gap-3">
        {/* 턴·시간은 가로로 나란히 — 라벨과 값을 세로로 쌓으면 자리만 먹고 읽기 불편하다 */}
        <div className="flex items-center gap-2">
          <div className="flex items-baseline gap-1.5 rounded-xl bg-gray-900 px-3 py-2 text-white">
            <span className="text-[11px] font-semibold text-gray-300">{t('turnsLabel')}</span>
            <span className="text-lg font-bold leading-none" aria-live="polite">
              {state.turns}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5 rounded-xl bg-gray-100 px-3 py-2 text-gray-700">
            <span className="text-[11px] font-semibold text-gray-500">{t('timeLabel')}</span>
            <span className="text-lg font-bold leading-none tabular-nums">{formatElapsed(elapsedMs)}</span>
          </div>
        </div>

        <div className="flex items-end gap-2">
          {/* 웨이스트: 맨 위 1장만 옮길 수 있다 */}
          <div
            className="relative"
            style={{ width: finalCardWidth, height: topBarCardHeight }}
            data-testid="ws-waste"
          >
            {wasteTopId === null ? (
              <div className={EMPTY_SLOT_CLASS} style={{ height: topBarCardHeight }}>
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
                height={topBarCardHeight}
                dragging={draggingKey === wasteKey}
                onPointerDown={
                  locked
                    ? undefined
                    : start({
                        source: { type: 'waste' },
                        key: wasteKey,
                        label: deck.cards[wasteTopId].label,
                        kind: deck.cards[wasteTopId].kind,
                      })
                }
              />
            )}
          </div>

          {/* 스톡: 열기 = 1턴 */}
          <button
            type="button"
            onClick={onDraw}
            disabled={locked || !canDraw}
            data-testid="ws-stock"
            aria-label={t('drawAria', { count: stock.length })}
            style={{ width: finalCardWidth, height: topBarCardHeight }}
            className={`flex flex-col items-center justify-center gap-0.5 rounded-lg border text-white transition ${
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
      <div
        ref={boardRef}
        className="overflow-x-auto pb-1"
        style={{ visibility: measured ? 'visible' : 'hidden' }}
      >
        {/* 두 격자를 같은 폭의 래퍼 안에 넣어야 열이 세로로 맞물린다 (각자 중앙정렬하면 어긋난다) */}
        <div className="mx-auto flex w-fit flex-col gap-3">
        {/* 기초 슬롯 */}
        <div>
          <div className="mb-1.5 text-[11px] font-semibold text-gray-500">{t('foundationLabel')}</div>
          <div
            className="grid"
            style={{
              gap: COLUMN_GAP,
              gridTemplateColumns: `repeat(${foundations.length}, ${finalCardWidth}px)`,
            }}
          >
          {foundations.map((slot, index) => {
            const key = targetKey({ type: 'foundation', slot: index })
            const isTarget = highlightKeys.has(key)
            const target: MoveTarget = { type: 'foundation', slot: index }
            return (
              <div
                key={key}
                data-testid={`ws-foundation-${index}`}
                data-drop-key={key}
                className={`relative rounded-lg ${isTarget ? TARGET_RING_CLASS : ''}`}
                style={{ height: cardHeight }}
              >
                {slot.categoryId === null ? (
                  <button
                    type="button"
                    onClick={() => onTapTarget(target, key)}
                    disabled={locked || !isTarget}
                    aria-label={t('emptyFoundationAria')}
                    className={`${EMPTY_SLOT_CLASS} ${isTarget ? 'cursor-pointer' : 'cursor-default'}`}
                    style={{ height: cardHeight }}
                  >
                    {/* 참고 게임처럼 "무엇이 올라가는 자리인지"를 왕관 실루엣으로 알린다 */}
                    <Crown className="h-5 w-5 text-gray-300" aria-hidden="true" />
                  </button>
                ) : (
                  <SolitaireCardView
                    kind="category"
                    label={deck.categoryNames[slot.categoryId]}
                    progress={{ done: slot.wordIds.length, total: deck.categoryWordCounts[slot.categoryId] }}
                    disabled={locked || !isTarget}
                    rejected={rejectedKey === key}
                    height={cardHeight}
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
          className="grid items-start"
          style={{
            gap: COLUMN_GAP,
            gridTemplateColumns: `repeat(${tableau.length}, ${finalCardWidth}px)`,
          }}
        >
          {tableau.map((column, columnIndex) => {
            const key = targetKey({ type: 'tableau', column: columnIndex })
            const isTarget = highlightKeys.has(key)
            const target: MoveTarget = { type: 'tableau', column: columnIndex }
            const offsets = cardTopOffsets(column.cardIds.length, column.faceUpFrom, cardHeight)

            return (
              <div
                key={key}
                data-testid={`ws-col-${columnIndex}`}
                data-drop-key={key}
                className={`relative rounded-lg ${isTarget ? TARGET_RING_CLASS : ''}`}
                style={{ height: columnHeight(column.cardIds.length, column.faceUpFrom, cardHeight) }}
              >
                {column.cardIds.length === 0 && (
                  <button
                    type="button"
                    onClick={() => onTapTarget(target, key)}
                    disabled={locked || !isTarget}
                    aria-label={t('emptyColumnAria', { column: columnIndex + 1 })}
                    className={`${EMPTY_SLOT_CLASS} absolute inset-x-0 top-0`}
                    style={{ height: cardHeight }}
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
                      // 맨 아래 카드는 가려지지 않으니 이름을 가운데 크게 보여준다 (참고 게임과 동일)
                      alignTop={index < column.cardIds.length - 1}
                      height={cardHeight}
                      ariaLabel={
                        faceDown
                          ? t('faceDownAria')
                          : card.kind === 'category'
                            ? t('categoryCardAria', { name: card.label })
                            : t('wordCardAria', { label: card.label })
                      }
                      onClick={actsAsTarget ? () => onTapTarget(target, key) : undefined}
                      dragging={draggingKey === cardKey}
                      onPointerDown={
                        locked || faceDown || actsAsTarget
                          ? undefined
                          : start({ source, key: cardKey, label: card.label, kind: card.kind })
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

      {/* 드래그 중 커서를 따라다니는 카드 — 포인터 이벤트를 받지 않아야 그 아래 목적지를 찾을 수 있다 */}
      {drag?.active && (
        <div
          className="pointer-events-none fixed z-[100] rotate-2 opacity-90 drop-shadow-2xl"
          style={{
            left: drag.x - drag.offsetX,
            top: drag.y - drag.offsetY,
            width: finalCardWidth,
            height: cardHeight,
          }}
          aria-hidden="true"
        >
          <div className="relative h-full w-full">
            <SolitaireCardView
              kind={drag.payload.kind}
              label={drag.payload.label}
              height={cardHeight}
              ariaLabel=""
            />
          </div>
        </div>
      )}
    </div>
  )
}
