/**
 * @file page.tsx
 * @description 개인정보 처리방침 페이지 (인증 불필요, 가입 폼에서 새 탭으로 열림)
 * @module app/(legal)/privacy
 * @dependencies features/consent
 */
'use client'

import { useLocale } from 'next-intl'
import { LegalDocument, PRIVACY_EN, PRIVACY_KO } from '@/features/consent'

export default function PrivacyPage() {
  const locale = useLocale()
  return <LegalDocument {...(locale === 'en' ? PRIVACY_EN : PRIVACY_KO)} />
}
