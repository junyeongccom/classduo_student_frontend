'use client'

import { ExamPrepContainer } from '@/features/exam_prep'
import { useNewStudyspace } from '@/shared/lib/featureFlags'
import { useLocale } from 'next-intl'
import { HelpCircle } from 'lucide-react'

export default function ExamPage() {
  const isNewUI = useNewStudyspace()
  const locale = useLocale()

  if (isNewUI) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-gray-400">
        <HelpCircle className="h-12 w-12 stroke-[1.5]" />
        <p className="text-lg font-semibold">
          {locale === 'ko' ? '준비 중입니다' : 'Coming Soon'}
        </p>
      </div>
    )
  }

  return <ExamPrepContainer />
}
