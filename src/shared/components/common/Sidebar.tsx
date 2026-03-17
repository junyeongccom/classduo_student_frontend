'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/shared/lib/utils'
import { LanguageToggle } from '@/shared/components/common/LanguageToggle'
import { SIDEBAR_MENU, NEW_SIDEBAR_MENU, PROFILE_MENU } from '@/shared/constants/nav'
import {
  AI_TUTOR_NEW_CHAT_EVENT,
  AI_TUTOR_NEW_CHAT_FLAG,
  AI_TUTOR_NEW_CHAT_PARAM,
} from '@/shared/constants/aiTutor'
import { useNewStudyspace } from '@/shared/lib/featureFlags'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui/Tooltip'
import { useSidebarStore, useTabletDetector } from '@/shared/store/useSidebarStore'
import { useFeedbackStore } from '@/features/error-report'
import { ChevronsLeft, Menu } from 'lucide-react'
import { GameSelectionModal } from './GameSelectionModal'

export function Sidebar() {
  const isNewUI = useNewStudyspace()

  if (isNewUI) {
    return <NewSidebar />
  }

  return <LegacySidebar />
}

/* ───── New UI: 접이식 사이드바 (240px ↔ 72px) ───── */

function NewSidebar() {
  const t = useTranslations()
  const pathname = usePathname()
  const { isCollapsed, toggle, setCollapsed, isOverlayOpen, openOverlay, closeOverlay, isTablet } = useSidebarStore()
  const openFeedback = useFeedbackStore((s) => s.open)
  const [isGameModalOpen, setIsGameModalOpen] = useState(false)
  const wasTabletRef = useRef(false)

  // 태블릿 감지 (store.isTablet 동기화)
  useTabletDetector()

  const menuItems = useMemo(() => [...NEW_SIDEBAR_MENU], [])

  // 태블릿 진입/이탈 시 자동 collapse/expand
  useEffect(() => {
    if (isTablet && !wasTabletRef.current) {
      setCollapsed(true)
      closeOverlay()
    } else if (!isTablet && wasTabletRef.current) {
      setCollapsed(false)
    }
    wasTabletRef.current = isTablet
  }, [isTablet, setCollapsed, closeOverlay])

  // 태블릿에서 아이콘 클릭 시 오버레이 토글
  const handleSidebarToggle = () => {
    if (isTablet) {
      if (isOverlayOpen) {
        closeOverlay()
      } else {
        openOverlay()
      }
    } else {
      toggle()
    }
  }

  // 실제 렌더 상태: 태블릿 오버레이 열림이면 확장 표시
  const visualCollapsed = isTablet ? !isOverlayOpen : isCollapsed

  return (
    <TooltipProvider delayDuration={300}>
      {/* 태블릿 오버레이 딤 배경 */}
      {isTablet && isOverlayOpen && (
        <div
          className="fixed inset-0 z-[49] bg-black/40 backdrop-blur-[2px] transition-opacity"
          onClick={closeOverlay}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 flex h-screen flex-col border-r border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden',
          'transition-[width,padding] duration-300 ease-in-out',
          isTablet && isOverlayOpen ? 'z-[51]' : 'z-50',
          visualCollapsed ? 'w-[72px] px-3 py-4 gap-4' : 'w-[240px] px-6 py-6 gap-8',
        )}
      >
        {/* Header */}
        <div className="relative flex h-10 shrink-0 items-center">
          {/* 햄버거 — 닫힌 상태에서 보임 */}
          <button
            onClick={handleSidebarToggle}
            className={cn(
              'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200',
              visualCollapsed ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none',
            )}
            aria-label="Open sidebar"
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* 로고 + 접기 — 열린 상태에서 보임 */}
          <div
            className={cn(
              'flex w-full items-center justify-between px-2 transition-all duration-300',
              visualCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100',
            )}
          >
            <Link href="/studyspace/home" className="flex items-center gap-3">
              <img src="/Aplus_logo.png" alt="Aplus" className="h-9 w-auto shrink-0" />
              <h2 className="whitespace-nowrap text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">Aplus</h2>
            </Link>
            <button
              onClick={handleSidebarToggle}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Collapse sidebar"
            >
              <ChevronsLeft className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname.startsWith(item.href)
            const label = t(item.labelKey)
            const color = item.color

            const linkContent = (
              <Link
                key={item.id}
                href={item.href}
                onClick={(event) => {
                  if (item.id === 'feedback') {
                    event.preventDefault()
                    openFeedback()
                  }
                  if (item.id === 'games') {
                    event.preventDefault()
                    setIsGameModalOpen(true)
                  }
                  // 태블릿에서 네비게이션 후 오버레이 닫기
                  if (isTablet && isOverlayOpen) {
                    closeOverlay()
                  }
                }}
                className={cn(
                  'flex items-center rounded-xl font-medium transition-all duration-300',
                  visualCollapsed ? 'justify-center px-0 py-3' : 'gap-4 px-4 py-3',
                  isActive
                    ? 'font-semibold'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800',
                )}
                style={isActive ? { backgroundColor: `${color}10` } : undefined}
              >
                <Icon
                  className="h-5 w-5 shrink-0"
                  style={{ color }}
                />
                <span
                  className={cn(
                    'whitespace-nowrap transition-all duration-300',
                    visualCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100',
                    isActive ? 'text-gray-900 dark:text-gray-50' : 'text-gray-500 dark:text-gray-400',
                  )}
                >
                  {label}
                </span>
              </Link>
            )

            if (visualCollapsed) {
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {label}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return linkContent
          })}
        </nav>
      </aside>

      <GameSelectionModal
        open={isGameModalOpen}
        onClose={() => setIsGameModalOpen(false)}
      />
    </TooltipProvider>
  )
}

/* ───── Legacy UI: 88px 아이콘 사이드바 ───── */

function LegacySidebar() {
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
    const url = `/studyspace/feedback?${AI_TUTOR_NEW_CHAT_PARAM}=${timestamp}`
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
    <TooltipProvider delayDuration={200}>
      <div className="fixed left-0 top-4 z-[60] flex w-[88px] items-center justify-center bg-transparent">
        <div className="flex items-center justify-center">
          <img src="/Aplus_logo.png" alt="CLASSDUO" className="h-8 w-auto" />
        </div>
      </div>
      <div className="fixed left-0 top-[72px] z-[60] flex w-[88px] items-center justify-center bg-transparent">
        <LanguageToggle size="sm" />
      </div>
      <aside
        className={cn(
          'fixed left-0 top-16 z-50 h-[calc(100vh-4rem)] overflow-visible bg-transparent transition-all duration-300',
          isMenuOpen ? 'w-[88px]' : 'w-0'
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
                      'flex h-[72px] w-[72px] flex-col items-center justify-center rounded-lg transition-all',
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
                'flex h-[72px] w-[72px] flex-col items-center justify-center rounded-lg transition-all',
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
    </TooltipProvider>
  )
}
