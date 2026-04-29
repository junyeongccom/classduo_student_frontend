/**
 * @file index.ts
 * @description course-dashboard feature 의 공개 API
 * @module features/course-dashboard
 */

export { CourseDashboardContainer } from './components/containers/CourseDashboardContainer'
export { useCourseDashboard } from './hooks/useCourseDashboard'
export {
  computeCurrentWeek,
  computeDdayToExam,
  inferCurrentWeekFromLectures,
} from './domain/computeWeekAndDday'
export { pickContinueLecture } from './domain/pickContinueLecture'
