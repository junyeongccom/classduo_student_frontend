/**
 * @file ConsentGateModal.tsx
 * @description 미동의 필수 항목이 있는 기존 회원에게 띄우는 닫기 불가 동의 게이트
 * @module features/consent
 * @dependencies useConsent, ConsentCheckboxGroup, next-intl
 */
'use client'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/shared/components/ui'
import { ConsentCheckboxGroup } from '../ui/ConsentCheckboxGroup'
import { findMissingRequired } from '../../domain/resolveConsentState'
import { useConsent } from '../../hooks/useConsent'
import type { ConsentChecked } from '../../types'

export function ConsentGateModal() {
  const t = useTranslations('consent')
  const locale = useLocale() as 'ko' | 'en'
  const { documents, status, isLoading, loadDocuments, loadStatus, submitConsents } = useConsent()
  const [checked, setChecked] = useState<ConsentChecked>({})
  const [error, setError] = useState<string | undefined>(undefined)

  useEffect(() => {
    void loadStatus()
    void loadDocuments()
  }, [loadStatus, loadDocuments])

  // status 가 null 이면 조회 실패 — 백엔드 장애를 앱 전면 차단으로 만들지 않는다.
  if (!status || status.missing_required.length === 0) return null
  if (documents.length === 0) return null

  const handleSubmit = async () => {
    const missing = findMissingRequired(checked)
    if (missing.length > 0) {
      setError(t('requiredError'))
      return
    }
    setError(undefined)
    const result = await submitConsents('gate', checked)
    if (!result.success) {
      setError(t('gateSubmitError'))
    }
  }

  return (
    // 닫기 버튼 없음 · 배경 클릭 무효 — 필수 동의를 통과해야만 사라진다
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative z-10 max-h-[88vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <h2 className="mb-2 text-lg font-bold text-gray-900 dark:text-gray-100">
          {t('gateTitle')}
        </h2>
        <p className="mb-5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
          {t('gateMessage')}
        </p>

        <ConsentCheckboxGroup
          documents={documents}
          checked={checked}
          onChange={(next) => {
            setChecked(next)
            if (error) setError(undefined)
          }}
          error={error}
          disabled={isLoading}
          locale={locale}
        />

        <Button onClick={handleSubmit} className="mt-6 w-full" size="lg" isLoading={isLoading}>
          {t('gateSubmit')}
        </Button>
      </div>
    </div>
  )
}
