/**
 * @file ConsentCheckboxGroup.tsx
 * @description 동의 항목 체크박스 목록 (전체 동의 마스터 포함) — props 기반 렌더링만
 * @module features/consent
 * @dependencies next-intl, lucide-react, resolveConsentState
 */
'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Check } from 'lucide-react'
import { isAllChecked, setAllChecked, sortDocuments } from '../../domain/resolveConsentState'
import type { ConsentChecked, ConsentDocument } from '../../types'

interface ConsentCheckboxGroupProps {
  documents: ConsentDocument[]
  checked: ConsentChecked
  onChange: (checked: ConsentChecked) => void
  error?: string
  disabled?: boolean
  locale: 'ko' | 'en'
}

export function ConsentCheckboxGroup({
  documents,
  checked,
  onChange,
  error,
  disabled = false,
  locale,
}: ConsentCheckboxGroupProps) {
  const t = useTranslations('consent')
  const sorted = sortDocuments(documents)
  const allChecked = isAllChecked(documents, checked)

  if (sorted.length === 0) return null

  return (
    <div className="space-y-3">
      {/* 전체 동의 */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(setAllChecked(documents, !allChecked))}
        className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
      >
        <span
          aria-hidden
          className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border ${
            allChecked
              ? 'border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900'
              : 'border-gray-300 dark:border-gray-600'
          }`}
        >
          {allChecked && <Check className="h-3.5 w-3.5" />}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
            {t('allAgree')}
          </span>
          <span className="block text-xs text-gray-500 dark:text-gray-400">
            {t('allAgreeHint')}
          </span>
        </span>
      </button>

      <div className="border-t border-gray-100 dark:border-gray-800" />

      {/* 개별 항목 */}
      <ul className="space-y-2">
        {sorted.map((doc) => {
          const isOn = checked[doc.code] === true
          return (
            <li key={doc.code} className="flex items-center gap-3">
              <button
                type="button"
                disabled={disabled}
                aria-pressed={isOn}
                aria-label={locale === 'en' ? doc.title_en : doc.title_ko}
                onClick={() => onChange({ ...checked, [doc.code]: !isOn })}
                className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:opacity-50"
              >
                <span
                  aria-hidden
                  className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-sm border ${
                    isOn
                      ? 'border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {isOn && <Check className="h-3 w-3" />}
                </span>
                <span className="truncate text-sm text-gray-700 dark:text-gray-300">
                  <span
                    className={`mr-1.5 text-xs font-medium ${
                      doc.is_required
                        ? 'text-gray-900 dark:text-gray-100'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    [{doc.is_required ? t('required') : t('optional')}]
                  </span>
                  {locale === 'en' ? doc.title_en : doc.title_ko}
                </span>
              </button>

              {doc.document_path && (
                <Link
                  href={doc.document_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400 underline hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {t('view')}
                </Link>
              )}
            </li>
          )
        })}
      </ul>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
