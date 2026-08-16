/**
 * @file moves.test.ts
 * @description 계획서 §2 이동 규칙 1~8 의 합법/불법 케이스 회귀 테스트
 * @module features/review/games/word-solitaire/engine
 * @dependencies node:test, state, moves
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import type { FoundationSlot, SolitaireMove, SolitaireState, TableauColumn } from './types'
import { buildDeck, hashState, isWon } from './state.ts'
import { applyMove, describeMove, listLegalMoves } from './moves.ts'

// 카테고리 3개: A(a1,a2) / B(b1,b2,b3) / C(c1,c2)
// 카드 id — 0:A 1:B 2:C 3:a1 4:a2 5:b1 6:b2 7:b3 8:c1 9:c2
const DECK = buildDeck({
  categories: [
    { name: 'A', words: ['a1', 'a2'] },
    { name: 'B', words: ['b1', 'b2', 'b3'] },
    { name: 'C', words: ['c1', 'c2'] },
  ],
})

/** 라벨 → 카드 id */
const id = (label: string): number => {
  const found = DECK.cards.find((card) => card.label === label)
  if (!found) throw new Error(`테스트 픽스처에 없는 카드: ${label}`)
  return found.id
}
const ids = (...labels: string[]): number[] => labels.map(id)

interface StateSpec {
  foundations?: FoundationSlot[]
  tableau?: TableauColumn[]
  stock?: number[]
  waste?: number[]
  completed?: number[]
  seed?: number
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
  completed: spec.completed ?? [],
  turns: 0,
  seed: spec.seed ?? 1234,
  recycles: 0,
})

const col = (cardIds: number[], faceUpFrom = Math.max(cardIds.length - 1, 0)): TableauColumn => ({
  cardIds,
  faceUpFrom,
})

const hasMove = (state: SolitaireState, move: SolitaireMove): boolean =>
  listLegalMoves(state).some((candidate) => JSON.stringify(candidate) === JSON.stringify(move))

// ─────────────────────── 규칙 1·2: 기초 슬롯 ───────────────────────

test('규칙 1: 빈 기초 슬롯에는 카테고리 카드만 놓을 수 있다', () => {
  const state = makeState({ waste: ids('A') })
  assert.ok(hasMove(state, { kind: 'move', from: { type: 'waste' }, to: { type: 'foundation', slot: 0 } }))

  const wordOnly = makeState({ waste: ids('a1') })
  assert.equal(
    hasMove(wordOnly, { kind: 'move', from: { type: 'waste' }, to: { type: 'foundation', slot: 0 } }),
    false,
  )
  assert.throws(
    () => applyMove(wordOnly, { kind: 'move', from: { type: 'waste' }, to: { type: 'foundation', slot: 0 } }),
    /기초에 놓을 수 없는/,
  )
})

test('규칙 2: 기초의 카테고리 위에는 그 카테고리 단어만, 순서 무관', () => {
  const state = makeState({
    foundations: [{ categoryId: 1, wordIds: ids('b3') }, { categoryId: null, wordIds: [] }],
    waste: ids('b1'),
  })
  const move: SolitaireMove = { kind: 'move', from: { type: 'waste' }, to: { type: 'foundation', slot: 0 } }
  assert.ok(hasMove(state, move)) // b3 다음에 b1 — 순서를 따지지 않는다
  assert.deepEqual(applyMove(state, move).foundations[0].wordIds.slice().sort(), ids('b1', 'b3').sort())

  const wrongCategory = makeState({
    foundations: [{ categoryId: 1, wordIds: [] }, { categoryId: null, wordIds: [] }],
    waste: ids('a1'),
  })
  assert.equal(hasMove(wrongCategory, move), false)
})

test('규칙 1: 이미 카테고리가 올라온 슬롯에는 다른 카테고리 카드를 놓을 수 없다', () => {
  const state = makeState({
    foundations: [{ categoryId: 1, wordIds: [] }, { categoryId: 2, wordIds: [] }],
    waste: ids('A'),
  })
  assert.deepEqual(
    listLegalMoves(state).filter((move) => move.kind === 'move' && move.to.type === 'foundation'),
    [],
  )
})

// ─────────────────────── 규칙 3·4: 테이블로 ───────────────────────

test('규칙 3: 테이블로에는 열 맨 위와 같은 카테고리의 단어만 쌓인다', () => {
  const state = makeState({ tableau: [col(ids('b1')), col([])], waste: ids('b2') })
  assert.ok(hasMove(state, { kind: 'move', from: { type: 'waste' }, to: { type: 'tableau', column: 0 } }))

  const other = makeState({ tableau: [col(ids('b1')), col([])], waste: ids('a1') })
  assert.equal(
    hasMove(other, { kind: 'move', from: { type: 'waste' }, to: { type: 'tableau', column: 0 } }),
    false,
  )
  assert.throws(
    () => applyMove(other, { kind: 'move', from: { type: 'waste' }, to: { type: 'tableau', column: 0 } }),
    /이 열에는 놓을 수 없습니다/,
  )
})

test('규칙 4: 맨 위가 카테고리 카드인 열은 잠긴다 (같은 카테고리 단어도 못 올린다)', () => {
  const state = makeState({ tableau: [col(ids('B')), col([])], waste: ids('b1') })
  assert.equal(
    hasMove(state, { kind: 'move', from: { type: 'waste' }, to: { type: 'tableau', column: 0 } }),
    false,
  )
})

test('빈 열에는 아무 카드나 놓을 수 있다 (카테고리 카드 포함)', () => {
  const state = makeState({ tableau: [col(ids('b1', 'b2')), col([])], waste: ids('C') })
  assert.ok(hasMove(state, { kind: 'move', from: { type: 'waste' }, to: { type: 'tableau', column: 1 } }))
})

// ─────────────────────── 규칙 1: 카테고리 카드 동반 이동 ───────────────────────

test('규칙 1: 카테고리 카드를 빈 기초로 옮기면 그 위의 같은 카테고리 단어가 함께 간다', () => {
  const state = makeState({ tableau: [col(ids('B', 'b1', 'b2'), 0), col([])] })
  const move: SolitaireMove = {
    kind: 'move',
    from: { type: 'tableau', column: 0, index: 0 },
    to: { type: 'foundation', slot: 0 },
  }
  assert.ok(hasMove(state, move))

  const next = applyMove(state, move)
  assert.equal(next.foundations[0].categoryId, 1)
  assert.deepEqual(next.foundations[0].wordIds, ids('b1', 'b2'))
  assert.deepEqual(next.tableau[0].cardIds, [])
  assert.equal(next.turns, 1, '3장이 함께 움직여도 1턴')
})

test('규칙 1: 위에 다른 카테고리 단어가 섞여 있으면 카테고리 카드를 통째로 집을 수 없다', () => {
  const state = makeState({ tableau: [col(ids('B', 'b1', 'a1'), 0), col([])] })
  assert.equal(
    hasMove(state, {
      kind: 'move',
      from: { type: 'tableau', column: 0, index: 0 },
      to: { type: 'foundation', slot: 0 },
    }),
    false,
  )
  assert.throws(
    () =>
      applyMove(state, {
        kind: 'move',
        from: { type: 'tableau', column: 0, index: 0 },
        to: { type: 'foundation', slot: 0 },
      }),
    /함께 옮길 수 없는/,
  )
})

test('뒷면 카드는 집을 수 없다', () => {
  const state = makeState({ tableau: [col(ids('B', 'b1'), 1), col([])] })
  assert.throws(
    () =>
      applyMove(state, {
        kind: 'move',
        from: { type: 'tableau', column: 0, index: 0 },
        to: { type: 'foundation', slot: 0 },
      }),
    /뒷면 카드는 집을 수 없습니다/,
  )
})

test('단어 여러 장을 한 번에 옮기는 이동은 제공하지 않는다 (턴 계산 일치)', () => {
  const state = makeState({ tableau: [col(ids('b1', 'b2'), 0), col([])] })
  const multi = listLegalMoves(state).filter(
    (move) => move.kind === 'move' && move.from.type === 'tableau' && move.from.index === 0,
  )
  assert.deepEqual(multi, [], 'b1 부터 집는 묶음 이동은 없어야 한다')
})

// ─────────────────────── 규칙 6·7: 자동 오픈 / 완성 ───────────────────────

test('규칙 6: 카드를 빼내 맨 위가 덮이면 자동으로 오픈된다 (턴 소모 0)', () => {
  const state = makeState({
    foundations: [{ categoryId: 1, wordIds: [] }, { categoryId: null, wordIds: [] }],
    tableau: [col(ids('c1', 'a1', 'b1'), 2), col([])],
  })
  const next = applyMove(state, {
    kind: 'move',
    from: { type: 'tableau', column: 0, index: 2 },
    to: { type: 'foundation', slot: 0 },
  })
  assert.equal(next.tableau[0].faceUpFrom, 1, 'a1 이 자동으로 뒤집힌다')
  assert.equal(next.turns, 1, '자동 오픈은 턴을 추가로 쓰지 않는다')
})

test('규칙 7: 카테고리의 단어가 모두 모이면 묶음이 제거되고 슬롯이 빈다', () => {
  const state = makeState({
    foundations: [{ categoryId: 0, wordIds: ids('a1') }, { categoryId: null, wordIds: [] }],
    waste: ids('a2'),
  })
  const next = applyMove(state, {
    kind: 'move',
    from: { type: 'waste' },
    to: { type: 'foundation', slot: 0 },
  })
  assert.deepEqual(next.foundations[0], { categoryId: null, wordIds: [] })
  assert.deepEqual(next.completed, [0])
  assert.equal(isWon(next), false, '아직 B·C 가 남았다')
})

test('규칙 8: 모든 카테고리가 완성되면 승리', () => {
  const state = makeState({
    foundations: [{ categoryId: 2, wordIds: ids('c1') }, { categoryId: null, wordIds: [] }],
    waste: ids('c2'),
    completed: [0, 1],
  })
  const next = applyMove(state, {
    kind: 'move',
    from: { type: 'waste' },
    to: { type: 'foundation', slot: 0 },
  })
  assert.deepEqual(next.completed, [0, 1, 2])
  assert.ok(isWon(next))
})

// ─────────────────────── 규칙 5: 스톡 ───────────────────────

test('규칙 5: 스톡 열기는 1턴, 마지막 카드부터 열린다', () => {
  const state = makeState({ stock: ids('a1', 'b1') })
  const next = applyMove(state, { kind: 'draw' })
  assert.deepEqual(next.waste, ids('b1'))
  assert.deepEqual(next.stock, ids('a1'))
  assert.equal(next.turns, 1)
})

test('규칙 5: 스톡을 다 열면 셔플 후 재사용한다 (무제한, 1턴)', () => {
  const state = makeState({ stock: [], waste: ids('a1', 'b1', 'c1', 'b2') })
  assert.ok(hasMove(state, { kind: 'draw' }))

  const next = applyMove(state, { kind: 'draw' })
  assert.equal(next.recycles, 1)
  assert.equal(next.turns, 1)
  assert.equal(next.waste.length, 1)
  assert.equal(next.stock.length, 3)
  assert.deepEqual(
    next.stock.concat(next.waste).slice().sort((a, b) => a - b),
    ids('a1', 'b1', 'c1', 'b2').sort((a, b) => a - b),
    '카드가 사라지거나 늘지 않는다',
  )
})

test('재활용 셔플은 시드 결정론적이다 (같은 시드·같은 플레이 = 같은 결과)', () => {
  const spec: StateSpec = { stock: [], waste: ids('a1', 'b1', 'c1', 'b2', 'a2'), seed: 987654 }
  const first = applyMove(makeState(spec), { kind: 'draw' })
  const second = applyMove(makeState(spec), { kind: 'draw' })
  assert.deepEqual(first.stock, second.stock)
  assert.deepEqual(first.waste, second.waste)

  const otherSeed = applyMove(makeState({ ...spec, seed: 5 }), { kind: 'draw' })
  assert.notDeepEqual(otherSeed.stock, first.stock)
})

test('스톡·웨이스트가 사실상 비면 열기 이동을 내놓지 않는다 (무한 반복 방지)', () => {
  const oneCard = makeState({ stock: [], waste: ids('a1') })
  assert.equal(hasMove(oneCard, { kind: 'draw' }), false)
  assert.throws(() => applyMove(oneCard, { kind: 'draw' }), /열 수 있는 카드가 없습니다/)

  const empty = makeState({ stock: [], waste: [] })
  assert.equal(hasMove(empty, { kind: 'draw' }), false)
})

// ─────────────────────── 불변성 · 해시 ───────────────────────

test('applyMove 는 원본 상태를 건드리지 않는다 (불변 업데이트)', () => {
  const state = makeState({ tableau: [col(ids('B', 'b1'), 0), col([])], stock: ids('a1') })
  const snapshot = JSON.stringify(state)
  applyMove(state, {
    kind: 'move',
    from: { type: 'tableau', column: 0, index: 0 },
    to: { type: 'foundation', slot: 0 },
  })
  applyMove(state, { kind: 'draw' })
  assert.equal(JSON.stringify(state), snapshot)
})

test('상태는 JSON 직렬화·복원이 가능하다', () => {
  const state = makeState({ tableau: [col(ids('B', 'b1'), 0), col([])], stock: ids('a1') })
  const restored = JSON.parse(JSON.stringify(state)) as SolitaireState
  assert.equal(hashState(restored), hashState(state))
  assert.deepEqual(listLegalMoves(restored), listLegalMoves(state))
})

test('hashState: 슬롯·열 순서와 기초 단어 순서가 달라도 같은 국면은 같은 키', () => {
  const a = makeState({
    foundations: [{ categoryId: 1, wordIds: ids('b1', 'b2') }, { categoryId: null, wordIds: [] }],
    tableau: [col(ids('a1')), col(ids('c1'))],
  })
  const b = makeState({
    foundations: [{ categoryId: null, wordIds: [] }, { categoryId: 1, wordIds: ids('b2', 'b1') }],
    tableau: [col(ids('c1')), col(ids('a1'))],
  })
  assert.equal(hashState(a), hashState(b))
})

test('hashState: 국면이 다르면 키도 다르다', () => {
  const a = makeState({ tableau: [col(ids('a1')), col([])] })
  const b = makeState({ tableau: [col(ids('a2')), col([])] })
  assert.notEqual(hashState(a), hashState(b))
})

test('describeMove: 이동을 사람이 읽을 수 있는 한 줄로 (동반 카드 포함)', () => {
  const state = makeState({ tableau: [col(ids('B', 'b1', 'b2'), 0), col([])], stock: ids('a1') })
  assert.equal(describeMove(state, { kind: 'draw' }), 'draw')
  assert.equal(
    describeMove(state, {
      kind: 'move',
      from: { type: 'tableau', column: 0, index: 0 },
      to: { type: 'foundation', slot: 0 },
    }),
    'T0[0]→F0 (B+b1+b2)',
  )
})

test('서로 구분되지 않는 빈 목적지는 하나만 제안한다', () => {
  const state = makeState({
    foundations: [
      { categoryId: null, wordIds: [] },
      { categoryId: null, wordIds: [] },
    ],
    tableau: [col([]), col([]), col(ids('b1', 'b2'))],
    waste: ids('A'),
  })
  const fromWaste = listLegalMoves(state).filter((move) => move.kind === 'move' && move.from.type === 'waste')
  assert.deepEqual(fromWaste, [
    { kind: 'move', from: { type: 'waste' }, to: { type: 'foundation', slot: 0 } },
    { kind: 'move', from: { type: 'waste' }, to: { type: 'tableau', column: 0 } },
  ])
})
