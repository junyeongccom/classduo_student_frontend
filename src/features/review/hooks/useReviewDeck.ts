'use client'

import { useEffect, useMemo, useCallback, useRef } from 'react'
import type { LectureReviewItem } from '@/features/review/types'
import { useReviewStore } from '@/features/review/store/useReviewStore'
import { useAuthStore } from '@/features/auth/store/authStore'
import {
  buildDeckOrder,
  countDeckLevels,
  areAllItemsLevel4,
  getNextDeckLevel,
  type DeckLevel,
  type DeckRating,
  type DeckSession,
} from '@/features/review/domain/deck'

export interface ReviewDeckViewModel {
  hasLecture: boolean
  reviewItemsCount: number
  levelCounts: Record<DeckLevel, number>
  roundTotal: number
  roundCursor: number
  roundCompleted: boolean
  allCompleted: boolean
  currentItem: LectureReviewItem | null
  currentLevel: DeckLevel | null
  // 현재 카드의 앞면이 무엇인지: 'keyword' | 'description'
  currentCardSide: 'keyword' | 'description'
  rateCurrent: (rating: DeckRating) => void
  restartRound: () => void
}

function safeUserId(userId: string | undefined | null) {
  return userId && userId.trim() ? userId : 'guest'
}

function normalizeSessionOrder(order: string[], validIds: Set<string>): string[] {
  return order.filter((id) => validIds.has(id))
}

export function useReviewDeck(lectureId: string | null, reviewItems: LectureReviewItem[]): ReviewDeckViewModel {
  const userId = safeUserId(useAuthStore((s) => s.user?.user_id))

  const deckState = useReviewStore((s) => (lectureId ? s.deckByUserId[userId]?.[lectureId] : undefined))
  const ensureDeckState = useReviewStore((s) => s.ensureDeckState)
  const ensureDeckLevels = useReviewStore((s) => s.ensureDeckLevels)
  const setDeckItemLevel = useReviewStore((s) => s.setDeckItemLevel)
  const setDeckSession = useReviewStore((s) => s.setDeckSession)
  const resetAllDeckLevels = useReviewStore((s) => s.resetAllDeckLevels)

  const itemIds = useMemo(() => reviewItems.map((it) => it.id), [reviewItems])
  const itemIdSet = useMemo(() => new Set(itemIds), [itemIds])

  // Ensure base structure exists
  useEffect(() => {
    if (!lectureId) return
    ensureDeckState(userId, lectureId)
  }, [ensureDeckState, lectureId, userId])

  // Ensure default level(1) for all known items
  useEffect(() => {
    if (!lectureId) return
    if (itemIds.length === 0) return
    ensureDeckLevels(userId, lectureId, itemIds)
  }, [ensureDeckLevels, lectureId, userId, itemIds])

  const levelsByItemId = deckState?.levelsByItemId || {}
  const session = deckState?.session || null

  // levelsByItemId의 변경을 추적하기 위한 ref
  const prevLevelsByItemIdRef = useRef<string>('')
  const levelsByItemIdKey = useMemo(() => {
    const keys = Object.keys(levelsByItemId).sort()
    const values = keys.map(k => `${k}:${levelsByItemId[k]}`).join(',')
    return values
  }, [levelsByItemId])

  // If there is a session, keep it valid when items change (remove deleted ids, clamp cursor)
  useEffect(() => {
    if (!lectureId) return
    if (!session) return
    const nextOrder = normalizeSessionOrder(session.order, itemIdSet)
    const nextCursor = Math.min(session.cursor, nextOrder.length)
    const needsUpdate = nextOrder.length !== session.order.length || nextCursor !== session.cursor
    if (!needsUpdate) return

    const nextSession: DeckSession = {
      ...session,
      order: nextOrder,
      cursor: nextCursor,
    }
    setDeckSession(userId, lectureId, nextSession)
  }, [lectureId, session, itemIdSet, setDeckSession, userId])

  const startOrRestartRound = useCallback(() => {
    if (!lectureId) return
    const order = buildDeckOrder(reviewItems, levelsByItemId, { excludeLevel4: true })
    const now = Date.now()
    
    // 각 아이템의 앞뒷면을 랜덤하게 결정
    const cardSides: Record<string, 'keyword' | 'description'> = {}
    for (const itemId of order) {
      // 50% 확률로 단어가 앞면 또는 설명이 앞면
      cardSides[itemId] = Math.random() < 0.5 ? 'keyword' : 'description'
    }
    
    const nextSession: DeckSession = {
      order,
      cursor: 0,
      startedAt: now,
      completedAt: order.length === 0 ? now : undefined,
      cardSides,
    }
    setDeckSession(userId, lectureId, nextSession)
  }, [lectureId, levelsByItemId, reviewItems, setDeckSession, userId])

  // Auto-start session if missing (policy: list already loaded first, so this is safe)
  // 단, 기존 세션이 있고 완료되지 않았다면 유지 (게임 중단 후 재개)
  useEffect(() => {
    if (!lectureId) return
    if (reviewItems.length === 0) return
    
    // itemIdSet을 여기서 생성하여 의존성 문제 방지
    const currentItemIdSet = new Set(itemIds)
    
    // 기존 세션이 있고 완료되지 않았으며, 현재 아이템이 유효하면 유지
    if (session && !session.completedAt && session.cursor < session.order.length) {
      const currentItemId = session.order[session.cursor]
      const isValidItem = currentItemIdSet.has(currentItemId)
      if (isValidItem) {
        // 유효한 세션이면 그대로 유지
        prevLevelsByItemIdRef.current = levelsByItemIdKey
        return
      }
    }
    
    // levelsByItemId가 변경되지 않았고 세션이 이미 있으면 재실행 방지
    if (session && prevLevelsByItemIdRef.current === levelsByItemIdKey) {
      return
    }
    
    // 세션이 없거나 유효하지 않으면 새로 시작
    const shouldStartNewSession = 
      !session || 
      session.completedAt !== undefined || 
      session.cursor >= session.order.length
    
    if (shouldStartNewSession) {
      // useEffect 내에서 직접 세션 생성 로직 구현하여 의존성 문제 방지
      const order = buildDeckOrder(reviewItems, levelsByItemId, { excludeLevel4: true })
      const now = Date.now()
      
      // 각 아이템의 앞뒷면을 랜덤하게 결정
      const cardSides: Record<string, 'keyword' | 'description'> = {}
      for (const itemId of order) {
        cardSides[itemId] = Math.random() < 0.5 ? 'keyword' : 'description'
      }
      
      const nextSession: DeckSession = {
        order,
        cursor: 0,
        startedAt: now,
        completedAt: order.length === 0 ? now : undefined,
        cardSides,
      }
      setDeckSession(userId, lectureId, nextSession)
      prevLevelsByItemIdRef.current = levelsByItemIdKey
    }
  }, [
    lectureId, 
    reviewItems.length, 
    itemIds, 
    levelsByItemId,
    levelsByItemIdKey,
    session?.cursor,
    session?.completedAt,
    session?.order?.length,
    setDeckSession, 
    userId
  ])

  const currentItemId = session?.order?.[session.cursor] || null
  const currentItem = useMemo(() => {
    if (!currentItemId) return null
    return reviewItems.find((it) => it.id === currentItemId) || null
  }, [currentItemId, reviewItems])

  const currentLevel: DeckLevel | null = currentItem ? (levelsByItemId[currentItem.id] ?? 2) : null
  
  // 현재 카드의 앞면 정보 (기본값은 'keyword')
  const currentCardSide: 'keyword' | 'description' = useMemo(() => {
    if (!currentItemId || !session?.cardSides) return 'keyword'
    return session.cardSides[currentItemId] || 'keyword'
  }, [currentItemId, session])

  const levelCounts = useMemo(() => countDeckLevels(reviewItems, levelsByItemId), [reviewItems, levelsByItemId])
  const allCompleted = useMemo(() => areAllItemsLevel4(reviewItems, levelsByItemId), [reviewItems, levelsByItemId])

  const roundTotal = session?.order?.length ?? 0
  const roundCursor = session?.cursor ?? 0
  const roundCompleted = Boolean(session && roundCursor >= roundTotal)

  const rateCurrent = useCallback(
    (rating: DeckRating) => {
      if (!lectureId) return
      if (!session) return
      if (session.cursor >= session.order.length) return
      const itemId = session.order[session.cursor]
      const current = levelsByItemId[itemId] ?? 2
      const nextLevel = getNextDeckLevel(current, rating)
      setDeckItemLevel(userId, lectureId, itemId, nextLevel)

      const nextCursor = session.cursor + 1
      const now = Date.now()
      const nextSession: DeckSession = {
        ...session,
        cursor: nextCursor,
        completedAt: nextCursor >= session.order.length ? now : session.completedAt,
      }
      setDeckSession(userId, lectureId, nextSession)
    },
    [lectureId, levelsByItemId, session, setDeckItemLevel, setDeckSession, userId]
  )

  const restartRound = useCallback(() => {
    if (!lectureId) return
    
    // 모든 단어가 4단계일 때는 모든 단어를 1단계로 되돌림
    if (allCompleted) {
      resetAllDeckLevels(userId, lectureId, itemIds)
      // resetAllDeckLevels가 세션을 null로 설정하므로, 
      // 업데이트된 levelsByItemId를 기반으로 새 세션을 시작
      // Zustand 상태 업데이트는 동기적이므로 getState()로 즉시 가져올 수 있음
      const updatedState = useReviewStore.getState()
      const updatedDeckState = updatedState.deckByUserId[userId]?.[lectureId]
      const updatedLevels = updatedDeckState?.levelsByItemId || {}
      const order = buildDeckOrder(reviewItems, updatedLevels, { excludeLevel4: true })
      const now = Date.now()
      
      // 각 아이템의 앞뒷면을 랜덤하게 결정
      const cardSides: Record<string, 'keyword' | 'description'> = {}
      for (const itemId of order) {
        cardSides[itemId] = Math.random() < 0.5 ? 'keyword' : 'description'
      }
      
      const nextSession: DeckSession = {
        order,
        cursor: 0,
        startedAt: now,
        completedAt: order.length === 0 ? now : undefined,
        cardSides,
      }
      setDeckSession(userId, lectureId, nextSession)
      return
    }
    
    // 일반적인 재시작 (라운드 완료 후)
    startOrRestartRound()
  }, [allCompleted, itemIds, lectureId, resetAllDeckLevels, reviewItems, setDeckSession, startOrRestartRound, userId])

  return {
    hasLecture: Boolean(lectureId),
    reviewItemsCount: reviewItems.length,
    levelCounts,
    roundTotal,
    roundCursor,
    roundCompleted,
    allCompleted,
    currentItem,
    currentLevel,
    currentCardSide,
    rateCurrent,
    restartRound,
  }
}


