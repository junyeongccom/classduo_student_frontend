'use client'

import { useEffect, useMemo, useCallback } from 'react'
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
    const nextSession: DeckSession = {
      order,
      cursor: 0,
      startedAt: now,
      completedAt: order.length === 0 ? now : undefined,
    }
    setDeckSession(userId, lectureId, nextSession)
  }, [lectureId, levelsByItemId, reviewItems, setDeckSession, userId])

  // Auto-start session if missing (policy: list already loaded first, so this is safe)
  useEffect(() => {
    if (!lectureId) return
    if (session) return
    if (reviewItems.length === 0) return
    startOrRestartRound()
  }, [lectureId, reviewItems.length, session, startOrRestartRound])

  const currentItemId = session?.order?.[session.cursor] || null
  const currentItem = useMemo(() => {
    if (!currentItemId) return null
    return reviewItems.find((it) => it.id === currentItemId) || null
  }, [currentItemId, reviewItems])

  const currentLevel: DeckLevel | null = currentItem ? (levelsByItemId[currentItem.id] ?? 1) : null

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
      const current = levelsByItemId[itemId] ?? 1
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
    rateCurrent,
    restartRound: startOrRestartRound,
  }
}


