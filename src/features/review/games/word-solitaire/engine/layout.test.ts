/**
 * @file layout.test.ts
 * @description 난이도 함수가 계획서 §3 계산 예시 표와 정확히 일치하는지 + 경계 처리
 * @module features/review/games/word-solitaire/engine
 * @dependencies node:test, layout, constants
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { computeLayout, referenceTurnBudget } from './layout.ts'
import { rateTurns, MIN_FOUNDATION_SLOTS, MAX_FOUNDATION_SLOTS } from './constants.ts'

// 계획서 §3 "계산 예시 (콘텐츠가 C=6, 단어 30개 → N=36일 때)"
test('§3 계산 예시 표: C=6, W=30 (N=36)', () => {
  const intro = computeLayout(6, 30, 'intro')
  assert.equal(intro.foundationCount, 5)
  assert.equal(intro.columnCount, 5)
  assert.deepEqual(intro.columns, [2, 3, 4, 5, 6])
  assert.equal(intro.tableauCount, 20)
  assert.equal(intro.stockCount, 16)

  const normal = computeLayout(6, 30, 'normal')
  assert.equal(normal.foundationCount, 4)
  assert.deepEqual(normal.columns, [3, 4, 5, 6])
  assert.equal(normal.tableauCount, 18)
  assert.equal(normal.stockCount, 18)

  const challenge = computeLayout(6, 30, 'challenge')
  assert.equal(challenge.foundationCount, 2)
  assert.deepEqual(challenge.columns, [4, 5])
  assert.equal(challenge.tableauCount, 9)
  assert.equal(challenge.stockCount, 27)
})

test('§3 참고 턴: 1.94N — 예시 3종 모두 ~70', () => {
  assert.equal(referenceTurnBudget(36), 70)
})

test('T = F 는 난이도·카테고리 수와 무관하게 항상 성립', () => {
  for (const categoryCount of [5, 6, 7, 8]) {
    for (const difficulty of ['intro', 'normal', 'challenge'] as const) {
      const layout = computeLayout(categoryCount, categoryCount * 5, difficulty)
      assert.equal(layout.columnCount, layout.foundationCount, `${categoryCount}/${difficulty}`)
    }
  }
})

test('F < C 가 항상 성립한다 (슬롯이 카테고리보다 적어야 고민이 생긴다)', () => {
  for (const categoryCount of [5, 6, 7, 8]) {
    for (const difficulty of ['intro', 'normal', 'challenge'] as const) {
      const layout = computeLayout(categoryCount, categoryCount * 5, difficulty)
      assert.ok(layout.foundationCount < categoryCount, `${categoryCount}/${difficulty}`)
    }
  }
})

test('F 하한 2 — C=5 도전(k=4)이면 1이 아니라 2', () => {
  const layout = computeLayout(5, 25, 'challenge')
  assert.equal(layout.foundationCount, MIN_FOUNDATION_SLOTS)
})

test('F 상한 8 을 넘지 않는다', () => {
  const layout = computeLayout(8, 40, 'intro')
  assert.ok(layout.foundationCount <= MAX_FOUNDATION_SLOTS)
  assert.equal(layout.foundationCount, 7)
})

test('열별 장수는 s 부터 1씩 오르는 계단이다', () => {
  const layout = computeLayout(7, 35, 'normal')
  assert.deepEqual(layout.columns, [3, 4, 5, 6, 7])
})

test('카드가 계단을 감당 못 하면 큰 열부터 깎아 테이블로 ≤ N 을 지킨다', () => {
  // C=8, W=24(최소) → N=32. 입문 계단은 2..8 = 35 로 N 을 넘는다.
  const layout = computeLayout(8, 24, 'intro')
  assert.equal(layout.foundationCount, 7)
  assert.equal(layout.tableauCount, 32)
  assert.equal(layout.stockCount, 0)
  assert.ok(layout.columns.every((n) => n >= 1))
  assert.equal(layout.columns.reduce((a, b) => a + b, 0), layout.tableauCount)
})

test('스톡 = N - 테이블로 (항상 0 이상)', () => {
  for (const categoryCount of [5, 6, 7, 8]) {
    for (const wordCount of [15, 24, 30, 40, 56]) {
      for (const difficulty of ['intro', 'normal', 'challenge'] as const) {
        const layout = computeLayout(categoryCount, wordCount, difficulty)
        assert.equal(layout.stockCount, layout.totalCards - layout.tableauCount)
        assert.ok(layout.stockCount >= 0)
      }
    }
  }
})

test('잘못된 입력은 예외', () => {
  assert.throws(() => computeLayout(0, 10, 'intro'))
  assert.throws(() => computeLayout(5, 0, 'intro'))
  assert.throws(() => computeLayout(5, 10, 'unknown' as 'intro'))
})

test('별점: L* 대비 1.3배 이하 ★★★, 1.8배 이하 ★★, 그 외 클리어 ★', () => {
  assert.equal(rateTurns(50, 50), 3)
  assert.equal(rateTurns(65, 50), 3) // 정확히 1.3배
  assert.equal(rateTurns(66, 50), 2)
  assert.equal(rateTurns(90, 50), 2) // 정확히 1.8배
  assert.equal(rateTurns(91, 50), 1)
  assert.equal(rateTurns(0, 50), 0)
  assert.equal(rateTurns(Number.NaN, 50), 0)
  assert.equal(rateTurns(50, 0), 0)
})
