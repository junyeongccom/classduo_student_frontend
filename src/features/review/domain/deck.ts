import type { LectureReviewItem } from '@/features/review/types'

export type DeckLevel = 1 | 2 | 3 | 4
export type DeckRating = 'good' | 'okay' | 'bad'

export type DeckMode = 'basic' | 'lowest'

export interface DeckSession {
  order: string[] // LectureReviewItem.id[]
  cursor: number
  startedAt: number
  completedAt?: number
  // 각 아이템의 앞뒷면 정보: itemId -> 'keyword' | 'description'
  // 'keyword'면 단어가 앞면, 'description'이면 설명이 앞면
  cardSides?: Record<string, 'keyword' | 'description'>
  // 현재 모드: 'basic' (모든 단계) 또는 'lowest' (가장 낮은 단계만)
  mode?: DeckMode
}

export type DeckLevelsByItemId = Record<string, DeckLevel>

export function clampDeckLevel(level: number): DeckLevel {
  if (level <= 1) return 1
  if (level === 2) return 2
  if (level === 3) return 3
  return 4
}

export function getNextDeckLevel(current: DeckLevel, rating: DeckRating): DeckLevel {
  if (rating === 'good') return clampDeckLevel(current + 1)
  if (rating === 'bad') {
    // 숙련됨(4)에서 틀렸어요를 누르면 바로 전 단계가 아니라 복습 중(2)으로 이동
    if (current === 4) return 2
    return clampDeckLevel(current - 1)
  }
  return current
}

/**
 * 현재 가장 낮은 단계를 찾는다.
 */
export function findLowestLevel(
  reviewItems: LectureReviewItem[],
  levelsByItemId: DeckLevelsByItemId
): DeckLevel | null {
  if (reviewItems.length === 0) return null
  
  for (const level of [1, 2, 3, 4] as DeckLevel[]) {
    const hasItems = reviewItems.some((item) => (levelsByItemId[item.id] ?? 2) === level)
    if (hasItems) return level
  }
  
  return null
}

/**
 * 특정 단계의 단어들만 반환한다 (같은 단계 내에서는 API 순서 유지).
 */
export function buildDeckOrderForLevel(
  reviewItems: LectureReviewItem[],
  levelsByItemId: DeckLevelsByItemId,
  targetLevel: DeckLevel
): string[] {
  const items = reviewItems.filter((item) => (levelsByItemId[item.id] ?? 2) === targetLevel)
  return items.map((it) => it.id)
}

/**
 * 기본 모드: 모든 단계의 단어들을 가장 낮은 단계부터 높은 단계 순서로 반환
 */
export function buildDeckOrderBasic(
  reviewItems: LectureReviewItem[],
  levelsByItemId: DeckLevelsByItemId
): string[] {
  // 단계별로 분류 (1, 2, 3, 4 순서)
  const byLevel: Record<DeckLevel, LectureReviewItem[]> = { 1: [], 2: [], 3: [], 4: [] }
  
  for (const item of reviewItems) {
    const level = (levelsByItemId[item.id] ?? 2) as DeckLevel
    byLevel[level].push(item)
  }
  
  // 가장 낮은 단계부터 순서대로 합치기
  const result: string[] = []
  for (const level of [1, 2, 3, 4] as DeckLevel[]) {
    result.push(...byLevel[level].map((it) => it.id))
  }
  
  return result
}

/**
 * 최저 모드: 가장 낮은 단계의 단어들만 반환
 */
export function buildDeckOrderLowest(
  reviewItems: LectureReviewItem[],
  levelsByItemId: DeckLevelsByItemId
): string[] {
  const lowestLevel = findLowestLevel(reviewItems, levelsByItemId)
  if (!lowestLevel) return []
  
  return buildDeckOrderForLevel(reviewItems, levelsByItemId, lowestLevel)
}

export function buildDeckOrder(
  reviewItems: LectureReviewItem[],
  levelsByItemId: DeckLevelsByItemId,
  options?: { excludeLevel4?: boolean }
): string[] {
  // 하위호환을 위해 유지 (기본적으로 최저 모드)
  return buildDeckOrderLowest(reviewItems, levelsByItemId)
}

export function countDeckLevels(
  reviewItems: LectureReviewItem[],
  levelsByItemId: DeckLevelsByItemId
): Record<DeckLevel, number> {
  const counts: Record<DeckLevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
  for (const item of reviewItems) {
    const level = levelsByItemId[item.id] ?? 2
    counts[level] += 1
  }
  return counts
}

export function areAllItemsLevel4(reviewItems: LectureReviewItem[], levelsByItemId: DeckLevelsByItemId): boolean {
  if (reviewItems.length === 0) return false
  return reviewItems.every((item) => (levelsByItemId[item.id] ?? 2) === 4)
}


