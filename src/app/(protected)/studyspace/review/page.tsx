'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ReviewContainer } from '@/features/review'
import { useNewStudyspace } from '@/shared/lib/featureFlags'

export default function ReviewPage() {
  const isNewUI = useNewStudyspace()
  const router = useRouter()

  useEffect(() => {
    if (isNewUI) {
      router.replace('/studyspace/home')
    }
  }, [isNewUI, router])

  if (isNewUI) return null

  return <ReviewContainer />
}
