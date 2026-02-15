'use client'

import { useNewStudyspace } from '@/shared/lib/featureFlags'
import { HomeContainer } from '@/features/home'

export default function StudyspaceHomePage() {
  const isNewUI = useNewStudyspace()

  if (!isNewUI) {
    return (
      <div className="flex h-full min-h-[calc(100vh-56px)] items-center justify-center bg-gray-50 text-sm text-gray-400">
        홈 페이지 (준비 중)
      </div>
    )
  }

  return <HomeContainer />
}

