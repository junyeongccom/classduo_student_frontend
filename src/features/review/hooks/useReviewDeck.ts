'use client'

import { useEffect, useMemo, useCallback, useRef } from 'react'
import type { LectureReviewItem } from '@/features/review/types'
import { useReviewStore } from '@/features/review/store/useReviewStore'
import { useAuthStore } from '@/features/auth/store/authStore'
import {
  countDeckLevels,
  getNextDeckLevel,
  type DeckLevel,
  type DeckMode,
  type DeckRating,
  type DeckSession,
} from '@/features/review/domain/deck'

export interface ReviewDeckViewModel {
  hasLecture: boolean
  reviewItemsCount: number
  levelCounts: Record<DeckLevel, number>
  currentItem: LectureReviewItem | null
  itemsByLevel: Record<DeckLevel, LectureReviewItem[]>
  mode: DeckMode
  rateCurrent: (rating: DeckRating) => void
  resetDeck: () => void
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

  function buildListOrderIds(items: LectureReviewItem[]): string[] {
    // '목록' 순서 = API 반환 순서 (reviewItems 배열 순서)
    return items.map((it) => it.id)
  }

  function initCycleSession(opts: { cycleNo: number; ids: string[] }): DeckSession {
    const now = Date.now()
    return {
      order: [...opts.ids], // 큐
      cursor: 0,
      startedAt: now,
      mode: 'basic',
      phase: 'cycle',
      unresolvedIds: [...opts.ids],
      wrongIds: [],
      cycleNo: opts.cycleNo,
    }
  }

  function initWeakSession(opts: { cycleNo: number; ids: string[] }): DeckSession {
    const now = Date.now()
    return {
      order: [...opts.ids], // 큐
      cursor: 0,
      startedAt: now,
      mode: 'lowest',
      phase: 'weak',
      unresolvedIds: [...opts.ids],
      cycleNo: opts.cycleNo,
    }
  }

  // Auto-start session if missing (new policy)
  useEffect(() => {
    if (!lectureId) return
    if (reviewItems.length === 0) return

    const baseOrder = buildListOrderIds(reviewItems)

    // 기존 세션이 있고, 최소한의 필드가 유효하면 그대로 사용
    if (session && Array.isArray(session.order) && session.order.length > 0) return

    // 세션이 없거나 유효하지 않으면 새로 생성
    // 중복 set 방지(동일 order 구성)
    if (prevSessionKeyRef.current === sessionKey && session) return

    // 초기: 1사이클(전체 사이클) 시작
    const nextSession = initCycleSession({ cycleNo: 1, ids: baseOrder })
    setDeckSession(userId, lectureId, nextSession)
    prevSessionKeyRef.current = sessionKey
  }, [
    lectureId, 
    reviewItems.length, 
    sessionKey,
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

  const resetAllDeckLevels = useReviewStore((s) => s.resetAllDeckLevels)

  const rateCurrent = useCallback(
    (rating: DeckRating) => {
      if (!lectureId) return
      if (!session) return
      if (session.order.length === 0) return
      // 큐의 앞에서 현재 아이템 선택 (cursor=0 고정)
      const itemId = session.order[0]
      if (!itemId) return

      const phase = session.phase ?? 'cycle'
      const cycleNo = session.cycleNo ?? 1
      const baseOrder = buildListOrderIds(reviewItems)

      // unresolved/wrong 상태
      const unresolved = new Set<string>(session.unresolvedIds ?? baseOrder)
      const wrong = new Set<string>(session.wrongIds ?? [])

      // 레벨 업데이트(현행 유지): okay는 레벨 변화 없음
      if (rating !== 'okay') {
        const current = levelsByItemId[itemId] ?? 2
        const nextLevel = getNextDeckLevel(current, rating)
        setDeckItemLevel(userId, lectureId, itemId, nextLevel)
      }

      // 큐 업데이트
      const restQueue = session.order.slice(1)

      if (phase === 'cycle') {
        if (rating === 'bad') wrong.add(itemId)
        if (rating === 'good' || rating === 'bad') {
          unresolved.delete(itemId)
          // 결론이 났으므로 큐에서 제거(재질문 없음)
        } else {
          // okay: 판단 보류 → 뒤로 보내 재질문
          restQueue.push(itemId)
        }

        // 1사이클 종료 조건: 모든 단어가 good/bad 결론을 얻음(=unresolved empty)
        if (unresolved.size === 0) {
          const wrongIdsInOrder = baseOrder.filter((id) => wrong.has(id))
          if (wrongIdsInOrder.length === 0) {
            // 취약 대상이 없으면 곧바로 다음 전체 사이클 시작
            setDeckSession(userId, lectureId, initCycleSession({ cycleNo: cycleNo + 1, ids: baseOrder }))
            return
          }
          setDeckSession(userId, lectureId, initWeakSession({ cycleNo, ids: wrongIdsInOrder }))
          return
        }

        // 안전장치: 큐가 비었는데 unresolved가 남아있으면 unresolved로 큐 재구성
        const nextQueue = restQueue.length > 0 ? restQueue : baseOrder.filter((id) => unresolved.has(id))

        setDeckSession(userId, lectureId, {
          ...session,
          mode: 'basic',
          phase: 'cycle',
          order: nextQueue,
          cursor: 0,
          unresolvedIds: [...unresolved],
          wrongIds: [...wrong],
          cycleNo,
        })
        return
      }

      // 취약 사이클: 목표는 각 단어에서 good을 1번씩 얻는 것
      if (rating === 'good') {
        unresolved.delete(itemId)
        // good이면 반드시 1단계 전진(현행 +1) -> 이미 위에서 적용됨
        // 큐에서 제거
      } else {
        // bad/okay: 나중에 다시 물어보기(큐 뒤로)
        restQueue.push(itemId)
      }

      if (unresolved.size === 0) {
        // 취약 사이클 종료 → 다음 전체 사이클 시작
        setDeckSession(userId, lectureId, initCycleSession({ cycleNo: cycleNo + 1, ids: baseOrder }))
        return
      }

      const nextQueue = restQueue.length > 0 ? restQueue : baseOrder.filter((id) => unresolved.has(id))
      setDeckSession(userId, lectureId, {
        ...session,
        mode: 'lowest',
        phase: 'weak',
        order: nextQueue,
        cursor: 0,
        unresolvedIds: [...unresolved],
        wrongIds: [],
        cycleNo,
      })
    },
    [lectureId, levelsByItemId, reviewItems, session, setDeckItemLevel, setDeckSession, userId]
  )

  const resetDeck = useCallback(() => {
    if (!lectureId) return
    if (reviewItems.length === 0) return
    
    // 모든 단어를 레벨 2(복습 중)로 초기화
    resetAllDeckLevels(userId, lectureId, itemIds)

    // 초기화 후 1사이클 재시작: '목록(=API 순서)'로 큐 생성
    const baseOrder = buildListOrderIds(reviewItems)
    setDeckSession(userId, lectureId, initCycleSession({ cycleNo: 1, ids: baseOrder }))
  }, [lectureId, reviewItems, itemIds, resetAllDeckLevels, setDeckSession, userId])

  const mode = (session?.mode ?? 'basic') as DeckMode

  return {
    hasLecture: Boolean(lectureId),
    reviewItemsCount: reviewItems.length,
    levelCounts,
    currentItem,
    itemsByLevel,
    mode,
    rateCurrent,
    resetDeck,
  }
}


