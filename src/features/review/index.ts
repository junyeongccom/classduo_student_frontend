/**
 * Review Feature 모듈
 */

// Game Components (lecture-study 통합용)
export { ReviewMatchingGame } from './components/ui/ReviewMatchingGame'
export { DefinitionBuilderGame } from './components/ui/DefinitionBuilderGame'
export { ReviewDeckView } from './components/ui/ReviewDeckView'
export { GameRankingBoard } from './components/ui/GameRankingBoard'

// Types (public boundary)
export type { LectureReviewItem, DefinitionBuilderGameResponse, DefinitionBuilderQuestion, DefinitionBuilderBlank, ScoreRankingEntry, MatchingRankingEntry } from './types'

// Services & Hooks
export * from './services/reviewService'
export { useReviewDeck } from './hooks/useReviewDeck'
export type { ReviewDeckViewModel } from './hooks/useReviewDeck'
