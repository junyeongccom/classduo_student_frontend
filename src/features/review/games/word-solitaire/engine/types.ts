/**
 * @file types.ts
 * @description 단어 솔리테어 게임의 직렬화 가능한 상태·이동·콘텐츠 타입 (클래스 없음, 순수 데이터)
 * @module features/review/games/word-solitaire/engine
 * @dependencies 없음
 */

/** 난이도 3종 — 계획서 §3 (입문/보통/도전) */
export type SolitaireDifficulty = 'intro' | 'normal' | 'challenge'

// ─────────────────────────────── 콘텐츠 입력 ───────────────────────────────

/** 워커가 추출한 카테고리 1개 (계획서 §5 출력 스키마) */
export interface SolitaireCategoryInput {
  name: string
  words: string[]
}

/** 회차 1개분 게임 콘텐츠 */
export interface SolitaireContent {
  categories: SolitaireCategoryInput[]
}

// ─────────────────────────────── 카드 / 덱 ───────────────────────────────

export type CardKind = 'category' | 'word'

/**
 * 카드 1장. `id` 는 덱 배열의 인덱스와 같다 — 상태에는 id(number)만 담아 직렬화를 가볍게 유지한다.
 */
export interface SolitaireCard {
  id: number
  kind: CardKind
  /** 이 카드가 속한 카테고리 인덱스 (카테고리 카드는 자기 자신) */
  categoryId: number
  /** 화면 표시용 라벨 (카테고리명 또는 단어) */
  label: string
}

/**
 * 판 전체의 불변 메타데이터. 모든 상태가 **같은 참조를 공유**하므로 불변 업데이트 비용이 없다.
 */
export interface SolitaireDeck {
  cards: SolitaireCard[]
  categoryNames: string[]
  /** categoryId → 그 카테고리의 단어 장수 (완성 판정 기준) */
  categoryWordCounts: number[]
  /** categoryId → 카테고리 카드의 id */
  categoryCardIds: number[]
}

// ─────────────────────────────── 상태 ───────────────────────────────

/** 기초 슬롯 1칸. 비어 있으면 categoryId === null */
export interface FoundationSlot {
  categoryId: number | null
  /** 쌓인 단어 카드 id (순서 무관 — 해시 시 정렬해 동치 상태를 합친다) */
  wordIds: number[]
}

/** 테이블로 열 1개 */
export interface TableauColumn {
  /** 바닥(0) → 맨 위(length-1) */
  cardIds: number[]
  /** 이 인덱스부터 맨 위까지가 앞면. 빈 열은 0 */
  faceUpFrom: number
}

/**
 * 게임 상태 전체. JSON 직렬화 가능하며 모든 업데이트는 새 객체를 만든다(불변).
 */
export interface SolitaireState {
  deck: SolitaireDeck
  foundations: FoundationSlot[]
  tableau: TableauColumn[]
  /** 덮인 스톡. **마지막 원소가 다음에 열릴 카드** */
  stock: number[]
  /** 열린 카드 더미. **마지막 원소가 맨 위**(이동 가능한 유일한 카드) */
  waste: number[]
  /** 완성돼 제거된 categoryId (오름차순) */
  completed: number[]
  /** 소모한 턴 수 (= 점수) */
  turns: number
  /** 스톡 재활용 셔플의 기준 시드 — 같은 시드·같은 플레이면 셔플 결과도 같다 */
  seed: number
  /** 지금까지 스톡을 재활용한 횟수 (셔플 시드 파생에 사용) */
  recycles: number
}

// ─────────────────────────────── 이동 ───────────────────────────────

export type MoveSource =
  | { type: 'waste' }
  /** 테이블로 열 `column` 의 `index` 번째 카드부터 맨 위까지를 집는다 */
  | { type: 'tableau'; column: number; index: number }

export type MoveTarget =
  | { type: 'foundation'; slot: number }
  | { type: 'tableau'; column: number }

/** 이동 1건 = 1턴. 자동 오픈·자동 완성은 턴을 소모하지 않는다. */
export type SolitaireMove =
  | { kind: 'draw' }
  | { kind: 'move'; from: MoveSource; to: MoveTarget }

// ─────────────────────────────── 판 구성 ───────────────────────────────

/** 난이도 함수의 출력 (계획서 §3) */
export interface SolitaireLayout {
  /** 기초 슬롯 수 F */
  foundationCount: number
  /** 테이블로 열 수 T (= F) */
  columnCount: number
  /** 열별 장수 (계단) */
  columns: number[]
  /** 테이블로에 깔리는 총 장수 */
  tableauCount: number
  /** 스톡 장수 */
  stockCount: number
  /** 총 카드 수 N = C + W */
  totalCards: number
}

/** solver 결과 */
export interface SolveResult {
  solved: boolean
  /** solver 가 실제로 찾아낸 최소 턴 (미해결이면 null) */
  minTurns: number | null
  /** 그 턴 수를 만드는 실제 이동열 */
  moves: SolitaireMove[]
  /** 탐색이 소진돼 최적성이 증명됐는가 (false = 상한일 뿐) */
  optimal: boolean
  /** 확장한 노드 수 */
  nodes: number
  elapsedMs: number
}

/** generateDeal 산출물 — "solver 가 실제로 푼 판 + 그 최소 턴 L*" */
export interface GeneratedDeal {
  seed: number
  difficulty: SolitaireDifficulty
  layout: SolitaireLayout
  state: SolitaireState
  /** 이 판을 실제로 푼 해 (L* = solution.minTurns) */
  solution: {
    minTurns: number
    moves: SolitaireMove[]
    optimal: boolean
  }
  /** 시드를 몇 번 증가시켜 성공했는가 (1 = 첫 시도) */
  attempts: number
  solveElapsedMs: number
}
