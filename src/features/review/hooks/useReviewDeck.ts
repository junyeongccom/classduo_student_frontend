'use client'

import { useEffect, useMemo, useCallback, useRef } from 'react'
import type { LectureReviewItem } from '@/features/review/types'
import { useReviewStore } from '@/features/review/store/useReviewStore'
import { useAuthStore } from '@/features/auth/store/authStore'
import {
  buildDeckOrder,
  findLowestLevel,
  countDeckLevels,
  getNextDeckLevel,
  type DeckLevel,
  type DeckRating,
  type DeckSession,
} from '@/features/review/domain/deck'

export interface ReviewDeckViewModel {
  hasLecture: boolean
  reviewItemsCount: number
  levelCounts: Record<DeckLevel, number>
  currentItem: LectureReviewItem | null
  itemsByLevel: Record<DeckLevel, LectureReviewItem[]>
  rateCurrent: (rating: DeckRating) => void
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

  // 세션 자동 생성(무한 반복 모델): 동일 조건에서 중복 setDeckSession 방지
  const prevSessionKeyRef = useRef<string>('')
  const sessionKey = useMemo(() => {
    // lectureId별로 reviewItems/order 구성이 바뀌었는지 감지하기 위한 키
    return itemIds.join(',')
  }, [itemIds])

  // If there is a session, keep it valid when items change (remove deleted ids, clamp cursor)
  useEffect(() => {
    if (!lectureId) return
    if (!session) return
    const nextOrder = normalizeSessionOrder(session.order, itemIdSet)
    const nextCursor = nextOrder.length === 0 ? 0 : Math.min(session.cursor, nextOrder.length - 1)
    const needsUpdate = nextOrder.length !== session.order.length || nextCursor !== session.cursor
    if (!needsUpdate) return

    const nextSession: DeckSession = {
      ...session,
      order: nextOrder,
      cursor: nextCursor,
    }
    setDeckSession(userId, lectureId, nextSession)
  }, [lectureId, session, itemIdSet, setDeckSession, userId])

  // Auto-start session if missing (무한 반복)
  useEffect(() => {
    if (!lectureId) return
    if (reviewItems.length === 0) return

    // 세션이 있고 현재 커서가 유효하면 그대로 사용
    // 단, 현재 order의 단어들이 더 이상 가장 낮은 단계가 아니면 재구성
    if (session && session.order.length > 0 && session.cursor >= 0 && session.cursor < session.order.length) {
      const currentItemId = session.order[session.cursor]
      const currentItemLevel = levelsByItemId[currentItemId] ?? 2
      const lowestLevel = findLowestLevel(reviewItems, levelsByItemId)
      
      // 현재 order의 단어들이 더 이상 가장 낮은 단계가 아니면 재구성
      if (lowestLevel && currentItemLevel !== lowestLevel) {
        const desiredOrder = buildDeckOrder(reviewItems, levelsByItemId)
        const nextSession: DeckSession = {
          ...session,
          order: desiredOrder,
          cursor: 0,
        }
        setDeckSession(userId, lectureId, nextSession)
      }
      return
    }

    // 세션이 없거나 유효하지 않으면 새로 생성
    // 중복 set 방지(동일 order 구성)
    if (prevSessionKeyRef.current === sessionKey && session) return

    const order = buildDeckOrder(reviewItems, levelsByItemId)
    const now = Date.now()
    const nextSession: DeckSession = {
      order,
      cursor: 0,
      startedAt: now,
      // completedAt/cardSides는 더 이상 사용하지 않음(하위호환을 위해 남길 수 있음)
    }
    setDeckSession(userId, lectureId, nextSession)
    prevSessionKeyRef.current = sessionKey
  }, [
    lectureId, 
    reviewItems.length, 
    session?.cursor,
    session?.order?.length,
    sessionKey,
    itemIds,
    levelsByItemId,
    session,
    setDeckSession, 
    userId
  ])

  const currentItemId = session?.order?.[session.cursor] || null
  const currentItem = useMemo(() => {
    if (!currentItemId) return null
    return reviewItems.find((it) => it.id === currentItemId) || null
  }, [currentItemId, reviewItems])

  const levelCounts = useMemo(() => countDeckLevels(reviewItems, levelsByItemId), [reviewItems, levelsByItemId])

  const itemsByLevel = useMemo(() => {
    const buckets: Record<DeckLevel, LectureReviewItem[]> = { 1: [], 2: [], 3: [], 4: [] }
    for (const it of reviewItems) {
      const lv = (levelsByItemId[it.id] ?? 2) as DeckLevel
      buckets[lv].push(it)
    }
    return buckets
  }, [reviewItems, levelsByItemId])

  const rateCurrent = useCallback(
    (rating: DeckRating) => {
      if (!lectureId) return
      if (!session) return
      if (session.order.length === 0) return
      if (session.cursor < 0 || session.cursor >= session.order.length) return
      const itemId = session.order[session.cursor]
      const current = levelsByItemId[itemId] ?? 2
      const nextLevel = getNextDeckLevel(current, rating)
      setDeckItemLevel(userId, lectureId, itemId, nextLevel)

      // 업데이트된 levelsByItemId를 가져오기 위해 getState 사용
      const updatedState = useReviewStore.getState()
      const updatedDeckState = updatedState.deckByUserId[userId]?.[lectureId]
      const updatedLevels = updatedDeckState?.levelsByItemId || { ...levelsByItemId, [itemId]: nextLevel }
      
      // 현재 단계의 다음 단어로 이동
      const nextCursor = session.cursor + 1
      
      // 현재 단계의 모든 단어를 제시했는지 확인
      const isCurrentLevelComplete = nextCursor >= session.order.length
      
      let finalOrder = session.order
      let finalCursor = nextCursor
      
      if (isCurrentLevelComplete) {
        // 현재 단계의 한 바퀴가 끝났으므로, 다시 가장 낮은 단계를 찾아서 그 단계의 단어들로 재구성
        const lowestLevel = findLowestLevel(reviewItems, updatedLevels)
        if (lowestLevel) {
          finalOrder = buildDeckOrder(reviewItems, updatedLevels)
          finalCursor = 0
        } else {
          // 모든 단어가 없어진 경우 (이론적으로는 발생하지 않아야 함)
          finalOrder = []
          finalCursor = 0
        }
      } else {
        // 현재 단계의 단어들이 레벨이 변경되어 order에 없을 수 있으므로 확인
        const currentItemIdInOrder = session.order[nextCursor]
        const currentItemLevel = updatedLevels[currentItemIdInOrder] ?? 2
        const currentLowestLevel = findLowestLevel(reviewItems, updatedLevels)
        
        // 현재 order의 다음 단어가 더 이상 가장 낮은 단계가 아니면, 새로운 가장 낮은 단계로 전환
        if (currentLowestLevel && currentItemLevel !== currentLowestLevel) {
          finalOrder = buildDeckOrder(reviewItems, updatedLevels)
          finalCursor = 0
        }
      }
      
      const now = Date.now()
      const nextSession: DeckSession = {
        ...session,
        order: finalOrder,
        cursor: finalCursor,
        startedAt: session.startedAt ?? now,
      }
      setDeckSession(userId, lectureId, nextSession)
    },
    [lectureId, levelsByItemId, reviewItems, session, setDeckItemLevel, setDeckSession, userId]
  )

  return {
    hasLecture: Boolean(lectureId),
    reviewItemsCount: reviewItems.length,
    levelCounts,
    currentItem,
    itemsByLevel,
    rateCurrent,
  }
}


