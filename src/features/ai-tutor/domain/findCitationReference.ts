/**
 * @file findCitationReference.ts
 * @description 답변 본문 출처 표기([녹음본 N]/[페이지 N])의 표시 번호로 해당 Reference 를 찾는 순수 함수
 * @module features/ai-tutor/domain
 * @dependencies types(Reference)
 */
import type { Reference } from '../types'

/** ReferencePanel 의 녹음 카드 정렬 규칙과 동일: reference_index ?? chunk_index ?? ∞ */
const getRecordingSortIndex = (ref: Reference): number => {
  const refIndex = typeof ref.reference_index === 'number' ? ref.reference_index : undefined
  const chunkIndex = typeof ref.metadata?.chunk_index === 'number' ? ref.metadata.chunk_index : undefined
  return refIndex ?? chunkIndex ?? Number.POSITIVE_INFINITY
}

/**
 * 표시 번호(no)로 Reference 를 찾는다 — ReferencePanel 의 카드 번호 규칙과 동일하게 맞춘다.
 * - recording: 정렬 후 (reference_index ?? chunk_index ?? i) + 1 === no
 * - material: metadata.page_number === no
 * 인용(citations) 있는 ref 를 우선 탐색하고, 없으면 전체에서 재시도. 못 찾으면 null.
 */
export function findCitationReference(
  refs: Reference[],
  type: 'recording' | 'material',
  no: number,
): Reference | null {
  const hasCitations = (r: Reference) => Array.isArray(r.citations) && r.citations.length > 0
  const pool = refs.filter((r) => r.type === type)
  const primary = pool.filter(hasCitations)

  for (const candidates of [primary, pool]) {
    if (candidates.length === 0) continue
    if (type === 'material') {
      const found = candidates.find((r) => r.metadata?.page_number === no)
      if (found) return found
      continue
    }
    const sorted = [...candidates].sort((a, b) => getRecordingSortIndex(a) - getRecordingSortIndex(b))
    const idx = sorted.findIndex((r, i) => {
      const sortIndex = getRecordingSortIndex(r)
      return (Number.isFinite(sortIndex) ? sortIndex : i) + 1 === no
    })
    if (idx !== -1) return sorted[idx]
  }
  return null
}
