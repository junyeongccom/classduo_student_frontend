/**
 * @file constants.ts
 * @description 난이도 프리셋·별점 배수·탐색 예산 상수 (계획서 §3 실측 반영본)
 * @module features/review/games/word-solitaire/engine
 * @dependencies features/review/games/word-solitaire/engine/types
 */
import type { SolitaireDifficulty } from './types'

/** 난이도 3종의 진행 순서 (UI 정렬·순회용) */
export const SOLITAIRE_DIFFICULTIES: readonly SolitaireDifficulty[] = ['intro', 'normal', 'challenge'] as const

/**
 * 난이도별 파생 파라미터 — 계획서 §3 출력 표.
 * - `slotGap` k: `F = clamp(C - k, 2, 8)`
 * - `startColumnSize` s: 열별 장수 계단 `s, s+1, …, s+T-1`
 */
export const DIFFICULTY_PRESETS: Record<SolitaireDifficulty, { slotGap: number; startColumnSize: number }> = {
  intro: { slotGap: 1, startColumnSize: 2 },
  normal: { slotGap: 2, startColumnSize: 3 },
  challenge: { slotGap: 4, startColumnSize: 4 },
}

/** 기초 슬롯 하한 — C=5 에 도전(k=4)이면 F=1 이 되어 진행 불가라 2로 막는다 (계획서 §3) */
export const MIN_FOUNDATION_SLOTS = 2
/** 기초 슬롯 상한 */
export const MAX_FOUNDATION_SLOTS = 8
/** 카테고리가 8개를 넘으면 중요도 상위 8개만 사용 (계획서 §3) */
export const MAX_CATEGORIES = 8
/** 테이블로 열 1개의 최소 장수 — 카드가 모자라 계단을 깎을 때의 바닥 */
export const MIN_COLUMN_SIZE = 1

/** 참고 게임 실측 상수 — 제공 턴 ≈ 총 카드 × 1.94 (계획서 §3, 생성 sanity check 용) */
export const REFERENCE_TURNS_PER_CARD = 1.94

/** 별점 기준 배수 — L* 대비 (계획서 §3 턴 기준 표) */
export const STAR_TURN_MULTIPLIERS = { three: 1.3, two: 1.8 } as const

// ─────────────────────────────── 탐색 예산 ───────────────────────────────

/** solver 가 인정하는 최대 해 길이. 도전 난이도는 스톡 왕복 때문에 수백 턴이 정상이다. */
export const MAX_SOLVE_TURNS = 4000
/** 1단계(해 찾기) 노드 예산 */
export const SOLVE_NODE_BUDGET = 60_000
/** 1단계 프론티어(힙) 상한 — 넘으면 유망한 절반만 남겨 메모리를 묶는다 */
export const MAX_FRONTIER = 20_000
/**
 * 1.5단계 — 최우선 탐색이 막혔을 때 돌리는 무작위 재시작 롤아웃 횟수.
 * 탐욕 탐색은 "어느 카테고리를 슬롯에 먼저 올릴지"를 한 번 잘못 고르면 그 하위 트리에서 헤어나오지
 * 못한다. 재시작은 그 선택을 매번 다르게 만들어 준다 (실측: 60k 노드로 실패한 판이 롤아웃으로는 풀림).
 */
export const ROLLOUT_RESTARTS = 600
/** 롤아웃 1회의 턴 상한 = 총 카드 수 × 이 배수 */
export const ROLLOUT_TURN_FACTOR = 12
/** 롤아웃에서 다음 수를 고를 후보 폭의 최솟값 */
export const ROLLOUT_MIN_WIDTH = 2
/** 재시작마다 후보 폭을 이 가짓수만큼 돌려가며 바꾼다 (2~4) — 탐색 다양성 확보 */
export const ROLLOUT_WIDTH_VARIANTS = 3
/** 2단계(최적화) 노드 예산 */
export const OPTIMIZE_NODE_BUDGET = 120_000
/** 해 길이가 이보다 길면 최적화 시도를 건너뛴다 (증명 가망이 없어 시간만 태운다) */
export const OPTIMIZE_MAX_LENGTH = 90
/** 최적화 반복 횟수 상한 */
export const OPTIMIZE_ROUNDS = 3
/** 판 생성 시 시드를 증가시키며 재시도하는 최대 횟수 */
export const MAX_DEAL_ATTEMPTS = 20

/**
 * 클리어 턴 수 → 별점 (1~3). 미클리어는 0.
 * `minTurns` 는 그 판의 solver 최소 턴 L*.
 */
export const rateTurns = (turns: number, minTurns: number): 0 | 1 | 2 | 3 => {
  if (!Number.isFinite(turns) || !Number.isFinite(minTurns) || minTurns <= 0 || turns <= 0) return 0
  if (turns <= minTurns * STAR_TURN_MULTIPLIERS.three) return 3
  if (turns <= minTurns * STAR_TURN_MULTIPLIERS.two) return 2
  return 1
}
