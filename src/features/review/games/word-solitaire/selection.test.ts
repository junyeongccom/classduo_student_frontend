/**
 * @file selection.test.ts
 * @description 탭 투 무브 선택 전이·되돌리기·일일 시드의 순수 로직 회귀 테스트
 * @module features/review/games/word-solitaire
 * @dependencies node:test, engine, selection, history, seed
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import type { FoundationSlot, SolitaireState, TableauColumn } from './engine/index.ts'
import { buildDeck, listLegalMoves } from './engine/index.ts'
import {
  canDraw,
  canonicalTarget,
  hasCardMove,
  highlightedTargetKeys,
  isSameSource,
  movesFromSource,
  resolveTarget,
  selectSource,
  selectableSourceKeys,
  sourceKey,
  targetKey,
} from './selection.ts'
import { canUndo, emptyHistory, pushHistory, undo } from './history.ts'
import { dailySalt, dealSeedFor } from './seed.ts'
import { MAX_CARD_WIDTH, MIN_CARD_WIDTH, cardHeightFor, cardTopOffsets, cardWidthFor, columnHeight } from './uiConstants.ts'

// 카테고리 3개: A(a1,a2) / B(b1,b2,b3) / C(c1,c2)
const DECK = buildDeck({
  categories: [
    { name: 'A', words: ['a1', 'a2'] },
    { name: 'B', words: ['b1', 'b2', 'b3'] },
    { name: 'C', words: ['c1', 'c2'] },
  ],
})

const id = (label: string): number => {
  const found = DECK.cards.find(card => card.label === label)
  if (!found) throw new Error(`테스트 픽스처에 없는 카드: ${label}`)
  return found.id
}
const ids = (...labels: string[]): number[] => labels.map(id)

interface StateSpec {
  foundations?: FoundationSlot[]
  tableau?: TableauColumn[]
  stock?: number[]
  waste?: number[]
}

const makeState = (spec: StateSpec): SolitaireState => ({
  deck: DECK,
  foundations: spec.foundations ?? [
    { categoryId: null, wordIds: [] },
    { categoryId: null, wordIds: [] },
  ],
  tableau: spec.tableau ?? [{ cardIds: [], faceUpFrom: 0 }, { cardIds: [], faceUpFrom: 0 }],
  stock: spec.stock ?? [],
  waste: spec.waste ?? [],
  completed: [],
  turns: 0,
  seed: 1234,
  recycles: 0,
})

const col = (cardIds: number[], faceUpFrom = Math.max(cardIds.length - 1, 0)): TableauColumn => ({
  cardIds,
  faceUpFrom,
})

// ─────────────────────── 선택 전이 ───────────────────────

test('목적지가 하나뿐이면 첫 탭에 곧바로 이동이 확정된다', () => {
  // 웨이스트의 A(카테고리)는 빈 기초 슬롯(대표 1곳)으로만 갈 수 있다 — 빈 열은 웨이스트에서도 갈 수 있으므로
  // 테이블로를 채워 목적지를 1개로 좁힌다.
  const state = makeState({
    waste: ids('A'),
    tableau: [col(ids('b1')), col(ids('c1'))],
  })
  const moves = listLegalMoves(state)
  const source = { type: 'waste' } as const
  assert.equal(movesFromSource(moves, source).length, 1)

  const result = selectSource(null, source, moves)
  assert.equal(result.selection, null)
  assert.equal(result.rejected, false)
  assert.deepEqual(result.move, {
    kind: 'move',
    from: { type: 'waste' },
    to: { type: 'foundation', slot: 0 },
  })
})

test('목적지가 둘 이상이면 선택 상태로 남고 목적지 탭을 기다린다', () => {
  // 기초 A 위에 a1 을 얹을 수도, 테이블로 a2 위에 쌓을 수도 있다 → 목적지 2곳
  const state = makeState({
    waste: ids('a1'),
    foundations: [
      { categoryId: 0, wordIds: [] },
      { categoryId: 1, wordIds: [] },
    ],
    tableau: [col(ids('a2')), col(ids('c1'))],
  })
  const moves = listLegalMoves(state)
  const source = { type: 'waste' } as const
  assert.ok(movesFromSource(moves, source).length >= 2)

  const result = selectSource(null, source, moves)
  assert.deepEqual(result.selection, source)
  assert.equal(result.move, null)
  assert.equal(result.rejected, false)
})

test('같은 카드를 다시 탭하면 선택이 해제된다', () => {
  const state = makeState({
    waste: ids('a1'),
    foundations: [
      { categoryId: 0, wordIds: [] },
      { categoryId: 1, wordIds: [] },
    ],
    tableau: [col(ids('a2')), col(ids('c1'))],
  })
  const moves = listLegalMoves(state)
  const source = { type: 'waste' } as const
  const result = selectSource(source, source, moves)
  assert.equal(result.selection, null)
  assert.equal(result.move, null)
  assert.equal(result.rejected, false)
})

test('갈 곳이 없는 카드는 선택되지 않고 rejected 로 알린다', () => {
  // C 카드 하나만 열려 있고 기초 슬롯은 전부 다른 카테고리로 차 있으며 빈 열도 없다
  const state = makeState({
    foundations: [
      { categoryId: 0, wordIds: [] },
      { categoryId: 1, wordIds: [] },
    ],
    tableau: [col(ids('a1')), col(ids('b1'))],
    waste: ids('c1'),
  })
  const moves = listLegalMoves(state)
  const source = { type: 'waste' } as const
  assert.equal(movesFromSource(moves, source).length, 0)

  const result = selectSource(null, source, moves)
  assert.equal(result.selection, null)
  assert.equal(result.rejected, true)
})

test('선택 없이 목적지를 탭하면 아무 일도 없다', () => {
  const state = makeState({ waste: ids('A') })
  assert.equal(resolveTarget(state, null, { type: 'foundation', slot: 0 }, listLegalMoves(state)), null)
})

test('선택된 카드가 갈 수 없는 목적지를 탭하면 null', () => {
  const state = makeState({
    waste: ids('a1'),
    foundations: [
      { categoryId: 0, wordIds: [] },
      { categoryId: 1, wordIds: [] },
    ],
    tableau: [col(ids('a2')), col(ids('c1'))],
  })
  const moves = listLegalMoves(state)
  // a1 은 B 슬롯(slot 1)에도, C 가 놓인 열에도 갈 수 없다
  assert.equal(resolveTarget(state, { type: 'waste' }, { type: 'foundation', slot: 1 }, moves), null)
  assert.equal(resolveTarget(state, { type: 'waste' }, { type: 'tableau', column: 1 }, moves), null)
})

test('테이블로 카테고리 묶음도 그 위치(index)로 선택된다', () => {
  // 열 0: [A, a1] 전부 앞면 → A 를 집으면 a1 이 따라온다
  const state = makeState({
    tableau: [col(ids('A', 'a1'), 0), col(ids('c1'))],
  })
  const moves = listLegalMoves(state)
  const bundle = { type: 'tableau', column: 0, index: 0 } as const
  const candidates = movesFromSource(moves, bundle)
  assert.ok(candidates.length >= 1)
  assert.ok(candidates.some(move => move.to.type === 'foundation'))
  assert.equal(sourceKey(bundle), 'tableau:0:0')
})

// ─────────────────────── 목적지 동치(빈 칸) ───────────────────────

test('엔진이 대표 빈 칸만 제안해도, 어느 빈 칸을 탭하든 그 이동으로 접힌다', () => {
  const state = makeState({
    waste: ids('A'),
    tableau: [col(ids('b1')), col(ids('c1'))],
  })
  const moves = listLegalMoves(state)
  // 엔진은 slot 0 만 제안한다
  assert.equal(
    moves.filter(m => m.kind === 'move' && m.to.type === 'foundation' && m.to.slot === 1).length,
    0,
  )
  assert.deepEqual(canonicalTarget(state, { type: 'foundation', slot: 1 }), { type: 'foundation', slot: 0 })
  assert.deepEqual(resolveTarget(state, { type: 'waste' }, { type: 'foundation', slot: 1 }, moves), {
    kind: 'move',
    from: { type: 'waste' },
    to: { type: 'foundation', slot: 0 },
  })
})

test('빈 칸이 후보면 비어 있는 칸 전부가 하이라이트된다', () => {
  const state = makeState({
    waste: ids('A'),
    tableau: [col(ids('b1')), col(ids('c1'))],
  })
  const moves = listLegalMoves(state)
  const candidates = movesFromSource(moves, { type: 'waste' })
  const keys = highlightedTargetKeys(state, candidates)
  assert.ok(keys.has('foundation:0'))
  assert.ok(keys.has('foundation:1'))
})

test('차 있는 칸은 동치 확장 대상이 아니다', () => {
  const state = makeState({
    foundations: [
      { categoryId: 0, wordIds: [] },
      { categoryId: null, wordIds: [] },
    ],
    tableau: [col(ids('b1')), col(ids('c1'))],
    waste: ids('a1'),
  })
  const moves = listLegalMoves(state)
  const keys = highlightedTargetKeys(state, movesFromSource(moves, { type: 'waste' }))
  assert.ok(keys.has('foundation:0'))
  assert.equal(keys.has('foundation:1'), false)
  assert.deepEqual(canonicalTarget(state, { type: 'foundation', slot: 0 }), { type: 'foundation', slot: 0 })
})

// ─────────────────────── 키·헬퍼 ───────────────────────

test('출발지·목적지 키와 동치 비교', () => {
  assert.equal(targetKey({ type: 'foundation', slot: 2 }), 'foundation:2')
  assert.equal(targetKey({ type: 'tableau', column: 3 }), 'tableau:3')
  assert.equal(sourceKey({ type: 'waste' }), 'waste')
  assert.ok(isSameSource({ type: 'waste' }, { type: 'waste' }))
  assert.ok(isSameSource({ type: 'tableau', column: 1, index: 2 }, { type: 'tableau', column: 1, index: 2 }))
  assert.equal(isSameSource({ type: 'tableau', column: 1, index: 2 }, { type: 'tableau', column: 1, index: 3 }), false)
  assert.equal(isSameSource(null, { type: 'waste' }), false)
})

test('집을 수 있는 카드 키 집합에는 스톡 열기가 섞이지 않는다', () => {
  const state = makeState({
    waste: ids('A'),
    stock: ids('b1'),
    tableau: [col(ids('b2')), col(ids('c1'))],
  })
  const moves = listLegalMoves(state)
  assert.ok(canDraw(moves))
  assert.ok(hasCardMove(moves))
  const keys = selectableSourceKeys(moves)
  assert.ok(keys.has('waste'))
  assert.equal(keys.has('draw'), false)
})

test('막힌 판은 카드 이동이 하나도 없다', () => {
  // 기초는 C·B 로 차 있고, 테이블로는 [A](카테고리 카드 = 열 잠김) 와 [a1](갈 슬롯 없음) 뿐이다
  const state = makeState({
    foundations: [
      { categoryId: 2, wordIds: [] },
      { categoryId: 1, wordIds: [] },
    ],
    tableau: [col(ids('A')), col(ids('a1'))],
  })
  const moves = listLegalMoves(state)
  assert.equal(canDraw(moves), false)
  assert.equal(hasCardMove(moves), false)
})

// ─────────────────────── 되돌리기 ───────────────────────

test('Undo 는 직전 상태를 복원하되 턴은 1 늘어난다', () => {
  const before = makeState({ waste: ids('A'), tableau: [col(ids('b1')), col(ids('c1'))] })
  const after: SolitaireState = { ...before, waste: [], turns: 1 }

  const history = pushHistory(emptyHistory(), before)
  assert.ok(canUndo(history))

  const result = undo(history, after)
  assert.ok(result)
  assert.deepEqual(result.state.waste, before.waste)
  assert.equal(result.state.turns, 2)
  assert.equal(canUndo(result.history), false)
})

test('되돌릴 것이 없으면 undo 는 null', () => {
  const state = makeState({})
  assert.equal(undo(emptyHistory(), state), null)
})

test('되돌리기 스택은 상한을 넘지 않는다', () => {
  const state = makeState({})
  let history = emptyHistory()
  for (let i = 0; i < 320; i += 1) history = pushHistory(history, { ...state, turns: i })
  assert.equal(history.past.length, 300)
  // 오래된 것부터 버려지므로 가장 최근 턴이 맨 뒤에 남는다
  assert.equal(history.past[history.past.length - 1].turns, 319)
})

// ─────────────────────── 일일 시드 ───────────────────────

test('일일 소금은 Asia/Seoul 기준 YYYY-MM-DD 다', () => {
  // 2026-08-16T20:00Z = 서울 2026-08-17 05:00
  assert.equal(dailySalt(new Date('2026-08-16T20:00:00Z')), '2026-08-17')
  assert.equal(dailySalt(new Date('2026-08-16T10:00:00Z')), '2026-08-16')
  assert.throws(() => dailySalt(new Date('nope')), /유효하지 않은/)
})

test('같은 회차·난이도·날짜면 같은 시드, 다르면 다른 시드', () => {
  const day = new Date('2026-08-16T10:00:00Z')
  const a = dealSeedFor('lecture-1', 'normal', day)
  // 서울 기준 같은 날(23:00)이면 시드도 같다
  assert.equal(a, dealSeedFor('lecture-1', 'normal', new Date('2026-08-16T14:00:00Z')))
  assert.notEqual(a, dealSeedFor('lecture-1', 'challenge', day))
  assert.notEqual(a, dealSeedFor('lecture-2', 'normal', day))
  assert.notEqual(a, dealSeedFor('lecture-1', 'normal', new Date('2026-08-17T10:00:00Z')))
})

// ─────────────────────── 보드 겹침 계산 ───────────────────────

const H = 100 // 계산이 눈으로 검산되도록 딱 떨어지는 카드 높이를 쓴다

test('덮인 카드는 촘촘히, 오픈 카드는 넓게 겹친다', () => {
  // 5장 중 앞 3장이 덮이고 index 3부터 앞면
  const offsets = cardTopOffsets(5, 3, H)
  const faceDown = offsets[1]
  const faceUp = offsets[4] - offsets[3]
  assert.deepEqual(offsets, [0, faceDown, faceDown * 2, faceDown * 3, faceDown * 3 + faceUp])
  // 오픈 카드가 더 넓게 벌어져야 라벨이 보인다
  assert.ok(faceUp > faceDown)
  assert.equal(columnHeight(5, 3, H), offsets[4] + H)
})

test('빈 열도 카드 1장 높이를 차지한다', () => {
  assert.deepEqual(cardTopOffsets(0, 0, H), [])
  assert.equal(columnHeight(0, 0, H), H)
  assert.equal(columnHeight(1, 0, H), H)
})

test('카드 폭은 열 수로 화면을 나누되 최소 폭 아래로는 줄지 않는다', () => {
  // 5열 · 컨테이너 500px · 간격 8px → (500 - 32) / 5 = 93
  assert.equal(cardWidthFor(500, 5), 93)
  // 넓은 화면에서는 상한에 걸린다 — 카드가 손바닥만 해지지 않게
  assert.equal(cardWidthFor(2000, 3), MAX_CARD_WIDTH)
  // 8열이 좁은 화면에 들어가면 최소 폭에 걸린다(이 경우 보드가 가로 스크롤된다)
  assert.equal(cardWidthFor(320, 8), MIN_CARD_WIDTH)
  assert.equal(cardWidthFor(0, 0), MIN_CARD_WIDTH)
})

test('카드 높이는 폭에 비례한다 (세로로 긴 카드)', () => {
  assert.ok(cardHeightFor(100) > 100)
})
