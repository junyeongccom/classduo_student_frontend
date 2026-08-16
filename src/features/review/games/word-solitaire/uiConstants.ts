/**
 * @file uiConstants.ts
 * @description 보드 렌더링 치수·공용 클래스 상수 (카드 높이·겹침 간격 등)
 * @module features/review/games/word-solitaire
 * @dependencies 없음
 */

/** 카드 1장의 높이(px). 테이블로 겹침 계산이 이 값을 기준으로 한다 */
export const CARD_HEIGHT = 56
/** 덮인 카드끼리의 세로 겹침 간격(px) — 내용이 없으므로 촘촘히 겹친다 */
export const FACE_DOWN_OFFSET = 12
/** 오픈 카드끼리의 세로 겹침 간격(px) — 라벨 한 줄이 보여야 한다 */
export const FACE_UP_OFFSET = 30
/**
 * 카드 1장의 최소 너비(px). 슬롯이 8개까지 늘어나므로 좁은 화면에서는 카드를 찌그러뜨리는 대신
 * 보드를 가로로 스크롤시킨다 (기초·테이블로가 같은 스크롤 컨테이너 안이라 열이 어긋나지 않는다).
 */
export const MIN_CARD_WIDTH = 72

/** 카드 공통 모양 */
export const CARD_BASE_CLASS =
  'absolute inset-x-0 flex select-none rounded-lg border px-2 text-left transition-[transform,box-shadow] duration-150'
/** 겹쳐 쌓이는 카드 — 라벨이 다음 카드에 가리지 않도록 위쪽에 붙인다 */
export const CARD_ALIGN_TOP_CLASS = 'items-start pt-2'
/** 단독으로 보이는 카드(기초 슬롯·웨이스트) */
export const CARD_ALIGN_CENTER_CLASS = 'items-center'

/**
 * 열 안 카드들의 세로 위치(px). 덮인 카드는 촘촘히, 오픈 카드는 라벨이 보이도록 넓게 겹친다.
 * `faceUpFrom` 인덱스부터가 앞면이다.
 */
export const cardTopOffsets = (cardCount: number, faceUpFrom: number): number[] => {
  const offsets: number[] = []
  let top = 0
  for (let i = 0; i < cardCount; i += 1) {
    if (i > 0) top += i - 1 < faceUpFrom ? FACE_DOWN_OFFSET : FACE_UP_OFFSET
    offsets.push(top)
  }
  return offsets
}

/** 열 컨테이너 높이(px) — 빈 열도 카드 1장 자리는 차지한다 */
export const columnHeight = (cardCount: number, faceUpFrom: number): number => {
  if (cardCount === 0) return CARD_HEIGHT
  const offsets = cardTopOffsets(cardCount, faceUpFrom)
  return offsets[offsets.length - 1] + CARD_HEIGHT
}

/** 목적지 하이라이트(브랜드 그린) */
export const TARGET_RING_CLASS = 'ring-2 ring-primary-500 ring-offset-1'
/** 선택된 카드 강조 */
export const SELECTED_RING_CLASS = 'ring-2 ring-indigo-500 ring-offset-1'
