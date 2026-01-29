'use client'

import { useEffect, useMemo, useCallback, useRef } from 'react'
import type { LectureReviewItem } from '@/features/review/types'
import { useReviewStore } from '@/features/review/store/useReviewStore'
import { useAuthStore } from '@/features/auth/store/authStore'
import {
  buildDeckOrder,
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
    if (session && session.order.length > 0 && session.cursor >= 0 && session.cursor < session.order.length) {
      // order가 API 순서와 달라졌으면, 현재 itemId를 기준으로 cursor를 보정
      const desiredOrder = buildDeckOrder(reviewItems, levelsByItemId)
      const currentItemId = session.order[session.cursor]
      const desiredCursor = desiredOrder.indexOf(currentItemId)
      const nextCursor = desiredCursor >= 0 ? desiredCursor : 0
      const sameOrder = desiredOrder.length === session.order.length && desiredOrder.every((id, i) => id === session.order[i])
      const needsUpdate = !sameOrder || nextCursor !== session.cursor

      if (needsUpdate) {
        const nextSession: DeckSession = {
          ...session,
          order: desiredOrder,
          cursor: desiredOrder.length === 0 ? 0 : nextCursor,
        }
        setDeckSession(userId, lectureId, nextSession)
      }
      return
    }

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

      const nextCursor = (session.cursor + 1) % session.order.length
      const now = Date.now()
      const nextSession: DeckSession = {
        ...session,
        cursor: nextCursor,
        startedAt: session.startedAt ?? now,
      }
      setDeckSession(userId, lectureId, nextSession)
    },
    [lectureId, levelsByItemId, session, setDeckItemLevel, setDeckSession, userId]
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


