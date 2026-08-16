/**
 * @file state.ts
 * @description 덱 빌드·초기 배치·승리 판정·상태 정규화 해시 (solver 메모용)
 * @module features/review/games/word-solitaire/engine
 * @dependencies features/review/games/word-solitaire/engine/{types,constants,layout,random}
 */
import type {
  SolitaireCard,
  SolitaireContent,
  SolitaireDeck,
  SolitaireDifficulty,
  SolitaireLayout,
  SolitaireState,
  TableauColumn,
} from './types'
import { MAX_CATEGORIES } from './constants.ts'
import { computeLayout } from './layout.ts'
import { mulberry32, shuffled } from './random.ts'

/**
 * 콘텐츠 → 덱. 카테고리 카드가 앞(0..C-1), 그 뒤에 단어 카드가 온다.
 * 카테고리가 8개를 넘으면 **앞에서 8개만** 사용한다(호출자가 중요도순으로 정렬해 넘긴다 — 계획서 §3).
 */
export const buildDeck = (content: SolitaireContent): SolitaireDeck => {
  const source = (content?.categories ?? []).slice(0, MAX_CATEGORIES)
  if (source.length === 0) throw new Error('buildDeck: 카테고리가 비어 있습니다')

  const cards: SolitaireCard[] = []
  const categoryNames: string[] = []
  const categoryWordCounts: number[] = []
  const categoryCardIds: number[] = []

  source.forEach((category, categoryId) => {
    const words = category?.words ?? []
    if (words.length === 0) throw new Error(`buildDeck: 카테고리 "${category?.name}" 에 단어가 없습니다`)
    categoryNames.push(category.name)
    categoryWordCounts.push(words.length)
    categoryCardIds.push(cards.length)
    cards.push({ id: cards.length, kind: 'category', categoryId, label: category.name })
  })

  source.forEach((category, categoryId) => {
    category.words.forEach((word) => {
      cards.push({ id: cards.length, kind: 'word', categoryId, label: word })
    })
  })

  return { cards, categoryNames, categoryWordCounts, categoryCardIds }
}

/** 덱의 총 단어 수 */
export const totalWordCount = (deck: SolitaireDeck): number =>
  deck.categoryWordCounts.reduce((sum, n) => sum + n, 0)

/**
 * 덱 + 난이도 + 시드 → 초기 상태(전방 랜덤 배치).
 * 각 열은 **맨 위 1장만 오픈**(클론다이크 표준, 계획서 §3), 남은 카드는 스톡.
 */
export const createInitialState = (
  deck: SolitaireDeck,
  difficulty: SolitaireDifficulty,
  seed: number,
): SolitaireState => {
  const layout = computeLayout(deck.categoryNames.length, totalWordCount(deck), difficulty)
  return createStateFromLayout(deck, layout, seed)
}

/** 미리 계산한 layout 으로 초기 상태를 만든다 (layout 을 재사용하고 싶을 때). */
export const createStateFromLayout = (
  deck: SolitaireDeck,
  layout: SolitaireLayout,
  seed: number,
): SolitaireState => {
  const order = shuffled(
    deck.cards.map((card) => card.id),
    mulberry32(seed),
  )

  const tableau: TableauColumn[] = []
  let cursor = 0
  layout.columns.forEach((size) => {
    const cardIds = order.slice(cursor, cursor + size)
    cursor += size
    tableau.push({ cardIds, faceUpFrom: Math.max(cardIds.length - 1, 0) })
  })

  return {
    deck,
    foundations: Array.from({ length: layout.foundationCount }, () => ({ categoryId: null, wordIds: [] })),
    tableau,
    // 스톡은 마지막 원소부터 열린다 — 배치 순서를 유지하려 뒤집어 담는다.
    stock: order.slice(cursor).reverse(),
    waste: [],
    completed: [],
    turns: 0,
    seed,
    recycles: 0,
  }
}

/** 모든 카테고리가 완성됐는가 */
export const isWon = (state: SolitaireState): boolean =>
  state.completed.length === state.deck.categoryNames.length

/** 아직 기초에 들어가지 못한 카드 수 (테이블로 + 스톡 + 웨이스트) */
export const cardsOutsideFoundations = (state: SolitaireState): number => {
  let count = state.stock.length + state.waste.length
  for (const column of state.tableau) count += column.cardIds.length
  return count
}

/**
 * 상태 정규화 키 — solver 메모이제이션용.
 *
 * 손실 압축(digest)이 아니라 **충돌 없는 정규 직렬화**다. 다만 기능적으로 같은 상태는
 * 같은 키가 되도록 정규화한다:
 * - 기초 슬롯끼리는 서로 교환 가능 → 슬롯 문자열 정렬
 * - 기초에 쌓인 단어는 순서 무관 → 단어 id 정렬
 * - 테이블로 열끼리는 서로 교환 가능 → 열 문자열 정렬
 * - 스톡/웨이스트는 순서가 의미를 가지므로 그대로
 * - `recycles` 는 다음 셔플 결과를 좌우하므로 포함
 *
 * `turns` 는 넣지 않는다 — 같은 국면에 더 적은 턴으로 도달했는지 비교해야 하기 때문.
 */
export const hashState = (state: SolitaireState): string => {
  const foundations = state.foundations
    .map((slot) => `${slot.categoryId ?? '-'}:${slot.wordIds.slice().sort((a, b) => a - b).join('.')}`)
    .sort()
    .join('|')
  const tableau = state.tableau
    .map((column) => `${column.faceUpFrom}/${column.cardIds.join('.')}`)
    .sort()
    .join('|')
  return [
    foundations,
    tableau,
    state.stock.join('.'),
    state.waste.join('.'),
    state.completed.join('.'),
    state.recycles,
  ].join('#')
}
