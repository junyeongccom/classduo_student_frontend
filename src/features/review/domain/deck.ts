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
  if (rating === 'bad') {
    // 숙련됨(4)에서 틀렸어요를 누르면 바로 전 단계가 아니라 복습 중(2)으로 이동
    if (current === 4) return 2
    return clampDeckLevel(current - 1)
  }
  return current
}

export function buildDeckOrder(
  reviewItems: LectureReviewItem[],
  levelsByItemId: DeckLevelsByItemId,
  options?: { excludeLevel4?: boolean }
): string[] {
  // 단계와 무관하게 항상 API 순서(reviewItems 배열 순서)대로 제시한다.
  // options/levelsByItemId는 하위호환을 위해 시그니처에 남겨두지만, 정렬에는 사용하지 않는다.
  void levelsByItemId
  void options
  return reviewItems.map((it) => it.id)
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


