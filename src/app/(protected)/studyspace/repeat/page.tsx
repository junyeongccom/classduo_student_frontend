'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useNewStudyspace } from '@/shared/lib/featureFlags'

export default function StudyspaceRepeatPage() {
  const isNewUI = useNewStudyspace()
  const router = useRouter()

  useEffect(() => {
    if (isNewUI) {
      router.replace('/studyspace/home')
    }
  }, [isNewUI, router])

  if (isNewUI) return null

  return (
    <div className="flex h-full min-h-[calc(100vh-56px)] items-center justify-center bg-gray-50 text-sm text-gray-400">
      간격반복학습 페이지 (준비 중)
    </div>
  )
}

