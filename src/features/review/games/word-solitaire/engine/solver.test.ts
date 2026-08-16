/**
 * @file solver.test.ts
 * @description 풀림 보장 속성 테스트(난이도 3종 × 시드 20개 = 60판) + 시드 결정론 + solver 성능 실측
 * @module features/review/games/word-solitaire/engine
 * @dependencies node:test, state, solver, generate
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import type { SolitaireContent, SolitaireDifficulty } from './types'
import { buildDeck, createInitialState, hashState, isWon, totalWordCount } from './state.ts'
import { heuristic, replay, solve } from './solver.ts'
import { generateDeal, generateDealFromDeck } from './generate.ts'
import { computeLayout, referenceTurnBudget } from './layout.ts'
import { deriveDealSeed } from './random.ts'
import { MAX_CATEGORIES, SOLITAIRE_DIFFICULTIES } from './constants.ts'

const makeContent = (wordCounts: number[]): SolitaireContent => ({
  categories: wordCounts.map((count, index) => ({
    name: `주제${index}`,
    words: Array.from({ length: count }, (_, wordIndex) => `단어${index}_${wordIndex}`),
  })),
})

// 계획서 §3 계산 예시와 같은 규모: C=6, W=30 (N=36). 카테고리당 단어 수는 3~8 사이로 다르다.
const CONTENT_C6 = makeContent([4, 5, 6, 5, 6, 4])
// 가장 큰 판: C=8, 단어 44개 (N=52)
const CONTENT_C8 = makeContent([5, 6, 5, 6, 5, 6, 5, 6])

const SEEDS = Array.from({ length: 20 }, (_, i) => (i + 1) * 7919)

// ─────────────────────── 배치 · 시드 결정론 ───────────────────────

test('초기 배치가 layout 을 정확히 따른다 (열별 장수·맨 위 1장만 오픈·스톡 나머지)', () => {
  const deck = buildDeck(CONTENT_C6)
  const layout = computeLayout(deck.categoryNames.length, totalWordCount(deck), 'normal')
  const state = createInitialState(deck, 'normal', 42)

  assert.equal(state.foundations.length, layout.foundationCount)
  assert.equal(state.tableau.length, layout.columnCount)
  assert.deepEqual(state.tableau.map((column) => column.cardIds.length), layout.columns)
  state.tableau.forEach((column) => {
    assert.equal(column.faceUpFrom, column.cardIds.length - 1, '각 열은 맨 위 1장만 앞면')
  })
  assert.equal(state.stock.length, layout.stockCount)
  assert.equal(state.waste.length, 0)
  assert.equal(state.turns, 0)

  const dealt = state.tableau.flatMap((column) => column.cardIds).concat(state.stock).sort((a, b) => a - b)
  assert.deepEqual(dealt, deck.cards.map((card) => card.id), '카드가 빠지거나 중복되지 않는다')
})

test('시드 결정론: 같은 시드는 같은 판, 다른 시드는 다른 판', () => {
  const deck = buildDeck(CONTENT_C6)
  const a = createInitialState(deck, 'normal', 20260816)
  const b = createInitialState(deck, 'normal', 20260816)
  const c = createInitialState(deck, 'normal', 20260817)
  assert.equal(hashState(a), hashState(b))
  assert.notEqual(hashState(a), hashState(c))
})

test('deriveDealSeed: 회차·난이도·날짜가 같으면 모두가 같은 판을 푼다', () => {
  const lectureId = 'ff0a1c22-0000-4000-8000-000000000001'
  assert.equal(deriveDealSeed(lectureId, 'normal', '2026-08-16'), deriveDealSeed(lectureId, 'normal', '2026-08-16'))
  assert.notEqual(deriveDealSeed(lectureId, 'normal', '2026-08-16'), deriveDealSeed(lectureId, 'normal', '2026-08-17'))
  assert.notEqual(deriveDealSeed(lectureId, 'normal', '2026-08-16'), deriveDealSeed(lectureId, 'intro', '2026-08-16'))
})

test('generateDeal 은 같은 시드에 같은 판·같은 해를 돌려준다', () => {
  const first = generateDeal(CONTENT_C6, 'intro', 555)
  const second = generateDeal(CONTENT_C6, 'intro', 555)
  assert.equal(first.seed, second.seed)
  assert.equal(hashState(first.state), hashState(second.state))
  assert.equal(first.solution.minTurns, second.solution.minTurns)
  assert.deepEqual(first.solution.moves, second.solution.moves)
})

test('카테고리가 8개를 넘으면 앞에서 8개만 사용한다', () => {
  const deck = buildDeck(makeContent([3, 3, 3, 3, 3, 3, 3, 3, 3, 3]))
  assert.equal(deck.categoryNames.length, MAX_CATEGORIES)
})

test('빈 콘텐츠·단어 없는 카테고리는 예외', () => {
  assert.throws(() => buildDeck({ categories: [] }))
  assert.throws(() => buildDeck({ categories: [{ name: 'A', words: [] }] }))
})

// ─────────────────────── 핵심: 풀림 보장 속성 테스트 ───────────────────────

test('속성 테스트: 난이도 3종 × 시드 20개 = 60판이 전부 solver 로 풀린다', (t) => {
  const deck = buildDeck(CONTENT_C6)
  const summary: Record<string, { turns: number[]; attempts: number[]; ms: number[] }> = {}

  for (const difficulty of SOLITAIRE_DIFFICULTIES) {
    summary[difficulty] = { turns: [], attempts: [], ms: [] }
    for (const seed of SEEDS) {
      const deal = generateDealFromDeck(deck, difficulty, seed)

      // 1) solver 가 내놓은 해를 엔진으로 그대로 재생하면 실제로 승리해야 한다.
      const finished = replay(deal.state, deal.solution.moves)
      assert.ok(isWon(finished), `${difficulty}/${seed}: 해를 재생했는데 승리하지 못했다`)
      // 2) 이동 1건 = 1턴 — 재생 결과의 턴 수가 L* 과 정확히 같아야 한다.
      assert.equal(finished.turns, deal.solution.minTurns, `${difficulty}/${seed}: 턴 수 불일치`)
      // 3) L* 은 이론 하한 이상이어야 한다.
      assert.ok(
        deal.solution.minTurns >= heuristic(deal.state),
        `${difficulty}/${seed}: L* 가 하한보다 작다`,
      )

      summary[difficulty].turns.push(deal.solution.minTurns)
      summary[difficulty].attempts.push(deal.attempts)
      summary[difficulty].ms.push(deal.solveElapsedMs)
    }
  }

  const reference = referenceTurnBudget(computeLayout(6, 30, 'normal').totalCards)
  for (const difficulty of SOLITAIRE_DIFFICULTIES) {
    const { turns, attempts, ms } = summary[difficulty]
    const avg = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length
    t.diagnostic(
      `[C=6/W=30] ${difficulty}: L* 평균 ${avg(turns).toFixed(1)} (${Math.min(...turns)}~${Math.max(...turns)}), ` +
        `참고 턴 ${reference}, 시드 재시도 평균 ${avg(attempts).toFixed(2)}회, 생성 평균 ${avg(ms).toFixed(0)}ms`,
    )
  }
})

// ─────────────────────── 성능 실측 ───────────────────────

test('성능: 가장 큰 판(C=8, 단어 44개, N=52) solver 소요 시간', (t) => {
  const deck = buildDeck(CONTENT_C8)
  assert.equal(deck.cards.length, 52)

  for (const difficulty of SOLITAIRE_DIFFICULTIES) {
    const elapsed: number[] = []
    const turns: number[] = []
    for (const seed of SEEDS.slice(0, 10)) {
      const state = createInitialState(deck, difficulty as SolitaireDifficulty, seed)
      const startedAt = Date.now()
      const result = solve(state)
      elapsed.push(Date.now() - startedAt)
      if (result.solved && result.minTurns !== null) {
        turns.push(result.minTurns)
        assert.ok(isWon(replay(state, result.moves)), `${difficulty}/${seed}: 해 재생 실패`)
      }
    }
    const total = elapsed.reduce((a, b) => a + b, 0)
    t.diagnostic(
      `[C=8/W=44] ${difficulty}: 10판 중 ${turns.length}판 해결, ` +
        `평균 ${(total / elapsed.length).toFixed(0)}ms / 최대 ${Math.max(...elapsed)}ms, ` +
        `L* ${turns.length ? `${Math.min(...turns)}~${Math.max(...turns)}` : '-'}`,
    )
    assert.ok(Math.max(...elapsed) < 5000, `${difficulty}: 판 1개가 5초를 넘었다`)
  }
})

test('가장 큰 판도 generateDeal 이 풀리는 판을 돌려준다', (t) => {
  for (const difficulty of SOLITAIRE_DIFFICULTIES) {
    const startedAt = Date.now()
    const deal = generateDeal(CONTENT_C8, difficulty, 20260816)
    const elapsed = Date.now() - startedAt
    assert.ok(isWon(replay(deal.state, deal.solution.moves)))
    t.diagnostic(
      `[C=8/W=44] ${difficulty}: seed ${deal.seed} (재시도 ${deal.attempts}회), L*=${deal.solution.minTurns}, ` +
        `optimal=${deal.solution.optimal}, ${elapsed}ms`,
    )
    assert.ok(elapsed < 10_000, `${difficulty}: 판 생성이 10초를 넘었다`)
  }
})

test('solve: 이미 이긴 상태는 0턴', () => {
  const deck = buildDeck(makeContent([3, 3, 3, 3, 3]))
  const state = createInitialState(deck, 'intro', 1)
  const won = { ...state, completed: [0, 1, 2, 3, 4] }
  const result = solve(won)
  assert.equal(result.solved, true)
  assert.equal(result.minTurns, 0)
  assert.deepEqual(result.moves, [])
})
