// AI Tutor Domain Public API

// Components
export { AITutorContainer } from './components/containers/AITutorContainer'
export { AITutorLoading } from './components/ui/AITutorLoading'

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

