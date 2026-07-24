/**
 * @file SocraticLoading.tsx
 * @description 소크라 모드 답변 생성 중 캐릭터 애니메이션 로딩 (출처 이벤트가 없어 스피너+소스카드 대신 표시)
 * @module features/ai-tutor
 * @dependencies public/topic_test/hero-{female,male}.png, next-intl
 */
'use client'

import { useTranslations } from 'next-intl'

interface Props {
  message?: string
}

export default function SocraticLoading({ message }: Props) {
  const t = useTranslations('aiTutorChat')
  const displayMessage = message ?? t('socraticLoading')

  return (
    <div className="flex justify-start">
      <div className="flex w-full max-w-[85%] items-center gap-4 rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4">
        <div className="relative flex shrink-0 -space-x-3">
          <img
            src="/topic_test/hero-female.png"
            alt=""
            width={48}
            height={48}
            className="animate-bounce rounded-full bg-pink-50 object-contain [animation-delay:-0.15s]"
          />
          <img
            src="/topic_test/hero-male.png"
            alt=""
            width={48}
            height={48}
            className="animate-bounce rounded-full bg-sky-50 object-contain"
          />
        </div>
        <p className="animate-pulse text-sm font-medium text-gray-600">{displayMessage}</p>
      </div>
    </div>
  )
}
