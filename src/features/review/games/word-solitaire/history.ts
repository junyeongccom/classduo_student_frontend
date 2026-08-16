/**
 * @file history.ts
 * @description 되돌리기 스택 — 계획서 §2 "Undo 는 직전 상태 복원 + 1턴 소모"를 순수 함수로 고정
 * @module features/review/games/word-solitaire
 * @dependencies features/review/games/word-solitaire/engine
 */
import type { SolitaireState } from './engine/index.ts'

/** 되돌리기용으로 보관하는 과거 상태 수 상한 — 오래된 것부터 버린다 */
export const MAX_HISTORY = 300

export interface SolitaireHistory {
  past: SolitaireState[]
}

export const emptyHistory = (): SolitaireHistory => ({ past: [] })

/** 이동 직전 상태를 쌓는다 (상한 초과분은 앞에서 잘라낸다) */
export const pushHistory = (history: SolitaireHistory, state: SolitaireState): SolitaireHistory => {
  const past = history.past.concat(state)
  return { past: past.length > MAX_HISTORY ? past.slice(past.length - MAX_HISTORY) : past }
}

export const canUndo = (history: SolitaireHistory): boolean => history.past.length > 0

/**
 * 직전 상태로 되돌린다. **턴은 줄지 않고 1 늘어난다** — 무료 Undo 는 턴 경쟁을 무의미하게 만든다.
 * 되돌릴 것이 없으면 `null`.
 */
export const undo = (
  history: SolitaireHistory,
  current: SolitaireState,
): { history: SolitaireHistory; state: SolitaireState } | null => {
  if (history.past.length === 0) return null
  const previous = history.past[history.past.length - 1]
  return {
    history: { past: history.past.slice(0, -1) },
    state: { ...previous, turns: current.turns + 1 },
  }
}
