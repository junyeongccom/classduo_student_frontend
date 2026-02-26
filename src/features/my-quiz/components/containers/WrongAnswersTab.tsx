/**
 * @file WrongAnswersTab.tsx
 * @description 오답 탭 컨테이너
 * @module features/my-quiz
 * @dependencies next-intl
 */

'use client'

import { useTranslations } from 'next-intl'

interface WrongAnswersTabProps {
  selectedLectureId: string | null
}

export default function WrongAnswersTab({ selectedLectureId }: WrongAnswersTabProps) {
  const t = useTranslations('myQuiz')

  if (!selectedLectureId) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400">
        <p className="text-sm">{t('empty.selectLecture')}</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <p className="text-sm text-gray-500">{t('tabs.wrong')}</p>
    </div>
  )
}
