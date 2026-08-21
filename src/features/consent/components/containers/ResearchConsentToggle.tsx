/**
 * @file ResearchConsentToggle.tsx
 * @description 마이페이지 — 연구 목적 이용(선택) 동의 철회·재동의 토글
 * @module features/consent
 * @dependencies useConsent, next-intl
 */
'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useConsent } from '../../hooks/useConsent'

const RESEARCH_CODE = 'research_use' as const

export function ResearchConsentToggle() {
  const t = useTranslations('consent')
  const { status, isLoading, loadDocuments, loadStatus, submitConsents } = useConsent()
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    void loadDocuments()
    void loadStatus()
  }, [loadDocuments, loadStatus])

  const current = status?.optional.find((o) => o.code === RESEARCH_CODE)
  if (!current) return null

  const agreed = current.agreed === true

  const handleToggle = async () => {
    setNotice(null)
    // 필수 항목은 건드리지 않고 선택 항목만 뒤집는다 (onlyCodes 화이트리스트).
    const result = await submitConsents('mypage', { [RESEARCH_CODE]: !agreed }, [RESEARCH_CODE])
    setNotice(result.success ? t('researchUpdated') : t('gateSubmitError'))
  }

  return (
    <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        {t('researchTitle')}
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
        {t('researchDescription')}
      </p>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {agreed ? t('researchAgreed') : t('researchNotAgreed')}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={agreed}
          aria-label={t('researchTitle')}
          disabled={isLoading}
          onClick={handleToggle}
          className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-50 ${
            agreed ? 'bg-gray-900 dark:bg-gray-100' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform dark:bg-gray-900 ${
              agreed ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {notice && <p className="mt-2 text-xs text-gray-400">{notice}</p>}
    </div>
  )
}
