/**
 * @file useWordSolitaire.ts
 * @description 단어 솔리테어 플레이 상태 훅 — 판 생성·탭 투 무브·되돌리기·승리 판정을 엔진 위에서 조립
 * @module features/review/games/word-solitaire
 * @dependencies engine, selection, history, seed
 */
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  applyMove,
  generateDeal,
  isWon,
  listLegalMoves,
  rateTurns,
  type GeneratedDeal,
  type MoveSource,
  type MoveTarget,
  type SolitaireContent,
  type SolitaireDifficulty,
  type SolitaireState,
} from './engine/index.ts'
import {
  canDraw as canDrawFrom,
  hasCardMove as hasCardMoveFrom,
  highlightedTargetKeys,
  movesFromSource,
  resolveTarget,
  selectSource,
  selectableSourceKeys,
  type SolitaireSelection,
} from './selection.ts'
import { canUndo as canUndoHistory, emptyHistory, pushHistory, undo as undoHistory } from './history.ts'
import { dealSeedFor } from './seed.ts'

/** 잘못된 탭(갈 곳 없는 카드)을 흔들어 알려주는 시간 (ms) */
const REJECT_FEEDBACK_MS = 400

export interface WordSolitaireResult {
  turns: number
  minTurns: number
  stars: 0 | 1 | 2 | 3
  difficulty: SolitaireDifficulty
  seed: number
  /** 첫 수부터 클리어까지 걸린 시간(ms) */
  elapsedMs: number
}

export interface UseWordSolitaireArgs {
  lectureId: string | null
  /** API 로 받은 카테고리·단어. null 이면 판을 만들지 않는다 */
  content: SolitaireContent | null
  difficulty: SolitaireDifficulty
}

export function useWordSolitaire({ lectureId, content, difficulty }: UseWordSolitaireArgs) {
  const [deal, setDeal] = useState<GeneratedDeal | null>(null)
  const [state, setState] = useState<SolitaireState | null>(null)
  const [history, setHistory] = useState(emptyHistory)
  const [selection, setSelection] = useState<SolitaireSelection | null>(null)
  const [rejectedKey, setRejectedKey] = useState<string | null>(null)
  const [isDealing, setIsDealing] = useState(false)
  const [hasDealError, setHasDealError] = useState(false)

  const rejectTimerRef = useRef<number | null>(null)
  /** 생성 요청마다 증가 — 늦게 끝난 이전 요청이 새 판을 덮어쓰지 못하게 막는다 */
  const dealTokenRef = useRef(0)

  /**
   * 경과 시간. 판을 받자마자가 아니라 **첫 수를 둔 순간** 시작한다 —
   * 판을 열어두고 딴짓한 시간까지 기록에 넣으면 억울하다.
   */
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [frozenElapsedMs, setFrozenElapsedMs] = useState<number | null>(null)

  const clearRejectTimer = useCallback(() => {
    if (rejectTimerRef.current !== null) {
      window.clearTimeout(rejectTimerRef.current)
      rejectTimerRef.current = null
    }
  }, [])

  useEffect(() => clearRejectTimer, [clearRejectTimer])

  // ── 판 생성 ────────────────────────────────────────────────
  // solver 가 수백 ms 걸리므로 로딩 표시가 먼저 그려지도록 다음 틱으로 미룬다.
  useEffect(() => {
    dealTokenRef.current += 1
    const token = dealTokenRef.current

    if (!lectureId || !content || content.categories.length === 0) {
      setDeal(null)
      setState(null)
      setHistory(emptyHistory())
      setSelection(null)
      setIsDealing(false)
      setHasDealError(false)
      setStartedAt(null)
      setElapsedMs(0)
      setFrozenElapsedMs(null)
      return
    }

    setIsDealing(true)
    setHasDealError(false)
    setSelection(null)

    const timer = window.setTimeout(() => {
      if (dealTokenRef.current !== token) return
      try {
        const generated = generateDeal(content, difficulty, dealSeedFor(lectureId, difficulty))
        if (dealTokenRef.current !== token) return
        setDeal(generated)
        setState(generated.state)
        setHistory(emptyHistory())
        setStartedAt(null)
        setElapsedMs(0)
        setFrozenElapsedMs(null)
      } catch {
        if (dealTokenRef.current !== token) return
        setDeal(null)
        setState(null)
        setHasDealError(true)
      } finally {
        if (dealTokenRef.current === token) setIsDealing(false)
      }
    }, 0)

    return () => window.clearTimeout(timer)
  }, [lectureId, content, difficulty])

  // ── 파생값 ────────────────────────────────────────────────
  const legalMoves = useMemo(() => (state ? listLegalMoves(state) : []), [state])
  const won = useMemo(() => Boolean(state && isWon(state)), [state])

  // 1초마다 표시를 갱신한다. 승리하면 그 시점 값으로 얼린다.
  useEffect(() => {
    if (startedAt === null || won) return
    const tick = () => setElapsedMs(Date.now() - startedAt)
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [startedAt, won])

  useEffect(() => {
    if (won && startedAt !== null) setFrozenElapsedMs(Date.now() - startedAt)
  }, [won, startedAt])

  const displayElapsedMs = frozenElapsedMs ?? elapsedMs

  const candidates = useMemo(
    () => (state && selection ? movesFromSource(legalMoves, selection) : []),
    [state, selection, legalMoves],
  )
  const highlightKeys = useMemo(
    () => (state ? highlightedTargetKeys(state, candidates) : new Set<string>()),
    [state, candidates],
  )
  const movableKeys = useMemo(() => selectableSourceKeys(legalMoves), [legalMoves])

  const canDraw = canDrawFrom(legalMoves)
  const hasCardMove = hasCardMoveFrom(legalMoves)
  const canUndo = canUndoHistory(history) && !won

  const result: WordSolitaireResult | null = useMemo(() => {
    if (!won || !state || !deal) return null
    return {
      turns: state.turns,
      minTurns: deal.solution.minTurns,
      stars: rateTurns(state.turns, deal.solution.minTurns),
      difficulty: deal.difficulty,
      seed: deal.seed,
      elapsedMs: frozenElapsedMs ?? 0,
    }
  }, [won, state, deal, frozenElapsedMs])

  // ── 조작 ────────────────────────────────────────────────
  const commit = useCallback((next: SolitaireState, previous: SolitaireState) => {
    setHistory(prev => pushHistory(prev, previous))
    setState(next)
    setSelection(null)
    // 첫 수에 시계를 켠다
    setStartedAt(prev => prev ?? Date.now())
  }, [])

  const flagRejected = useCallback(
    (key: string) => {
      clearRejectTimer()
      setRejectedKey(key)
      rejectTimerRef.current = window.setTimeout(() => {
        setRejectedKey(null)
        rejectTimerRef.current = null
      }, REJECT_FEEDBACK_MS)
    },
    [clearRejectTimer],
  )

  /** 카드 탭 — 목적지가 하나뿐이면 곧바로 이동, 여럿이면 선택 상태로 남는다 */
  const tapCard = useCallback(
    (source: MoveSource, key: string) => {
      if (!state || won) return
      const next = selectSource(selection, source, legalMoves)
      if (next.rejected) {
        flagRejected(key)
        return
      }
      setSelection(next.selection)
      if (next.move) commit(applyMove(state, next.move), state)
    },
    [state, won, selection, legalMoves, commit, flagRejected],
  )

  /** 목적지(기초 슬롯·테이블로 열) 탭 */
  const tapTarget = useCallback(
    (target: MoveTarget, key: string) => {
      if (!state || won) return
      const move = resolveTarget(state, selection, target, legalMoves)
      if (!move) {
        if (selection) flagRejected(key)
        return
      }
      commit(applyMove(state, move), state)
    },
    [state, won, selection, legalMoves, commit, flagRejected],
  )

  const draw = useCallback(() => {
    if (!state || won || !canDraw) return
    commit(applyMove(state, { kind: 'draw' }), state)
  }, [state, won, canDraw, commit])

  /** 되돌리기 — 직전 상태를 복원하되 턴은 1 늘어난다 (계획서 §2) */
  const undo = useCallback(() => {
    if (!state || won) return
    const undone = undoHistory(history, state)
    if (!undone) return
    setHistory(undone.history)
    setState(undone.state)
    setSelection(null)
  }, [state, won, history])

  /** 다시 하기 — 같은 날의 같은 판을 처음부터 (리더보드 공정성상 새 판을 뽑지 않는다) */
  const restart = useCallback(() => {
    if (!deal) return
    setState(deal.state)
    setHistory(emptyHistory())
    setSelection(null)
    clearRejectTimer()
    setRejectedKey(null)
    setStartedAt(null)
    setElapsedMs(0)
    setFrozenElapsedMs(null)
  }, [deal, clearRejectTimer])

  /**
   * 드래그로 놓기 — 집은 카드를 지정한 자리에 직접 내려놓는다.
   * 탭 조작과 달리 선택 상태를 거치지 않고 출발지·목적지를 한 번에 받는다.
   */
  const dropOn = useCallback(
    (source: MoveSource, target: MoveTarget, targetKeyForShake: string) => {
      if (!state || won) return false
      const move = resolveTarget(state, source, target, legalMoves)
      if (!move) {
        flagRejected(targetKeyForShake)
        return false
      }
      commit(applyMove(state, move), state)
      return true
    },
    [state, won, legalMoves, commit, flagRejected],
  )

  return {
    deal,
    state,
    elapsedMs: displayElapsedMs,
    dropOn,
    isDealing,
    hasDealError,
    selection,
    rejectedKey,
    highlightKeys,
    movableKeys,
    canDraw,
    hasCardMove,
    canUndo,
    won,
    result,
    tapCard,
    tapTarget,
    draw,
    undo,
    restart,
  }
}
