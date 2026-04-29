/**
 * @file index.ts
 * @description exam-prep-final feature 의 공개 API
 * @module features/exam-prep-final
 */

export { ExamPrepContainer } from './components/containers/ExamPrepContainer'
export { CoreTestSolveContainer } from './components/containers/CoreTestSolveContainer'
export { useExamPrepData } from './hooks/useExamPrepData'
export { useCoreTestDetail } from './hooks/useCoreTestDetail'
export { getMockExamPrepData } from './mocks/mockExamPrepData'
export { getCoreTestsBySet, isCoreSetTab, SET_RANGES } from './domain/testSetGroups'
export type {
  CoreTest,
  CoreTestStatus,
  ExamPrepData,
  FinalTest,
  MidTest,
  TestSetTab,
} from './types'
