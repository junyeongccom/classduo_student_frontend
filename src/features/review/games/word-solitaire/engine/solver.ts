/**
 * @file solver.ts
 * @description 판이 실제로 풀리는지 검증하고 최소 턴 L* 을 구하는 탐색기 (엔진 규칙을 그대로 재사용)
 * @module features/review/games/word-solitaire/engine
 * @dependencies features/review/games/word-solitaire/engine/{types,state,moves,constants}
 */
import type { SolitaireMove, SolitaireState, SolveResult } from './types'
import { cardsOutsideFoundations, hashState, isWon } from './state.ts'
import { applyMove, listLegalMoves } from './moves.ts'
import { mixSeed, mulberry32 } from './random.ts'
import {
  MAX_FRONTIER,
  MAX_SOLVE_TURNS,
  OPTIMIZE_MAX_LENGTH,
  OPTIMIZE_NODE_BUDGET,
  OPTIMIZE_ROUNDS,
  ROLLOUT_MIN_WIDTH,
  ROLLOUT_RESTARTS,
  ROLLOUT_TURN_FACTOR,
  ROLLOUT_WIDTH_VARIANTS,
  SOLVE_NODE_BUDGET,
} from './constants.ts'

export interface SolveOptions {
  /** 이 턴 수를 넘는 해는 찾지 않는다 */
  maxTurns?: number
  /** 1단계(해 찾기) 노드 예산 */
  nodeBudget?: number
  /** 1.5단계(무작위 재시작 롤아웃) 횟수 */
  rolloutRestarts?: number
  /** 2단계 최적화 시도 여부 */
  optimize?: boolean
  /** 2단계 노드 예산 */
  optimizeNodeBudget?: number
}

/**
 * 함께 옮겨질 수 있는 카드 수 — 앞면 카테고리 카드 위에 그 카테고리 단어만 쌓여 있는 경우의 덤.
 * 단어를 카테고리 카드 위에 새로 올릴 방법이 없으므로(열이 잠긴다) 이 값은 **줄기만 한다**.
 * 따라서 현재 값이 미래 절약분의 상한이고, 아래 휴리스틱은 실제 남은 턴을 넘지 않는다(admissible).
 */
const rideAlongSavings = (state: SolitaireState): number => {
  const { deck } = state
  let savings = 0
  for (const column of state.tableau) {
    const top = column.cardIds.length - 1
    for (let i = column.faceUpFrom; i < top; i += 1) {
      const anchor = deck.cards[column.cardIds[i]]
      if (anchor.kind !== 'category') continue
      const above = column.cardIds.slice(i + 1)
      const carriable = above.every((id) => {
        const card = deck.cards[id]
        return card.kind === 'word' && card.categoryId === anchor.categoryId
      })
      if (carriable) savings += above.length
      break
    }
  }
  return savings
}

/**
 * 남은 턴의 하한.
 * - 기초 밖 카드는 저마다 최소 1번의 이동이 필요하다(동반 이동분만 차감)
 * - 스톡의 카드는 저마다 최소 1번의 오픈이 필요하고, 오픈과 이동은 서로 다른 턴이다
 */
export const heuristic = (state: SolitaireState): number =>
  Math.max(0, cardsOutsideFoundations(state) - rideAlongSavings(state)) + state.stock.length

interface HeapEntry {
  state: SolitaireState
  /** 지금까지 쓴 턴 */
  g: number
  /** 기초 밖 카드 수 — 진행도 1순위 */
  outside: number
  /** 스톡 장수 — 2순위 */
  stock: number
  traceIndex: number
}

const better = (a: HeapEntry, b: HeapEntry): boolean => {
  if (a.outside !== b.outside) return a.outside < b.outside
  if (a.stock !== b.stock) return a.stock < b.stock
  return a.g < b.g
}

/** 최소 힙 (comparator = better) */
const heapPush = (heap: HeapEntry[], entry: HeapEntry): void => {
  heap.push(entry)
  let i = heap.length - 1
  while (i > 0) {
    const parent = (i - 1) >> 1
    if (!better(heap[i], heap[parent])) break
    const tmp = heap[parent]
    heap[parent] = heap[i]
    heap[i] = tmp
    i = parent
  }
}

const heapPop = (heap: HeapEntry[]): HeapEntry | undefined => {
  if (heap.length === 0) return undefined
  const top = heap[0]
  const last = heap.pop() as HeapEntry
  if (heap.length > 0) {
    heap[0] = last
    let i = 0
    for (;;) {
      const left = i * 2 + 1
      const right = left + 1
      let best = i
      if (left < heap.length && better(heap[left], heap[best])) best = left
      if (right < heap.length && better(heap[right], heap[best])) best = right
      if (best === i) break
      const tmp = heap[best]
      heap[best] = heap[i]
      heap[i] = tmp
      i = best
    }
  }
  return top
}

interface TraceNode {
  parent: number
  move: SolitaireMove | null
}

const reconstruct = (trace: TraceNode[], index: number): SolitaireMove[] => {
  const moves: SolitaireMove[] = []
  let cursor = index
  while (cursor > 0) {
    const node = trace[cursor]
    if (node.move) moves.push(node.move)
    cursor = node.parent
  }
  return moves.reverse()
}

/**
 * 1단계 — 탐욕적 최우선 탐색으로 **해를 하나 찾는다**.
 * 우선순위는 (기초 밖 카드 수, 스톡 장수, 턴) 사전식. 막히면 힙에 남은 다른 국면으로 되돌아간다.
 */
const findSolution = (
  root: SolitaireState,
  maxTurns: number,
  nodeBudget: number,
): { moves: SolitaireMove[] | null; nodes: number } => {
  const trace: TraceNode[] = [{ parent: -1, move: null }]
  const visited = new Map<string, number>()
  const heap: HeapEntry[] = []
  visited.set(hashState(root), 0)
  heapPush(heap, {
    state: root,
    g: 0,
    outside: cardsOutsideFoundations(root),
    stock: root.stock.length,
    traceIndex: 0,
  })

  let nodes = 0
  while (heap.length > 0) {
    const entry = heapPop(heap) as HeapEntry
    if (isWon(entry.state)) return { moves: reconstruct(trace, entry.traceIndex), nodes }
    if (nodes >= nodeBudget) break
    nodes += 1

    // 프론티어가 커지면 메모리를 잡아먹는다 — 유망한 절반만 남긴다(정렬된 배열은 유효한 힙).
    if (heap.length > MAX_FRONTIER) {
      heap.sort((a, b) => (better(a, b) ? -1 : 1))
      heap.length = MAX_FRONTIER >> 1
    }

    const g = entry.g + 1
    if (g > maxTurns) continue

    for (const move of listLegalMoves(entry.state)) {
      const next = applyMove(entry.state, move)
      const key = hashState(next)
      const seen = visited.get(key)
      if (seen !== undefined && seen <= g) continue
      visited.set(key, g)
      trace.push({ parent: entry.traceIndex, move })
      heapPush(heap, {
        state: next,
        g,
        outside: cardsOutsideFoundations(next),
        stock: next.stock.length,
        traceIndex: trace.length - 1,
      })
    }
  }

  return { moves: null, nodes }
}

/**
 * 1.5단계 — 무작위 재시작 롤아웃.
 *
 * 매 수마다 (기초 밖 카드 수, 스톡 장수) 기준 상위 몇 개 중 하나를 무작위로 고르고 끝까지 밀어붙인다.
 * 막히면 다른 시드로 다시 시작한다. 최우선 탐색이 잘못된 슬롯 선택에 갇히는 판을 이 방식이 뚫는다.
 * 시드는 판의 `seed` 에서 파생되므로 **결과는 결정론적**이다(워커 사전계산 재현성).
 */
const rolloutSolution = (
  root: SolitaireState,
  restarts: number,
  turnCap: number,
): { moves: SolitaireMove[] | null; nodes: number } => {
  let best: SolitaireMove[] | null = null
  let nodes = 0

  for (let attempt = 0; attempt < restarts; attempt += 1) {
    const rand = mulberry32(mixSeed(root.seed, attempt + 1))
    const seen = new Set<string>([hashState(root)])
    const path: SolitaireMove[] = []
    let state = root
    const cap = best ? Math.min(turnCap, best.length - 1) : turnCap

    for (let step = 0; step < cap; step += 1) {
      if (isWon(state)) break
      nodes += 1
      const candidates = listLegalMoves(state)
        .map((move) => {
          const next = applyMove(state, move)
          return { move, next, key: hashState(next) }
        })
        .filter((candidate) => !seen.has(candidate.key))
        .map((candidate) => ({
          ...candidate,
          outside: cardsOutsideFoundations(candidate.next),
          stock: candidate.next.stock.length,
        }))
        .sort((a, b) => a.outside - b.outside || a.stock - b.stock)
      if (candidates.length === 0) break

      const width = Math.min(candidates.length, ROLLOUT_MIN_WIDTH + (attempt % ROLLOUT_WIDTH_VARIANTS))
      const chosen = candidates[Math.floor(rand() * width)]
      seen.add(chosen.key)
      path.push(chosen.move)
      state = chosen.next
    }

    if (isWon(state) && (!best || path.length < best.length)) best = path.slice()
  }

  return { moves: best, nodes }
}

/**
 * 2단계 — `limit` 턴 이하의 해를 **모두 뒤져** 더 짧은 해를 찾는다.
 * 예산 안에서 탐색이 소진되면(`exhausted`) 그 limit 이하 해가 없음이 증명된다 → 최적성 확정.
 */
const searchWithin = (
  root: SolitaireState,
  limit: number,
  nodeBudget: number,
): { moves: SolitaireMove[] | null; nodes: number; exhausted: boolean } => {
  const memo = new Map<string, number>()
  let nodes = 0
  let exhausted = true
  let best: SolitaireMove[] | null = null
  let bestLength = limit + 1
  const path: SolitaireMove[] = []

  const dfs = (state: SolitaireState, g: number): void => {
    if (!exhausted) return
    if (isWon(state)) {
      if (g < bestLength) {
        bestLength = g
        best = path.slice()
      }
      return
    }
    if (nodes >= nodeBudget) {
      exhausted = false
      return
    }
    nodes += 1

    const bound = Math.min(limit, bestLength - 1)
    if (g + heuristic(state) > bound) return

    const key = hashState(state)
    const seen = memo.get(key)
    if (seen !== undefined && seen <= g) return
    memo.set(key, g)

    const children = listLegalMoves(state)
      .map((move) => {
        const next = applyMove(state, move)
        return { move, next, score: heuristic(next) }
      })
      .sort((a, b) => a.score - b.score)

    for (const child of children) {
      path.push(child.move)
      dfs(child.next, g + 1)
      path.pop()
      if (!exhausted) return
    }
  }

  dfs(root, 0)
  return { moves: best, nodes, exhausted }
}

/**
 * 판을 실제로 풀어 최소 턴 L* 과 이동열을 돌려준다.
 *
 * `optimal: true` 는 "그보다 짧은 해가 없음을 탐색으로 확인했다"는 뜻이고,
 * `false` 는 반환된 `minTurns` 가 **실제로 달성 가능한 상한**이라는 뜻이다(별점 기준으로는 이걸로 충분하다).
 */
export const solve = (state: SolitaireState, options: SolveOptions = {}): SolveResult => {
  const maxTurns = options.maxTurns ?? MAX_SOLVE_TURNS
  const nodeBudget = options.nodeBudget ?? SOLVE_NODE_BUDGET
  const optimizeBudget = options.optimizeNodeBudget ?? OPTIMIZE_NODE_BUDGET
  const shouldOptimize = options.optimize ?? true
  const startedAt = Date.now()

  const first = findSolution(state, maxTurns, nodeBudget)
  let nodes = first.nodes
  let found = first.moves

  if (!found) {
    // 탐욕 탐색이 막혔다 — 무작위 재시작으로 다른 슬롯 선택을 시도한다.
    const turnCap = Math.min(maxTurns, state.deck.cards.length * ROLLOUT_TURN_FACTOR)
    const rollout = rolloutSolution(state, options.rolloutRestarts ?? ROLLOUT_RESTARTS, turnCap)
    nodes += rollout.nodes
    found = rollout.moves
  }

  if (!found) {
    return { solved: false, minTurns: null, moves: [], optimal: false, nodes, elapsedMs: Date.now() - startedAt }
  }

  let moves = found
  let optimal = false

  if (shouldOptimize && moves.length <= OPTIMIZE_MAX_LENGTH) {
    for (let round = 0; round < OPTIMIZE_ROUNDS; round += 1) {
      if (moves.length <= heuristic(state)) {
        optimal = true // 하한과 같은 길이 — 더 줄일 수 없다
        break
      }
      const attempt = searchWithin(state, moves.length - 1, optimizeBudget)
      nodes += attempt.nodes
      if (attempt.moves) moves = attempt.moves
      if (attempt.exhausted) {
        // 그 한계 이하를 전부 뒤졌다 — 지금 해보다 짧은 해는 없다.
        optimal = true
        break
      }
      if (!attempt.moves) break // 예산 소진 + 개선 없음
    }
  }

  return {
    solved: true,
    minTurns: moves.length,
    moves,
    optimal,
    nodes,
    elapsedMs: Date.now() - startedAt,
  }
}

/** 해를 실제로 재생해 승리까지 도달하는지 확인한다 (엔진↔solver 정합성 검증용) */
export const replay = (state: SolitaireState, moves: SolitaireMove[]): SolitaireState =>
  moves.reduce((current, move) => applyMove(current, move), state)
