/**
 * @file QuizGenerationTab.tsx
 * @description 퀴즈 생성 탭 컨테이너 (세션 목록 + 생성)
 * @module features/my-quiz
 * @dependencies next-intl
 */

'use client'

import { useTranslations } from 'next-intl'

interface QuizGenerationTabProps {
  selectedLectureId: string | null
  selectedCourseId: string | null
}

export default function QuizGenerationTab({ selectedLectureId }: QuizGenerationTabProps) {
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
      <p className="text-sm text-gray-500">{t('tabs.generation')}</p>
    </div>
  )
}
