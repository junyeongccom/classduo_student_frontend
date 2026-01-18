'use client'

import { useTranslations } from 'next-intl'

export default function AssignmentPage() {
  const t = useTranslations('studyspacePlaceholder.assignment')
  return (
    <div className="flex h-screen flex-col">
      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 p-6">
        <h1 className="mb-4 text-xl font-bold text-gray-900">{t('title')}</h1>
        <div className="flex h-full items-center justify-center text-gray-400">
          {t('body')}
        </div>
      </div>
    </div>
  )
}


