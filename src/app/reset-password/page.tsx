'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/shared/components/ui'

/**
 * 기존 링크 기반 비밀번호 재설정 페이지 (deprecated).
 * 코드 기반 플로우로 전환되어, 이 페이지는 홈으로 안내만 합니다.
 */
export default function ResetPasswordPage() {
  const router = useRouter()
  const t = useTranslations('resetPassword')

  useEffect(() => {
    // 3초 후 자동 리다이렉트
    const timer = setTimeout(() => {
      router.push('/')
    }, 3000)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl text-center">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">{t('invalidLink')}</h1>
        <p className="mb-6 text-sm text-gray-600">
          {t('linkExpired')}
        </p>
        <Button
          onClick={() => router.push('/')}
          className="bg-gray-900"
        >
          {t('goToMain')}
        </Button>
      </div>
    </div>
  )
}
