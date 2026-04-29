'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/shared/lib/utils'
import { LanguageToggle } from '@/shared/components/common/LanguageToggle'
import { SIDEBAR_MENU, NEW_SIDEBAR_MENU, PROFILE_MENU, COURSE_SIDEBAR_MENU } from '@/shared/constants/nav'
import { computeDdaysToExam } from '@/shared/constants/examPrep'
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

/** 현재 pathname에서 courseId 추출 (없으면 null) */
function extractCourseId(pathname: string): string | null {
  const match = pathname.match(/^\/studyspace\/course\/([^/]+)/)
  return match?.[1] ?? null
}

function NewSidebar() {
  const t = useTranslations()
  const pathname = usePathname()
  const { isCollapsed, toggle, setCollapsed, isOverlayOpen, openOverlay, closeOverlay, isTablet } = useSidebarStore()
  const openFeedback = useFeedbackStore((s) => s.open)
  const [isGameModalOpen, setIsGameModalOpen] = useState(false)
  const wasTabletRef = useRef(false)

  // 태블릿 감지 (store.isTablet 동기화)
  useTabletDetector()

  // 과목 컨텍스트 진입 여부 — courseId가 추출되면 과목 메뉴로 전환
  const courseId = extractCourseId(pathname)
  const isCourseContext = courseId !== null

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
          {isCourseContext && courseId ? (
            <CourseContextNav
              courseId={courseId}
              pathname={pathname}
              visualCollapsed={visualCollapsed}
              onItemClick={() => {
                if (isTablet && isOverlayOpen) closeOverlay()
              }}
              openFeedback={openFeedback}
              t={t}
            />
          ) : (
            menuItems.map((item) => {
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
                    if ((item.id as string) === 'games') {
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
            })
          )}
        </nav>
      </aside>

      <GameSelectionModal
        open={isGameModalOpen}
        onClose={() => setIsGameModalOpen(false)}
      />
    </TooltipProvider>
  )
}

/* ───── 과목 컨텍스트 네비게이션 (Figma: 과목 대시보드 사이드바) ───── */

interface CourseContextNavProps {
  courseId: string
  pathname: string
  visualCollapsed: boolean
  onItemClick: () => void
  openFeedback: () => void
  t: ReturnType<typeof useTranslations>
}

function CourseContextNav({
  courseId,
  pathname,
  visualCollapsed,
  onItemClick,
  openFeedback,
  t,
}: CourseContextNavProps) {
  // 그룹별로 묶기
  const groups = useMemo(() => {
    const result: Record<'course' | 'resources' | 'global', typeof COURSE_SIDEBAR_MENU[number][]> = {
      course: [],
      resources: [],
      global: [],
    }
    COURSE_SIDEBAR_MENU.forEach((item) => result[item.group].push(item))
    return result
  }, [])

  const renderItem = (item: typeof COURSE_SIDEBAR_MENU[number]) => {
    const Icon = item.icon
    const href = item.hrefFor(courseId)
    const matchPath = item.matchFor(courseId)

    // dashboard는 정확 일치, dialogue는 lecture/[id]/dialogue 까지 포함, 그 외는 startsWith
    const isActive =
      item.id === 'course-dashboard'
        ? pathname === matchPath
        : item.action === 'feedback-modal'
          ? false
          : item.id === 'course-dialogue'
            ? pathname.includes('/dialogue')
            : pathname.startsWith(matchPath)

    const label = t(item.labelKey)
    const color = item.color

    const linkContent = (
      <Link
        key={item.id}
        href={href}
        onClick={(event) => {
          if (item.action === 'feedback-modal') {
            event.preventDefault()
            openFeedback()
          }
          onItemClick()
        }}
        className={cn(
          'group/menuitem relative flex items-center rounded-xl font-medium transition-all duration-300',
          visualCollapsed
            ? 'h-10 w-10 justify-center self-center p-0'
            : 'gap-3 px-3 py-2',
          isActive
            ? 'font-semibold'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800',
        )}
        style={isActive ? { backgroundColor: `${color}15` } : undefined}
      >
        <Icon
          className="h-[18px] w-[18px] shrink-0"
          style={{ color: isActive ? color : '#6B7280' }}
        />
        {!visualCollapsed && (
          <>
            <span
              className={cn(
                'flex-1 whitespace-nowrap text-[13px] transition-colors',
                isActive
                  ? 'text-gray-900 dark:text-gray-50'
                  : 'text-gray-600 dark:text-gray-400',
              )}
            >
              {label}
            </span>
            {/* D-Day 배지 — EXAM_DATE_ISO 기반 동적 계산. 색은 주황 유지 */}
            {item.showDdayBadge && (
              <span className="rounded-full bg-[#F97316] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                D-{computeDdaysToExam()}
              </span>
            )}
          </>
        )}
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
  }

  const renderSectionLabel = (labelKey: string) => {
    if (visualCollapsed) {
      return <div className="my-2 mx-3 h-px bg-gray-200 dark:bg-gray-700" />
    }
    return (
      <div className="mt-3 mb-1 px-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        {t(labelKey)}
      </div>
    )
  }

  return (
    <>
      {/* course 그룹 — 라벨 없음 (최상단) */}
      <div className="flex flex-col gap-1">
        {groups.course.map(renderItem)}
      </div>

      {/* resources 그룹 */}
      {groups.resources.length > 0 && (
        <div className="flex flex-col gap-1">
          {renderSectionLabel('courseNav.sectionResources')}
          {groups.resources.map(renderItem)}
        </div>
      )}

      {/* global 그룹 — 하단 고정 */}
      {groups.global.length > 0 && (
        <div className="mt-auto flex flex-col gap-1">
          {renderSectionLabel('courseNav.sectionGlobal')}
          {groups.global.map(renderItem)}
        </div>
      )}
    </>
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
