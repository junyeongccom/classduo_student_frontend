'use client'

import { Mail, School, User } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { UserProfileResponse } from '@/features/auth'

interface UserProfileCardProps {
  user: UserProfileResponse
}

export function UserProfileCard({ user }: UserProfileCardProps) {
  const t = useTranslations('profile')
  return (
    <div className="rounded-lg border border-gray-200 p-6">
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
          <User className="h-8 w-8 text-primary-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{user.full_name}</h2>
          <p className="text-sm text-gray-500">{user.role}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3 text-sm">
          <Mail className="h-4 w-4 text-gray-400" />
          <span className="text-gray-600">{user.email}</span>
          {user.is_email_verified && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-600">
              {t('verified')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <School className="h-4 w-4 text-gray-400" />
          <span className="text-gray-600">{user.school}</span>
        </div>
      </div>
    </div>
  )
}


