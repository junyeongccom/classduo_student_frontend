/**
 * Review Feature 모듈
 */

// Components
export { ReviewContainer } from './components/containers/ReviewContainer'
export { ReviewLoading } from './components/ui/ReviewLoading'

// Game Components (lecture-study 통합용)
export { ReviewMatchingGame } from './components/ui/ReviewMatchingGame'
export { DefinitionBuilderGame } from './components/ui/DefinitionBuilderGame'
export { GuessTheTermGameContainer } from './components/containers/GuessTheTermGameContainer'
export { ReviewDeckView } from './components/ui/ReviewDeckView'

// Types (public boundary)
export type { LectureReviewItem, DefinitionBuilderGameResponse, DefinitionBuilderQuestion, DefinitionBuilderBlank } from './types'

// Services & Hooks
export * from './services/reviewService'
export * from './hooks/useReview'
export { useReviewDeck } from './hooks/useReviewDeck'
export type { ReviewDeckViewModel } from './hooks/useReviewDeck'
