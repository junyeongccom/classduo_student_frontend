import type { LectureReviewItem } from '@/features/review/types'

export type DeckLevel = 1 | 2 | 3 | 4
export type DeckRating = 'good' | 'okay' | 'bad'

export interface DeckSession {
  order: string[] // LectureReviewItem.id[]
  cursor: number
  startedAt: number
  completedAt?: number
  // 각 아이템의 앞뒷면 정보: itemId -> 'keyword' | 'description'
  // 'keyword'면 단어가 앞면, 'description'이면 설명이 앞면
  cardSides?: Record<string, 'keyword' | 'description'>
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
  if (rating === 'bad') return clampDeckLevel(current - 1)
  return current
}

export function buildDeckOrder(
  reviewItems: LectureReviewItem[],
  levelsByItemId: DeckLevelsByItemId,
  options?: { excludeLevel4?: boolean }
): string[] {
  const excludeLevel4 = options?.excludeLevel4 ?? true

  const level1: string[] = []
  const level2: string[] = []
  const level3: string[] = []
  const level4: string[] = []

  for (const item of reviewItems) {
    const level = levelsByItemId[item.id] ?? 1
    if (level === 1) level1.push(item.id)
    else if (level === 2) level2.push(item.id)
    else if (level === 3) level3.push(item.id)
    else level4.push(item.id)
  }

  if (excludeLevel4) return [...level1, ...level2, ...level3]
  return [...level1, ...level2, ...level3, ...level4]
}

export function countDeckLevels(
  reviewItems: LectureReviewItem[],
  levelsByItemId: DeckLevelsByItemId
): Record<DeckLevel, number> {
  const counts: Record<DeckLevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
  for (const item of reviewItems) {
    const level = levelsByItemId[item.id] ?? 1
    counts[level] += 1
  }
  return counts
}

export function areAllItemsLevel4(reviewItems: LectureReviewItem[], levelsByItemId: DeckLevelsByItemId): boolean {
  if (reviewItems.length === 0) return false
  return reviewItems.every((item) => (levelsByItemId[item.id] ?? 1) === 4)
}


