/**
 * @file page.tsx
 * @description 과목 컨텍스트 my-quizzes — 기존 글로벌 /studyspace/my-quizzes 와 동일 컨테이너 재사용
 *              course context 사이드바 유지를 위한 라우트 미러
 * @module app/(protected)/studyspace/course/[courseId]/my-quizzes
 * @dependencies features/my-quiz, features/exam_prep, shared/lib/featureFlags
 */

'use client'

import { ExamPrepContainer } from '@/features/exam_prep'
import { MyQuizContainer } from '@/features/my-quiz'
import { useNewStudyspace } from '@/shared/lib/featureFlags'

export default function CourseMyQuizzesPage() {
  const isNewUI = useNewStudyspace()

  if (isNewUI) {
    return <MyQuizContainer />
  }

  return <ExamPrepContainer />
}
