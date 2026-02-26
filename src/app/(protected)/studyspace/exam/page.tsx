/**
 * @file page.tsx
 * @description 내 퀴즈 페이지 라우트 엔트리 (신규 UI: MyQuizContainer / 레거시: ExamPrepContainer)
 * @module app/studyspace/exam
 * @dependencies features/my-quiz, features/exam_prep, shared/lib/featureFlags
 */

'use client'

import { ExamPrepContainer } from '@/features/exam_prep'
import { MyQuizContainer } from '@/features/my-quiz'
import { useNewStudyspace } from '@/shared/lib/featureFlags'

export default function ExamPage() {
  const isNewUI = useNewStudyspace()

  if (isNewUI) {
    return <MyQuizContainer />
  }

  return <ExamPrepContainer />
}
