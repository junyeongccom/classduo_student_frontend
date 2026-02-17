'use client'

import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { AITutorContainer } from '@/features/ai-tutor/components/containers/AITutorContainer'
import { Loader2 } from 'lucide-react'
import { useNewStudyspace } from '@/shared/lib/featureFlags'

export default function AITutorPage() {
  const isNewUI = useNewStudyspace()
  const router = useRouter()

  useEffect(() => {
    if (isNewUI) {
      router.replace('/studyspace/home')
    }
  }, [isNewUI, router])

  if (isNewUI) {
    return null
  }

  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
        </div>
      }
    >
      <AITutorContainer />
    </Suspense>
  )
}
