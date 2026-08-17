/**
 * @file uiConstants.ts
 * @description 보드 렌더링 치수·공용 클래스 상수 (카드 비율·겹침 간격 등)
 * @module features/review/games/word-solitaire
 * @dependencies 없음
 */

/**
 * 카드 세로/가로 비율. 참고 게임 실측(2026-08-17, 사용자 제공 스크린샷 4장) 기준 —
 * 카드 155×200px 이라 1 : 1.29 다. 트럼프 카드처럼 세로로 긴 형태여야 한 화면에 여러 열이 들어간다.
 */
export const CARD_ASPECT = 1.29
/** 열 사이 간격(px) */
export const COLUMN_GAP = 8
/**
 * 카드 최소 너비(px). 열이 6~8개까지 늘어나면 이 값에 걸려 가로 스크롤이 생긴다
 * (찌그러뜨려 글자를 못 읽게 하느니 스크롤이 낫다). 참고 게임은 최대 5열이라 스크롤이 없었다.
 */
export const MIN_CARD_WIDTH = 62
/**
 * 카드 최대 너비(px). 참고 게임 비율을 넓은 데스크톱에 그대로 적용하면 카드가 손바닥만 해진다 —
 * 상한을 두고 남는 폭은 보드를 가운데 정렬해 흘린다.
 */
export const MAX_CARD_WIDTH = 132

/** 덮인 카드끼리의 세로 겹침 — 카드 높이 대비 비율. 참고 게임 실측 42/200 */
export const FACE_DOWN_RATIO = 0.21
/** 오픈 카드끼리의 세로 겹침 — 라벨이 한 줄 보여야 한다. 참고 게임 실측 45/200 */
export const FACE_UP_RATIO = 0.24

/** 열 폭에서 카드 높이를 얻는다 */
export const cardHeightFor = (cardWidth: number): number => Math.round(cardWidth * CARD_ASPECT)

/**
 * 세로 공간이 허락하는 카드 높이. 폭만 보고 정하면 카드가 커져 테이블로가 화면 밖으로 밀린다.
 *
 * `availableHeight` 는 **보드(기초 슬롯 + 테이블로)에 주어진 높이**다 —
 * 턴·스톡 상단바는 보드 밖이라 여기 포함되지 않는다.
 * 세로로 쌓이는 것은 `기초 1장 + 테이블로 한 열`이고,
 * 테이블로 한 열은 `카드 1장 + (장수-1) × 오픈 겹침` 이다. 이를 카드 높이로 묶어 역산한다.
 *
 * 실제 겹침은 `Math.round` 를 거치므로 이 역산은 근사다 — 그래서 살짝 보수적으로 잡는다.
 */
export const cardHeightForViewport = (
  availableHeight: number,
  longestColumnCards: number,
): number => {
  const stacked = Math.max(0, longestColumnCards - 1) * FACE_UP_RATIO
  // 기초 1 + 테이블로 첫 장 1 = 2
  const factor = 2 + stacked
  const usable = availableHeight - COLUMN_GAP * 2 - FOUNDATION_LABEL_HEIGHT
  return Math.floor(usable / factor)
}

/** "기초 슬롯" 라벨이 차지하는 높이(px) — 세로 계산에서 빼야 한다 */
const FOUNDATION_LABEL_HEIGHT = 22

/**
 * 컨테이너 폭을 열 수로 나눠 카드 한 장의 폭을 얻는다.
 * `MIN_CARD_WIDTH` 아래로는 줄이지 않는다 — 그 경우 보드가 가로로 스크롤된다.
 */
export const cardWidthFor = (containerWidth: number, columnCount: number): number => {
  if (columnCount <= 0) return MIN_CARD_WIDTH
  const usable = containerWidth - COLUMN_GAP * (columnCount - 1)
  const fitted = Math.floor(usable / columnCount)
  return Math.min(MAX_CARD_WIDTH, Math.max(MIN_CARD_WIDTH, fitted))
}

/** 카드 공통 모양 */
export const CARD_BASE_CLASS =
  'absolute inset-x-0 flex select-none items-center justify-center rounded-lg border px-1.5 text-center transition-[transform,box-shadow] duration-150'
/** 겹쳐 쌓이는 카드 — 라벨이 다음 카드에 가리지 않도록 위쪽에 붙인다 */
export const CARD_ALIGN_TOP_CLASS = 'items-start pt-1.5'
/** 단독으로 보이는 카드(기초 슬롯·웨이스트) */
export const CARD_ALIGN_CENTER_CLASS = 'items-center'

/**
 * 열 안 카드들의 세로 위치(px). 덮인 카드는 촘촘히, 오픈 카드는 라벨이 보이도록 넓게 겹친다.
 * `faceUpFrom` 인덱스부터가 앞면이다.
 */
export const cardTopOffsets = (
  cardCount: number,
  faceUpFrom: number,
  cardHeight: number,
): number[] => {
  const faceDownStep = Math.round(cardHeight * FACE_DOWN_RATIO)
  const faceUpStep = Math.round(cardHeight * FACE_UP_RATIO)
  const offsets: number[] = []
  let top = 0
  for (let i = 0; i < cardCount; i += 1) {
    if (i > 0) top += i - 1 < faceUpFrom ? faceDownStep : faceUpStep
    offsets.push(top)
  }
  return offsets
}

/** 열 컨테이너 높이(px) — 빈 열도 카드 1장 자리는 차지한다 */
export const columnHeight = (
  cardCount: number,
  faceUpFrom: number,
  cardHeight: number,
): number => {
  if (cardCount === 0) return cardHeight
  const offsets = cardTopOffsets(cardCount, faceUpFrom, cardHeight)
  return offsets[offsets.length - 1] + cardHeight
}

/** 목적지 하이라이트(브랜드 그린) */
export const TARGET_RING_CLASS = 'ring-2 ring-primary-500 ring-offset-1'
/** 선택된 카드 강조 */
export const SELECTED_RING_CLASS = 'ring-2 ring-indigo-500 ring-offset-1'
