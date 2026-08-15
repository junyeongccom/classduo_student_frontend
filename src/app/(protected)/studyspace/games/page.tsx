'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ReviewContainer } from '@/features/review'
import { useNewStudyspace } from '@/shared/lib/featureFlags'
import { useLocale } from 'next-intl'
import { Loader2, Puzzle } from 'lucide-react'

/**
 * 쿼리(`?lectureId=`)로 초기 회차를 받아 게임 화면을 연다.
 * 쿼리가 없으면 기존과 동일하게 사이드바에서 회차를 고른다.
 */
function ReviewPageContent() {
  const searchParams = useSearchParams()
  // 빈 값(`?lectureId=`)은 미지정과 동일하게 취급
  const initialLectureId = searchParams.get('lectureId')?.trim() || null

  return <ReviewContainer initialLectureId={initialLectureId} />
}

export default function ReviewPage() {
  const isNewUI = useNewStudyspace()
  const locale = useLocale()

  if (isNewUI) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-gray-400">
        <Puzzle className="h-12 w-12 stroke-[1.5]" />
        <p className="text-lg font-semibold">
          {locale === 'ko' ? '준비 중입니다' : 'Coming Soon'}
        </p>
      </div>
    )
  }

  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
        </div>
      }
    >
      <ReviewPageContent />
    </Suspense>
  )
}
