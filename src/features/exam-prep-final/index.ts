/**
 * @file index.ts
 * @description exam-prep-final feature 의 공개 API
 * @module features/exam-prep-final
 */

export { ExamPrepContainer } from './components/containers/ExamPrepContainer'
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
