'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/shared/lib/utils'
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
    return SIDEBAR_MENU
  }, [])

  useEffect(() => {
    const width = isMenuOpen ? '72px' : '0px'
    document.documentElement.style.setProperty('--sidebar-width', width)
    return () => {
      document.documentElement.style.setProperty('--sidebar-width', '0px')
    }
  }, [isMenuOpen])

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
      <div className="fixed left-0 top-0 z-[60] flex h-14 w-[72px] items-center justify-center bg-white">
          <button
          type="button"
          onClick={toggleMenu}
          className="flex items-center justify-center"
          aria-label="Toggle sidebar menu"
          >
          <img src="/Aplus_logo.png" alt="CLASSDUO" className="h-8 w-auto" />
          </button>
        </div>
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-screen overflow-hidden border-r border-gray-100 bg-white transition-all duration-300',
          isMenuOpen ? 'w-[72px]' : 'w-0'
        )}
      >
        <div className="flex h-full flex-col items-center py-6 pt-16">
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
                  isActive ? 'text-gray-900' : 'text-gray-600 hover:text-gray-900'
                )}
                title={label}
              >
                <span
                  className={cn(
                    'flex h-12 w-12 flex-col items-center justify-center rounded-lg transition-all',
                    isActive ? 'bg-gray-100' : ''
                  )}
              >
                <Icon className="h-5 w-5" />
                  <span
                    className={cn(
                      'mt-1 whitespace-nowrap text-[10px] text-gray-700',
                      item.id === 'repeat' ? 'text-[9px]' : ''
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
              ? 'text-gray-900'
              : 'text-gray-600 hover:text-gray-900'
              )}
          title={profileLabel}
        >
          <span
            className={cn(
              'flex h-12 w-12 flex-col items-center justify-center rounded-lg transition-all',
              pathname === PROFILE_MENU.href ? 'bg-gray-100' : ''
            )}
            >
              <PROFILE_MENU.icon className="h-5 w-5" />
            <span className="mt-1 text-[10px] text-gray-700">{profileLabel}</span>
          </span>
            </Link>
      </div>
    </aside>
    </>
  )
}


