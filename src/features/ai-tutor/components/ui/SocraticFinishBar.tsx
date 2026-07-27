/**
 * @file SocraticFinishBar.tsx
 * @description 소크라 문답 4단계를 모두 통과했을 때 입력창 위에 뜨는 완료 안내 + 종료하기 버튼
 * @module features/ai-tutor
 * @dependencies 없음 (pure UI)
 */
'use client'

import { useTranslations } from 'next-intl'

interface Props {
  onFinish?: () => void
}

export default function SocraticFinishBar({ onFinish }: Props) {
  const t = useTranslations('aiTutorChat')
  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
      <div className="text-sm font-medium text-indigo-900">{t('socraticCompletedNotice')}</div>
      {onFinish && (
        <button
          type="button"
          onClick={onFinish}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
        >
          {t('socraticFinishButton')}
        </button>
      )}
    </div>
  )
}
