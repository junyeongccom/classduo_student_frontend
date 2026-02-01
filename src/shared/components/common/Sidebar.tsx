'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/shared/lib/utils'
import { LanguageToggle } from '@/shared/components/common/LanguageToggle'
import { SIDEBAR_MENU, PROFILE_MENU } from '@/shared/constants/nav'
import {
  AI_TUTOR_NEW_CHAT_EVENT,
  AI_TUTOR_NEW_CHAT_FLAG,
  AI_TUTOR_NEW_CHAT_PARAM,
} from '@/shared/constants/aiTutor'

export function Sidebar() {
  const t = useTranslations()
  const pathname = usePathname()
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(true)
  const profileLabel = t(PROFILE_MENU.labelKey)
  const triggerAiTutorNewChat = () => {
    if (typeof window === 'undefined') return
    sessionStorage.setItem(AI_TUTOR_NEW_CHAT_FLAG, Date.now().toString())
    window.dispatchEvent(new Event(AI_TUTOR_NEW_CHAT_EVENT))
  }
  const navigateToAiTutorNewChat = () => {
    const timestamp = Date.now()
    const url = `/studyspace/ai-tutor?${AI_TUTOR_NEW_CHAT_PARAM}=${timestamp}`
    router.push(url)
  }
  const toggleMenu = useCallback(() => {
    setIsMenuOpen((prev) => !prev)
  }, [])
  const menuItems = useMemo(() => {
    return SIDEBAR_MENU.filter(item => item.id !== 'home' && item.id !== 'repeat')
  }, [])

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', '0px')
    return () => {
      document.documentElement.style.setProperty('--sidebar-width', '0px')
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleToggle = () => {
      toggleMenu()
    }
    window.addEventListener('classduo:sidebar-toggle', handleToggle)
    return () => {
      window.removeEventListener('classduo:sidebar-toggle', handleToggle)
    }
  }, [toggleMenu])

  return (
    <>
      <div className="fixed left-2 top-4 z-[60] flex w-[72px] items-center justify-center bg-transparent">
        <div className="flex items-center justify-center">
          <img src="/Aplus_logo.png" alt="CLASSDUO" className="h-8 w-auto" />
        </div>
      </div>
      <div className="fixed left-2 top-[72px] z-[60] flex w-[72px] items-center justify-center bg-transparent">
        <LanguageToggle size="sm" />
        </div>
      <aside
        className={cn(
          'fixed left-2 top-16 z-50 h-[calc(100vh-4rem)] overflow-visible bg-transparent transition-all duration-300',
          isMenuOpen ? 'w-[72px]' : 'w-0'
        )}
      >
        <div className="flex h-full flex-col items-center py-6">
          <nav className="mt-8 flex flex-1 flex-col items-center justify-center gap-5">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname.startsWith(item.href)
            const label = t(item.labelKey)

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={(event) => {
                  if (item.id === 'ai-tutor') {
                    event.preventDefault()
                    triggerAiTutorNewChat()
                    navigateToAiTutorNewChat()
                    return
                  }
                }}
                className={cn(
                  'flex flex-col items-center text-[11px] transition-colors',
                  isActive ? 'text-white' : 'text-gray-600 hover:text-gray-900'
                )}
                title={label}
              >
                <span
                  className={cn(
                    'flex h-12 w-12 flex-col items-center justify-center rounded-lg transition-all',
                    isActive ? 'bg-gray-900 shadow-sm' : ''
                  )}
              >
                <Icon className="h-5 w-5" />
                  <span
                    className={cn(
                      'mt-1 whitespace-nowrap text-[10px]',
                      isActive ? 'text-white' : 'text-gray-700'
                    )}
                  >
                    {label}
                  </span>
                </span>
              </Link>
            )
          })}
        </nav>

            <Link
              href={PROFILE_MENU.href}
              className={cn(
            'mb-2 flex flex-col items-center text-[11px] transition-colors',
                pathname === PROFILE_MENU.href
              ? 'text-white'
              : 'text-gray-600 hover:text-gray-900'
              )}
          title={profileLabel}
        >
          <span
            className={cn(
              'flex h-12 w-12 flex-col items-center justify-center rounded-lg transition-all',
              pathname === PROFILE_MENU.href ? 'bg-gray-900 shadow-sm' : ''
            )}
            >
              <PROFILE_MENU.icon className="h-5 w-5" />
            <span className={cn('mt-1 text-[10px]', pathname === PROFILE_MENU.href ? 'text-white' : 'text-gray-700')}>
              {profileLabel}
            </span>
          </span>
            </Link>
      </div>
    </aside>
    </>
  )
}


