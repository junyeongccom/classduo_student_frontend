/**
 * @file random.ts
 * @description 시드 결정론용 PRNG(mulberry32)·셔플·시드 파생 — 외부 패키지 없이 자체 구현
 * @module features/review/games/word-solitaire/engine
 * @dependencies 없음
 */

/**
 * mulberry32 — 32bit 시드 하나로 재현 가능한 [0,1) 난수열을 만든다.
 * 같은 시드 → 항상 같은 수열 (리더보드 공정성의 전제).
 */
export const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fisher-Yates — 원본을 건드리지 않고 섞인 새 배열을 돌려준다(불변). */
export const shuffled = <T>(items: readonly T[], rand: () => number): T[] => {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = out[i]
    out[i] = out[j]
    out[j] = tmp
  }
  return out
}

/** 시드 + 소금 → 새 시드. 스톡 재활용 회차마다 다른(그러나 결정론적인) 셔플을 만든다. */
export const mixSeed = (seed: number, salt: number): number => {
  let h = (seed ^ 0x9e3779b9) >>> 0
  h = Math.imul(h ^ ((salt + 0x85ebca6b) >>> 0), 0xcc9e2d51) >>> 0
  h = (h ^ (h >>> 13)) >>> 0
  return Math.imul(h, 0x1b873593) >>> 0
}

/** FNV-1a 32bit — 문자열을 시드로 바꾼다. */
export const hashStringToSeed = (value: string): number => {
  let h = 0x811c9dc5
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

/**
 * 계획서 §4-3 시드 결정론: `seed = hash(lecture_id + difficulty + daily_salt)`.
 * 같은 회차·같은 난이도·같은 날이면 모두가 같은 판을 푼다.
 */
export const deriveDealSeed = (lectureId: string, difficulty: string, dailySalt: string): number =>
  hashStringToSeed(`${lectureId}|${difficulty}|${dailySalt}`)
