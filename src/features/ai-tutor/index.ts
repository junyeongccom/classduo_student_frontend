// AI Tutor Domain Public API

// Components
export { AITutorContainer } from './components/containers/AITutorContainer'
export { AITutorLoading } from './components/ui/AITutorLoading'
export { ChatInterface } from './components/containers/ChatInterface'
export { GameOverlay } from './components/ui/GameOverlay'

// Services
export { gameScoreService } from './services/gameScoreService'

// Domain utilities
export {
  calculateWeekAndSession,
  estimateTermStartDate,
  formatWeekAndSession,
  formatWeekAndSessionShort,
  type WeekAndSession,
  type LectureInfo,
} from './domain/lectureUtils'

// Types
export type * from './types'

