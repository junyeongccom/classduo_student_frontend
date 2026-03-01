'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TopTabs } from '@/shared/components/common'
import { useNewStudyspace } from '@/shared/lib/featureFlags'

export default function NotesPage() {
  const isNewUI = useNewStudyspace()
  const router = useRouter()

  useEffect(() => {
    if (isNewUI) {
      router.replace('/studyspace/home')
    }
  }, [isNewUI, router])

  if (isNewUI) return null

  return (
    <div className="flex h-screen flex-col">
      <TopTabs />
      <div className="flex-1 p-6">
        <div className="flex h-full items-center justify-center text-gray-400">
          수업녹음본 페이지
        </div>
      </div>
    </div>
  )
}

