/**
 * @file EmailNoticeCard.tsx
 * @description 로그인/회원가입 폼 상단에 표시되는 접이식 이메일 안내 카드
 * @module features/auth
 * @dependencies next-intl, lucide-react
 */

'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown, ChevronUp, Info } from 'lucide-react'

export function EmailNoticeCard() {
  const t = useTranslations('auth.emailNotice')
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        <Info className="h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
        <span className="flex-1 text-sm font-medium text-amber-800 dark:text-amber-300">
          {t('title')}
        </span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        )}
      </button>

      {isOpen && (
        <div className="border-t border-amber-200 dark:border-amber-800 px-4 pb-4 pt-3 space-y-3">
          <div>
            <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 mb-1">
              {t('workspaceTitle')}
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              {t('workspaceDesc')}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 mb-1">
              {t('approvalTitle')}
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              {t('approvalDesc')}
            </p>
          </div>

          <div className="rounded-md bg-amber-100 dark:bg-amber-900/40 px-3 py-2">
            <p className="text-xs font-medium text-amber-900 dark:text-amber-200 leading-relaxed">
              {t('loginGuide')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
