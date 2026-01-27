'use client'

import { useEffect, useState } from 'react'
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
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function Sidebar() {
  const t = useTranslations()
  const pathname = usePathname()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)
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

  useEffect(() => {
    const width = isCollapsed ? '80px' : '140px'
    document.documentElement.style.setProperty('--sidebar-width', width)
    return () => {
      document.documentElement.style.setProperty('--sidebar-width', width)
    }
  }, [isCollapsed])

  return (
    <aside className={cn(
      "group fixed left-0 top-0 z-40 h-screen border-r border-gray-200 bg-white transition-all duration-300",
      isCollapsed ? "w-[80px]" : "w-[140px]"
    )}>
      <div className="flex h-full flex-col">
        {/* 로고 + 토글 버튼 */}
        <div className="relative flex h-16 items-center justify-center">
          <Link href="/studyspace/ai-tutor" className="flex items-center justify-center">
            {!isCollapsed && (
              <img src="/logo_korea.png" alt="CLASSDUO" className="h-5 w-auto" />
            )}
          </Link>
          
          {/* 접기/펼치기 버튼 - 사이드바 오른쪽에서 튀어나옴 */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 rounded-full border border-gray-200 bg-white p-1 text-gray-400 opacity-0 shadow-sm transition-all hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100"
          >
            {isCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {/* 메인 메뉴 */}
        <nav className="flex-1 space-y-1 px-2 py-4">
          {SIDEBAR_MENU.map((item) => {
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
                  'flex flex-col items-center gap-1 rounded-lg px-2 py-3 text-xs transition-colors',
                  isActive
                    ? 'bg-gray-100 text-gray-900 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                )}
                title={isCollapsed ? label : undefined}
              >
                <Icon className="h-5 w-5" />
                {!isCollapsed && <span>{label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* 프로필 (하단) */}
        <div className="px-2 py-4">
          <div className="mb-3">
            <Link
              href={PROFILE_MENU.href}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg px-2 py-3 text-xs transition-colors',
                pathname === PROFILE_MENU.href
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              )}
              title={isCollapsed ? profileLabel : undefined}
            >
              <PROFILE_MENU.icon className="h-5 w-5" />
              {!isCollapsed && <span>{profileLabel}</span>}
            </Link>
          </div>
        </div>
      </div>
    </aside>
  )
}


