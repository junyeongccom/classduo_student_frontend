'use client'

import { Mail, School, User } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { UserProfileResponse } from '@/features/auth'

interface UserProfileCardProps {
  user: UserProfileResponse
}

/** i18n 라벨이 준비된 역할 값. 이 목록 밖의 값은 DB 원본을 그대로 보여준다. */
const LABELED_ROLES = ['STUDENT', 'PROFESSOR', 'ADMIN', 'MANAGER']

export function UserProfileCard({ user }: UserProfileCardProps) {
  const t = useTranslations('profile')
  // DB 의 role 값을 그대로 그리면 한국어 화면에 'STUDENT' 가 노출된다.
  const roleLabel = LABELED_ROLES.includes(user.role) ? t(`roles.${user.role}`) : user.role
  return (
    <div className="rounded-lg border border-gray-200 p-6 dark:border-gray-700">
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <User className="h-8 w-8 text-gray-900 dark:text-gray-100" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{user.full_name}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{roleLabel}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3 text-sm">
          <Mail className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          <span className="text-gray-600 dark:text-gray-300">{user.email}</span>
          {user.is_email_verified && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-900 dark:bg-gray-800 dark:text-gray-100">
              {t('verified')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <School className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          <span className="text-gray-600 dark:text-gray-300">{user.school}</span>
        </div>
      </div>
    </div>
  )
}


