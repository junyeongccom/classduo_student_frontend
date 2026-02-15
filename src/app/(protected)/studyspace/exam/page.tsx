'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ExamPrepContainer } from '@/features/exam_prep'
import { useNewStudyspace } from '@/shared/lib/featureFlags'

export default function ExamPage() {
  const isNewUI = useNewStudyspace()
  const router = useRouter()

  useEffect(() => {
    if (isNewUI) {
      router.replace('/studyspace/home')
    }
  }, [isNewUI, router])

  if (isNewUI) return null

  return <ExamPrepContainer />
}


