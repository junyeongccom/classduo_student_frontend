/**
 * @file generate.ts
 * @description 시드 결정론 판 생성 + solver 검증 (계획서 §4 풀림 보장) — 산출물은 실제로 푼 해와 L*
 * @module features/review/games/word-solitaire/engine
 * @dependencies features/review/games/word-solitaire/engine/{types,state,layout,solver,constants}
 */
import type { GeneratedDeal, SolitaireContent, SolitaireDeck, SolitaireDifficulty } from './types'
import { buildDeck, createStateFromLayout, totalWordCount } from './state.ts'
import { computeLayout } from './layout.ts'
import { solve, type SolveOptions } from './solver.ts'
import { MAX_DEAL_ATTEMPTS } from './constants.ts'

export interface GenerateDealOptions extends SolveOptions {
  /** 시드를 증가시키며 재시도할 최대 횟수 */
  maxAttempts?: number
}

/**
 * 같은 `seed` → 항상 같은 판. 판을 만든 뒤 **solver 로 실제로 풀어보고**,
 * 풀리지 않으면 시드를 1 올려 다시 만든다 (계획서 §4).
 *
 * 실패한 시드는 배포되지 않으므로 플레이어가 받는 판은 언제나 해가 존재한다.
 */
export const generateDeal = (
  content: SolitaireContent,
  difficulty: SolitaireDifficulty,
  seed: number,
  options: GenerateDealOptions = {},
): GeneratedDeal => {
  const deck = buildDeck(content)
  return generateDealFromDeck(deck, difficulty, seed, options)
}

/** 덱을 이미 만들어 뒀을 때(난이도 3종을 한 콘텐츠로 돌릴 때) 쓰는 변형 */
export const generateDealFromDeck = (
  deck: SolitaireDeck,
  difficulty: SolitaireDifficulty,
  seed: number,
  options: GenerateDealOptions = {},
): GeneratedDeal => {
  const { maxAttempts = MAX_DEAL_ATTEMPTS, ...solveOptions } = options
  const layout = computeLayout(deck.categoryNames.length, totalWordCount(deck), difficulty)

  const baseSeed = Math.trunc(seed) >>> 0
  let solveElapsedMs = 0

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const currentSeed = (baseSeed + attempt) >>> 0
    const state = createStateFromLayout(deck, layout, currentSeed)
    const result = solve(state, solveOptions)
    solveElapsedMs += result.elapsedMs
    if (!result.solved || result.minTurns === null) continue

    return {
      seed: currentSeed,
      difficulty,
      layout,
      state,
      solution: { minTurns: result.minTurns, moves: result.moves, optimal: result.optimal },
      attempts: attempt + 1,
      solveElapsedMs,
    }
  }

  throw new Error(
    `generateDeal: 시드 ${baseSeed} 부터 ${maxAttempts}회 시도했지만 풀리는 판을 만들지 못했습니다 (난이도 ${difficulty})`,
  )
}
