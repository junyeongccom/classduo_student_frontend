/**
 * @file layout.ts
 * @description 카드 수(C, W)와 난이도에서 판 구성(F·T·열별 장수·스톡)을 계산하는 순수 함수
 * @module features/review/games/word-solitaire/engine
 * @dependencies features/review/games/word-solitaire/engine/{types,constants}
 */
import type { SolitaireDifficulty, SolitaireLayout } from './types'
import {
  DIFFICULTY_PRESETS,
  MAX_FOUNDATION_SLOTS,
  MIN_COLUMN_SIZE,
  MIN_FOUNDATION_SLOTS,
  REFERENCE_TURNS_PER_CARD,
} from './constants.ts'

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max)

/**
 * 계획서 §3 난이도 함수.
 * - `F = clamp(C - k, 2, 8)`, `T = F`
 * - 열별 장수 = 계단 `s, s+1, …, s+T-1`
 * - 스톡 = `N - Σ(열별 장수)`
 *
 * 카드가 계단을 감당 못 하는 경계(예: C=8·W=24 에 입문이면 계단 합 35 > N 32)에서는
 * **큰 열부터 1장씩 깎아** 테이블로 합이 N을 넘지 않게 맞춘다. F·T 는 공식 그대로 유지한다.
 */
export const computeLayout = (
  categoryCount: number,
  wordCount: number,
  difficulty: SolitaireDifficulty,
): SolitaireLayout => {
  if (!Number.isInteger(categoryCount) || categoryCount < 1) {
    throw new Error(`computeLayout: 카테고리 수가 올바르지 않습니다 (${categoryCount})`)
  }
  if (!Number.isInteger(wordCount) || wordCount < 1) {
    throw new Error(`computeLayout: 단어 수가 올바르지 않습니다 (${wordCount})`)
  }

  const preset = DIFFICULTY_PRESETS[difficulty]
  if (!preset) throw new Error(`computeLayout: 알 수 없는 난이도 (${difficulty})`)

  const totalCards = categoryCount + wordCount
  const foundationCount = clamp(categoryCount - preset.slotGap, MIN_FOUNDATION_SLOTS, MAX_FOUNDATION_SLOTS)
  const columnCount = foundationCount

  const columns: number[] = []
  for (let i = 0; i < columnCount; i += 1) columns.push(preset.startColumnSize + i)

  let tableauCount = columns.reduce((sum, n) => sum + n, 0)
  while (tableauCount > totalCards) {
    let target = -1
    let largest = MIN_COLUMN_SIZE
    for (let i = 0; i < columns.length; i += 1) {
      if (columns[i] > largest) {
        largest = columns[i]
        target = i
      }
    }
    if (target === -1) break // 모든 열이 최소 장수 — 더 깎을 수 없다
    columns[target] -= 1
    tableauCount -= 1
  }

  return {
    foundationCount,
    columnCount,
    columns,
    tableauCount,
    stockCount: totalCards - tableauCount,
    totalCards,
  }
}

/**
 * 참고 게임의 "제공 턴" 추정치 (계획서 §3). 우리는 제한으로 쓰지 않고,
 * L* 가 이 값에서 크게 벗어나면 판 구성이 이상하다는 **생성 단계 sanity check** 로만 쓴다.
 */
export const referenceTurnBudget = (totalCards: number): number =>
  Math.round(totalCards * REFERENCE_TURNS_PER_CARD)
