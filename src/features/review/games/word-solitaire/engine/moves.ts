/**
 * @file moves.ts
 * @description 합법 이동 열거·적용 (계획서 §2 이동 규칙 1~8). 이동 1건 = 1턴, 자동 오픈·완성은 0턴
 * @module features/review/games/word-solitaire/engine
 * @dependencies features/review/games/word-solitaire/engine/{types,state,random}
 */
import type {
  FoundationSlot,
  MoveSource,
  SolitaireDeck,
  SolitaireMove,
  SolitaireState,
  TableauColumn,
} from './types'
import { mixSeed, mulberry32, shuffled } from './random.ts'

/** 이동 단위 — 한 번에 집어 올리는 카드 묶음(바닥→위 순서) */
interface MoveUnit {
  cardIds: number[]
  from: MoveSource
  /** 이 단위를 빼면 원래 열이 비는가 (빈 열 → 빈 열 이동을 걸러내는 데 쓴다) */
  leavesSourceEmpty: boolean
}

const cardOf = (deck: SolitaireDeck, id: number) => deck.cards[id]

/**
 * 기초 슬롯에 이 묶음을 놓을 수 있는가.
 * - 카테고리 카드는 **빈 슬롯에만**, 그 위에 얹혀 있던 같은 카테고리 단어를 데리고 간다(규칙 1)
 * - 단어 카드는 **1장씩만**, 그 카테고리가 올라와 있는 슬롯에 (규칙 2, 순서 무관)
 */
const canPlaceOnFoundation = (deck: SolitaireDeck, slot: FoundationSlot, cardIds: number[]): boolean => {
  const bottom = cardOf(deck, cardIds[0])
  if (bottom.kind === 'category') {
    if (slot.categoryId !== null) return false
    return cardIds.slice(1).every((id) => {
      const card = cardOf(deck, id)
      return card.kind === 'word' && card.categoryId === bottom.categoryId
    })
  }
  if (cardIds.length !== 1) return false
  return slot.categoryId === bottom.categoryId
}

/**
 * 테이블로 열에 이 묶음을 놓을 수 있는가.
 * - 빈 열: 아무 카드나 (계획서 §2 확정 세부 규칙)
 * - 맨 위가 카테고리 카드면 그 열은 **잠김** (규칙 4)
 * - 그 외: 맨 위 카드와 같은 카테고리의 단어만 (규칙 3)
 */
const canPlaceOnColumn = (deck: SolitaireDeck, column: TableauColumn, cardIds: number[]): boolean => {
  if (column.cardIds.length === 0) return true
  const top = cardOf(deck, column.cardIds[column.cardIds.length - 1])
  if (top.kind === 'category') return false
  const bottom = cardOf(deck, cardIds[0])
  if (bottom.kind !== 'word') return false
  return bottom.categoryId === top.categoryId
}

/**
 * 한 열에서 집을 수 있는 묶음들.
 * 1) 맨 위 1장 (항상 앞면)
 * 2) 앞면 구간 안의 카테고리 카드 + 그 위에 쌓인 같은 카테고리 단어 전부 (규칙 1)
 *
 * 단어 여러 장을 한 번에 옮기는 건 **허용하지 않는다** — 계획서가 동반 이동을 규칙 1(카테고리 카드)에만
 * 부여했고, 탭 투 무브 UI와 턴 계산을 엔진과 일치시키기 위해서다.
 */
const columnUnits = (deck: SolitaireDeck, column: TableauColumn, columnIndex: number): MoveUnit[] => {
  const { cardIds, faceUpFrom } = column
  if (cardIds.length === 0) return []
  const topIndex = cardIds.length - 1
  const units: MoveUnit[] = [
    {
      cardIds: [cardIds[topIndex]],
      from: { type: 'tableau', column: columnIndex, index: topIndex },
      leavesSourceEmpty: topIndex === 0,
    },
  ]

  for (let i = faceUpFrom; i < topIndex; i += 1) {
    const anchor = cardOf(deck, cardIds[i])
    if (anchor.kind !== 'category') continue
    const above = cardIds.slice(i + 1)
    const carriable = above.every((id) => {
      const card = cardOf(deck, id)
      return card.kind === 'word' && card.categoryId === anchor.categoryId
    })
    if (!carriable) continue
    units.push({
      cardIds: cardIds.slice(i),
      from: { type: 'tableau', column: columnIndex, index: i },
      leavesSourceEmpty: i === 0,
    })
    // 앞면 구간에 조건을 만족하는 카테고리 카드는 최대 1장이다 (그 위는 전부 단어여야 하므로).
    break
  }

  return units
}

/**
 * 지금 둘 수 있는 모든 이동.
 *
 * 서로 구분되지 않는 목적지(빈 기초 슬롯끼리, 빈 테이블로 열끼리)는 **첫 번째 것만** 내보내
 * 탐색 폭과 UI 선택지를 동시에 줄인다 — 결과 상태가 완전히 동일하기 때문이다.
 */
export const listLegalMoves = (state: SolitaireState): SolitaireMove[] => {
  const { deck, foundations, tableau, stock, waste } = state
  const moves: SolitaireMove[] = []

  // 스톡 열기 (규칙 5). 스톡이 비면 웨이스트를 셔플해 재활용하며, 재활용+오픈을 합쳐 1턴으로 센다.
  // 웨이스트가 1장 이하일 때의 재활용은 국면이 그대로라 제외한다(무한 반복 방지).
  if (stock.length > 0 || waste.length > 1) moves.push({ kind: 'draw' })

  const firstEmptyFoundation = foundations.findIndex((slot) => slot.categoryId === null)
  const firstEmptyColumn = tableau.findIndex((column) => column.cardIds.length === 0)

  const units: MoveUnit[] = []
  if (waste.length > 0) {
    units.push({
      cardIds: [waste[waste.length - 1]],
      from: { type: 'waste' },
      leavesSourceEmpty: false,
    })
  }
  tableau.forEach((column, index) => {
    units.push(...columnUnits(deck, column, index))
  })

  for (const unit of units) {
    for (let slotIndex = 0; slotIndex < foundations.length; slotIndex += 1) {
      const slot = foundations[slotIndex]
      // 빈 슬롯은 전부 동치 — 첫 번째만 제안한다.
      if (slot.categoryId === null && slotIndex !== firstEmptyFoundation) continue
      if (!canPlaceOnFoundation(deck, slot, unit.cardIds)) continue
      moves.push({ kind: 'move', from: unit.from, to: { type: 'foundation', slot: slotIndex } })
    }

    for (let columnIndex = 0; columnIndex < tableau.length; columnIndex += 1) {
      if (unit.from.type === 'tableau' && unit.from.column === columnIndex) continue
      const column = tableau[columnIndex]
      if (column.cardIds.length === 0) {
        if (columnIndex !== firstEmptyColumn) continue
        // 빈 열 → 빈 열 이동은 열 이름만 바뀌는 무의미한 턴이다.
        if (unit.leavesSourceEmpty) continue
      }
      if (!canPlaceOnColumn(deck, column, unit.cardIds)) continue
      moves.push({ kind: 'move', from: unit.from, to: { type: 'tableau', column: columnIndex } })
    }
  }

  return moves
}

/** 스톡에서 1장 열기. 스톡이 비었으면 웨이스트를 시드 결정론적으로 셔플해 되돌린 뒤 연다. */
const applyDraw = (state: SolitaireState): SolitaireState => {
  let stock = state.stock
  let waste = state.waste
  let recycles = state.recycles

  if (stock.length === 0) {
    if (waste.length <= 1) throw new Error('applyMove: 열 수 있는 카드가 없습니다')
    recycles += 1
    // 셔플이지만 시드에서 파생되므로 같은 플레이는 항상 같은 결과 — 리더보드 공정성 유지.
    stock = shuffled(waste, mulberry32(mixSeed(state.seed, recycles)))
    waste = []
  }

  const drawn = stock[stock.length - 1]
  return {
    ...state,
    stock: stock.slice(0, -1),
    waste: waste.concat(drawn),
    recycles,
    turns: state.turns + 1,
  }
}

/** 카테고리가 다 모였으면 묶음을 제거하고 슬롯을 비운다 (규칙 7, 0턴). */
const settleFoundation = (
  deck: SolitaireDeck,
  slot: FoundationSlot,
): { slot: FoundationSlot; completedCategoryId: number | null } => {
  if (slot.categoryId === null) return { slot, completedCategoryId: null }
  if (slot.wordIds.length < deck.categoryWordCounts[slot.categoryId]) {
    return { slot, completedCategoryId: null }
  }
  return { slot: { categoryId: null, wordIds: [] }, completedCategoryId: slot.categoryId }
}

/**
 * 이동을 적용해 **새 상태**를 돌려준다(불변). 불법 이동은 예외를 던진다.
 * 이동 1건 = 1턴. 자동 오픈(규칙 6)·자동 완성(규칙 7)은 턴을 소모하지 않는다.
 */
export const applyMove = (state: SolitaireState, move: SolitaireMove): SolitaireState => {
  if (move.kind === 'draw') return applyDraw(state)

  const { deck } = state
  let cardIds: number[]
  let waste = state.waste
  let tableau = state.tableau

  if (move.from.type === 'waste') {
    if (waste.length === 0) throw new Error('applyMove: 웨이스트가 비어 있습니다')
    cardIds = [waste[waste.length - 1]]
    waste = waste.slice(0, -1)
  } else {
    const { column: columnIndex, index } = move.from
    const column = state.tableau[columnIndex]
    if (!column) throw new Error(`applyMove: 존재하지 않는 열 (${columnIndex})`)
    if (index < 0 || index >= column.cardIds.length) {
      throw new Error(`applyMove: 열 ${columnIndex} 의 잘못된 위치 (${index})`)
    }
    if (index < column.faceUpFrom) throw new Error('applyMove: 뒷면 카드는 집을 수 없습니다')
    const legal = columnUnits(deck, column, columnIndex).some(
      (unit) => unit.from.type === 'tableau' && unit.from.index === index,
    )
    if (!legal) throw new Error('applyMove: 함께 옮길 수 없는 묶음입니다')

    cardIds = column.cardIds.slice(index)
    const rest = column.cardIds.slice(0, index)
    // 자동 오픈(규칙 6): 새 맨 위가 덮여 있으면 즉시 뒤집는다 — 턴 소모 없음.
    const faceUpFrom = rest.length === 0 ? 0 : Math.min(column.faceUpFrom, rest.length - 1)
    tableau = tableau.map((col, i) => (i === columnIndex ? { cardIds: rest, faceUpFrom } : col))
  }

  let foundations = state.foundations
  let completed = state.completed

  if (move.to.type === 'foundation') {
    const slotIndex = move.to.slot
    const slot = foundations[slotIndex]
    if (!slot) throw new Error(`applyMove: 존재하지 않는 기초 슬롯 (${slotIndex})`)
    if (!canPlaceOnFoundation(deck, slot, cardIds)) throw new Error('applyMove: 기초에 놓을 수 없는 카드입니다')

    const bottom = cardOf(deck, cardIds[0])
    const nextSlot: FoundationSlot =
      bottom.kind === 'category'
        ? { categoryId: bottom.categoryId, wordIds: cardIds.slice(1) }
        : { categoryId: slot.categoryId, wordIds: slot.wordIds.concat(cardIds[0]) }

    const settled = settleFoundation(deck, nextSlot)
    foundations = foundations.map((existing, i) => (i === slotIndex ? settled.slot : existing))
    if (settled.completedCategoryId !== null) {
      completed = completed.concat(settled.completedCategoryId).sort((a, b) => a - b)
    }
  } else {
    const columnIndex = move.to.column
    const column = tableau[columnIndex]
    if (!column) throw new Error(`applyMove: 존재하지 않는 열 (${columnIndex})`)
    if (move.from.type === 'tableau' && move.from.column === columnIndex) {
      throw new Error('applyMove: 같은 열로는 옮길 수 없습니다')
    }
    if (!canPlaceOnColumn(deck, column, cardIds)) throw new Error('applyMove: 이 열에는 놓을 수 없습니다')
    const wasEmpty = column.cardIds.length === 0
    tableau = tableau.map((col, i) =>
      i === columnIndex
        ? { cardIds: col.cardIds.concat(cardIds), faceUpFrom: wasEmpty ? 0 : col.faceUpFrom }
        : col,
    )
  }

  return { ...state, foundations, tableau, waste, completed, turns: state.turns + 1 }
}

/** 이동을 사람이 읽을 수 있는 한 줄로 (테스트·디버깅용) */
export const describeMove = (state: SolitaireState, move: SolitaireMove): string => {
  if (move.kind === 'draw') return 'draw'
  const source =
    move.from.type === 'waste'
      ? 'waste'
      : `T${move.from.column}[${move.from.index}]`
  const target = move.to.type === 'foundation' ? `F${move.to.slot}` : `T${move.to.column}`
  const cardIds =
    move.from.type === 'waste'
      ? state.waste.slice(-1)
      : state.tableau[move.from.column].cardIds.slice(move.from.index)
  const labels = cardIds.map((id) => state.deck.cards[id].label).join('+')
  return `${source}→${target} (${labels})`
}
