'use client'

import { LogOut, Key, MessageSquareWarning } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/shared/components/ui'

interface UserProfileActionsProps {
  onLogout: () => void
  onChangePassword?: () => void
  onErrorReport?: () => void
}

export function UserProfileActions({ onLogout, onChangePassword, onErrorReport }: UserProfileActionsProps) {
  const t = useTranslations('profile')
  return (
    <div className="space-y-3">
      <Button variant="outline" className="w-full justify-start dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800">
        {t('actions.editProfile')}
      </Button>
      <Button
        variant="outline"
        className="w-full justify-start dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
        onClick={onChangePassword}
      >
        <Key className="mr-2 h-4 w-4" />
        {t('actions.changePassword')}
      </Button>
      <Button
        variant="outline"
        className="w-full justify-start dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
        onClick={onErrorReport}
      >
        <MessageSquareWarning className="mr-2 h-4 w-4" />
        {t('actions.errorReport')}
      </Button>
      <Button
        variant="ghost"
        className="w-full justify-start text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
        onClick={onLogout}
      >
        <LogOut className="mr-2 h-4 w-4" />
        {t('actions.logout')}
      </Button>
    </div>
  )
}


