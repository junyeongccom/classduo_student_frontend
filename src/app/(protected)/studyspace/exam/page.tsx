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
