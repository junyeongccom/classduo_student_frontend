/**
 * @file selection.ts
 * @description 탭 투 무브 선택 상태 전이 — 합법 이동은 엔진(listLegalMoves)이 준 목록에서만 고른다(규칙 재구현 금지)
 * @module features/review/games/word-solitaire
 * @dependencies features/review/games/word-solitaire/engine
 */
import type { MoveSource, MoveTarget, SolitaireMove, SolitaireState } from './engine/index.ts'

/** 선택된 출발지 = 엔진의 이동 출발지와 동일한 형태 */
export type SolitaireSelection = MoveSource

/** 카드 이동(스톡 열기 제외) — 출발지·목적지가 있는 이동만 */
export type SolitaireCardMove = Extract<SolitaireMove, { kind: 'move' }>

/** 카드 탭 결과 — 선택만 바뀔 수도, 곧바로 이동이 확정될 수도 있다 */
export interface SelectionResult {
  /** 다음 선택 상태 (null = 선택 없음) */
  selection: SolitaireSelection | null
  /** 즉시 실행할 이동 (목적지가 하나뿐이라 곧바로 확정된 경우) */
  move: SolitaireMove | null
  /** 이동 가능한 목적지가 하나도 없어 탭이 무시된 경우 */
  rejected: boolean
}

/** 출발지 동치 비교 (웨이스트는 1개뿐, 테이블로는 열+위치가 같아야 같다) */
export const isSameSource = (a: MoveSource | null, b: MoveSource | null): boolean => {
  if (!a || !b) return false
  if (a.type === 'waste') return b.type === 'waste'
  return b.type === 'tableau' && a.column === b.column && a.index === b.index
}

/** 목적지 동치 비교 */
export const isSameTarget = (a: MoveTarget, b: MoveTarget): boolean =>
  a.type === 'foundation'
    ? b.type === 'foundation' && a.slot === b.slot
    : b.type === 'tableau' && a.column === b.column

/** React key·Set 용 목적지 문자열 키 */
export const targetKey = (target: MoveTarget): string =>
  target.type === 'foundation' ? `foundation:${target.slot}` : `tableau:${target.column}`

/** React key·Set 용 출발지 문자열 키 */
export const sourceKey = (source: MoveSource): string =>
  source.type === 'waste' ? 'waste' : `tableau:${source.column}:${source.index}`

/**
 * `targetKey` 로 만든 문자열을 다시 목적지로 되돌린다.
 * 드래그는 DOM 의 `data-drop-key` 문자열로 목적지를 알아내므로 역변환이 필요하다.
 */
export const parseDropKey = (key: string): MoveTarget | null => {
  const [type, index] = key.split(':')
  const parsed = Number(index)
  if (!Number.isInteger(parsed) || parsed < 0) return null
  if (type === 'foundation') return { type: 'foundation', slot: parsed }
  if (type === 'tableau') return { type: 'tableau', column: parsed }
  return null
}

/** 이 출발지에서 가능한 이동들 (스톡 열기는 출발지가 없으므로 제외된다) */
export const movesFromSource = (moves: readonly SolitaireMove[], source: MoveSource): SolitaireCardMove[] =>
  moves.filter((move): move is SolitaireCardMove => move.kind === 'move' && isSameSource(move.from, source))

/** 지금 집을 수 있는 카드들의 키 집합 — "만질 수 있는 카드" 힌트에 쓴다 */
export const selectableSourceKeys = (moves: readonly SolitaireMove[]): Set<string> => {
  const keys = new Set<string>()
  for (const move of moves) {
    if (move.kind === 'move') keys.add(sourceKey(move.from))
  }
  return keys
}

/**
 * 엔진은 **서로 구분되지 않는 빈 목적지(빈 기초 슬롯끼리·빈 열끼리)를 첫 번째 것만** 제안한다.
 * 화면에는 빈 칸이 여러 개 보이므로, 사용자가 어느 빈 칸을 탭해도 그 대표 목적지로 접어준다.
 */
export const canonicalTarget = (state: SolitaireState, target: MoveTarget): MoveTarget => {
  if (target.type === 'foundation') {
    if (state.foundations[target.slot]?.categoryId !== null) return target
    const first = state.foundations.findIndex(slot => slot.categoryId === null)
    return first === -1 ? target : { type: 'foundation', slot: first }
  }
  if (state.tableau[target.column]?.cardIds.length !== 0) return target
  const first = state.tableau.findIndex(column => column.cardIds.length === 0)
  return first === -1 ? target : { type: 'tableau', column: first }
}

/**
 * 하이라이트할 목적지 키 집합.
 * 대표 빈 칸이 후보에 있으면 **비어 있는 칸 전부**를 켠다 — 결과 상태가 동일하므로 사용자에게는 같은 선택지다.
 */
export const highlightedTargetKeys = (
  state: SolitaireState,
  candidates: readonly SolitaireCardMove[],
): Set<string> => {
  const keys = new Set<string>()
  for (const move of candidates) {
    keys.add(targetKey(move.to))
    if (move.to.type === 'foundation' && state.foundations[move.to.slot]?.categoryId === null) {
      state.foundations.forEach((slot, index) => {
        if (slot.categoryId === null) keys.add(targetKey({ type: 'foundation', slot: index }))
      })
    }
    if (move.to.type === 'tableau' && state.tableau[move.to.column]?.cardIds.length === 0) {
      state.tableau.forEach((column, index) => {
        if (column.cardIds.length === 0) keys.add(targetKey({ type: 'tableau', column: index }))
      })
    }
  }
  return keys
}

/**
 * 카드 집기.
 * - 이미 선택된 카드를 다시 집으면 → 선택 해제
 * - 갈 수 있는 곳이 있으면 선택 상태로 두고 **목적지 지정을 기다린다**
 * - 갈 수 있는 곳이 없으면 선택되지 않고 `rejected` 로 알린다
 *
 * 목적지가 하나뿐이어도 자동으로 옮기지 않는다 — 어디에 놓을지 고르는 게 이 게임이다.
 * (카테고리 카드를 기초 슬롯 대신 다른 열에 잠시 쌓아두는 것도 정당한 수다.)
 */
export const selectSource = (
  current: SolitaireSelection | null,
  source: MoveSource,
  legalMoves: readonly SolitaireMove[],
): SelectionResult => {
  if (isSameSource(current, source)) {
    return { selection: null, move: null, rejected: false }
  }

  const candidates = movesFromSource(legalMoves, source)
  if (candidates.length === 0) {
    return { selection: current, move: null, rejected: true }
  }
  return { selection: source, move: null, rejected: false }
}

/**
 * 목적지 탭 처리. 선택이 없거나 그 목적지로 갈 수 없으면 `null`.
 * 빈 칸은 `canonicalTarget` 로 접은 뒤 비교한다.
 */
export const resolveTarget = (
  state: SolitaireState,
  selection: SolitaireSelection | null,
  target: MoveTarget,
  legalMoves: readonly SolitaireMove[],
): SolitaireCardMove | null => {
  if (!selection) return null
  const canonical = canonicalTarget(state, target)
  const match = movesFromSource(legalMoves, selection).find(move => isSameTarget(move.to, canonical))
  if (!match) return null
  // 엔진은 빈 슬롯·빈 열을 "첫 번째 것"으로 모아 제안한다(solver 분기 축소).
  // 하지만 놓는 사람 입장에서는 3번 빈 슬롯에 놓으면 3번에 들어가야 한다 —
  // applyMove 가 슬롯 인덱스를 그대로 검증하므로 사용자가 고른 자리로 바꿔 돌려준다.
  return { ...match, to: target }
}

/** 스톡을 열 수 있는가 (엔진이 draw 를 제안했는지로만 판단) */
export const canDraw = (legalMoves: readonly SolitaireMove[]): boolean =>
  legalMoves.some(move => move.kind === 'draw')

/** 카드 이동이 하나도 없는 상태 — 안내 문구 분기에 쓴다 */
export const hasCardMove = (legalMoves: readonly SolitaireMove[]): boolean =>
  legalMoves.some(move => move.kind === 'move')
