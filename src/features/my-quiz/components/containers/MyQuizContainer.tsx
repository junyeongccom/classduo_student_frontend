/**
 * @file MyQuizContainer.tsx
 * @description 내 퀴즈 페이지 메인 컨테이너 (3탭 + 하단 선택 바)
 * @module features/my-quiz
 * @dependencies next-intl
 */

'use client'

import { useTranslations } from 'next-intl'

export default function MyQuizContainer() {
  const t = useTranslations('myQuiz')

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 items-center justify-center text-gray-400">
        <p className="text-lg font-semibold">{t('title')}</p>
      </div>
    </div>
  )
}
