/**
 * @file page.tsx
 * @description 서비스 이용약관 페이지 (인증 불필요, 가입 폼에서 새 탭으로 열림)
 * @module app/(legal)/terms
 * @dependencies features/consent
 */
'use client'

import { useLocale } from 'next-intl'
import { LegalDocument, TERMS_EN, TERMS_KO } from '@/features/consent'

export default function TermsPage() {
  const locale = useLocale()
  return <LegalDocument {...(locale === 'en' ? TERMS_EN : TERMS_KO)} />
}
