/**
 * @file shuffleOrder.ts
 * @description 결정론적 선지 셔플 순열 — 시드(attemptId+questionId)로 항상 같은 순서.
 *   새 attempt(재진입)마다 시드가 달라 새 순서, 같은 attempt(이어풀기)는 동일 순서.
 *   반환 order[displayPos] = canonicalIdx (표시 위치 → 정규 인덱스).
 * @module features/exam-prep-final/domain
 * @dependencies (none)
 */

function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 길이 n 의 결정론적 순열 — order[displayPos] = canonicalIdx. seed 가 같으면 항상 동일. */
export function shuffleOrder(n: number, seed: string): number[] {
  const arr = Array.from({ length: n }, (_, i) => i)
  if (n <= 1) return arr
  const rand = mulberry32(hashStr(seed))
  for (let i = n - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}
