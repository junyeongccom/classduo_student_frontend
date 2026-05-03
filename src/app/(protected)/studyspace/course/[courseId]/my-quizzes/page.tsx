/**
 * @file page.tsx
 * @description 과목 컨텍스트 my-quizzes — 기존 글로벌 /studyspace/my-quizzes 와 동일 컨테이너 재사용
 * @module app/(protected)/studyspace/course/[courseId]/my-quizzes
 * @dependencies features/my-quiz
 */

'use client'

import { MyQuizContainer } from '@/features/my-quiz'

export default function CourseMyQuizzesPage() {
  return <MyQuizContainer />
}
