'use client'

import { useAuth } from '@/features/auth'
import { useTranslations } from 'next-intl'
import { UserProfileActions } from '../../components/ui/UserProfileActions'
import { UserProfileCard } from '../../components/ui/UserProfileCard'

export function MyPageContainer() {
  const t = useTranslations('profile')
  const { user, logout } = useAuth()

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-400">
        {t('loadingUser')}
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col">
      <div className="flex-1 p-6">
        <h1 className="mb-6 text-xl font-bold text-gray-900">{t('title')}</h1>

        <div className="max-w-md space-y-6">
          <UserProfileCard user={user} />
          <UserProfileActions onLogout={logout} />
        </div>
      </div>
    </div>
  )
}


