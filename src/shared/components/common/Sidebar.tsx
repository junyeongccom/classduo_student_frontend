'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/shared/lib/utils'
import { LanguageToggle } from '@/shared/components/common/LanguageToggle'
import { SIDEBAR_MENU, NEW_SIDEBAR_MENU, PROFILE_MENU, COURSE_SIDEBAR_MENU } from '@/shared/constants/nav'
import { isExamPrepLockedNow } from '@/features/course-dashboard'
import { useAuthStore } from '@/features/auth/store/authStore'
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
import { ChevronsLeft, Menu, Lock } from 'lucide-react'
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
  const searchParams = useSearchParams()
  const tabParam = searchParams?.get('tab') ?? null
  const { isCollapsed, toggle, setCollapsed, isOverlayOpen, openOverlay, closeOverlay, isTablet, isMobile } = useSidebarStore()
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

  // 실제 렌더 상태: 모바일 드로어는 항상 확장 콘텐츠, 태블릿 오버레이 열림이면 확장 표시
  const visualCollapsed = isMobile ? false : isTablet ? !isOverlayOpen : isCollapsed

  return (
    <TooltipProvider delayDuration={300}>
      {/* 비-데스크탑 오버레이 딤 배경 */}
      {isTablet && isOverlayOpen && (
        <div
          className="fixed inset-0 z-[49] bg-black/40 backdrop-blur-[2px] transition-opacity"
          onClick={closeOverlay}
        />
      )}

      {/* 모바일 — 좌하단 플로팅 토글 버튼 (레일 대체, Figma 787:9499) */}
      {isMobile && !isOverlayOpen && (
        <button
          onClick={openOverlay}
          aria-label="Open sidebar"
          className="fixed bottom-[max(env(safe-area-inset-bottom),calc(16px*var(--u)))] left-[calc(16px*var(--u))] z-[48] flex h-[calc(40px*var(--u))] w-[calc(40px*var(--u))] items-center justify-center rounded-[calc(10px*var(--u))] border border-gray-200 bg-white text-gray-700 shadow-lg dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
        >
          <Menu className="h-[calc(24px*var(--u))] w-[calc(24px*var(--u))]" />
        </button>
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 flex h-screen flex-col border-r border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden',
          'transition-[width,padding,transform] duration-300 ease-in-out',
          isTablet && isOverlayOpen ? 'z-[51]' : 'z-50',
          // pt 는 max(safe-area, 최소값) — pt-safe(=env)가 Tailwind pt-* 를 override 하던 문제 회피
          isMobile
            ? cn(
                'w-[calc(262px*var(--u))] max-w-[300px] px-[calc(9px*var(--u))] pb-6 pt-[max(env(safe-area-inset-top),1.5rem)] gap-[calc(16px*var(--u))]',
                isOverlayOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none',
              )
            : visualCollapsed
              ? 'w-[72px] px-3 pb-4 pt-[max(env(safe-area-inset-top),1.25rem)] gap-4'
              : 'w-[85vw] max-w-[280px] sm:w-[240px] sm:max-w-[240px] px-6 pb-6 pt-[max(env(safe-area-inset-top),2rem)] gap-8',
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
            <Link href="/studyspace/home" className={cn('flex min-w-0 items-center', isMobile ? 'gap-[calc(8px*var(--u))]' : 'gap-3')}>
              <img
                src="/Aplus_logo.png"
                alt="Aplus"
                className={cn('w-auto shrink-0', isMobile ? 'h-[calc(26px*var(--u))]' : 'h-9')}
              />
              <h2
                className={cn(
                  'truncate font-bold tracking-tight text-gray-900 dark:text-gray-50',
                  isMobile ? 'text-[calc(15px*var(--u))]' : 'text-xl sm:text-2xl',
                )}
              >
                Aplus
              </h2>
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
              tabParam={tabParam}
              visualCollapsed={visualCollapsed}
              scaled={isMobile}
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
  /** ?tab=... 값 — my-quizzes 와 create-question active 분기용 */
  tabParam: string | null
  visualCollapsed: boolean
  /** 모바일 드로어 — 항목 크기를 --u 비례로 확대 (Figma 모바일 시안) */
  scaled?: boolean
  onItemClick: () => void
  openFeedback: () => void
  t: ReturnType<typeof useTranslations>
}

function CourseContextNav({
  courseId,
  pathname,
  tabParam,
  visualCollapsed,
  scaled = false,
  onItemClick,
  openFeedback,
  t,
}: CourseContextNavProps) {
  // 기말대비학습(핵심 주제 학습) 버튼 잠금 — prod 에서 6/10 이전·비-allowlist 사용자는 잠금.
  // 자정 경계 hydration 안전을 위해 client mount 후 계산. allowlist 반영 위해 full_name 사용.
  const examPrepFullName = useAuthStore((s) => s.user?.full_name)
  const [examPrepLocked, setExamPrepLocked] = useState(false)
  useEffect(() => {
    setExamPrepLocked(isExamPrepLockedNow(examPrepFullName))
  }, [examPrepFullName])

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
    // 잠긴 기말대비학습 — 클릭 무효 + 흐리게 + D-Day 배지 대신 자물쇠.
    const isLockedItem = item.id === 'exam-prep' && examPrepLocked

    // my-quizzes(저장소) ↔ create-question(문제 만들기)는 같은 path를 공유하므로 ?tab=create 로 분기.
    // dashboard는 정확 일치, dialogue는 lecture/[id]/dialogue 까지 포함, 그 외는 startsWith.
    const myQuizPath = `/studyspace/course/${courseId}/my-quizzes`
    const isOnMyQuizzes = pathname.startsWith(myQuizPath)
    const isActive =
      item.id === 'course-dashboard'
        ? pathname === matchPath
        : item.action === 'feedback-modal'
          ? false
          : item.id === 'course-dialogue'
            ? pathname.includes('/dialogue')
            : item.id === 'my-quizzes'
              ? isOnMyQuizzes && tabParam !== 'create'
              : item.id === 'create-question'
                ? isOnMyQuizzes && tabParam === 'create'
                : pathname.startsWith(matchPath)

    const label = t(item.labelKey)

    const linkContent = (
      <Link
        key={item.id}
        href={href}
        aria-disabled={isLockedItem || undefined}
        tabIndex={isLockedItem ? -1 : undefined}
        onClick={(event) => {
          if (isLockedItem) {
            event.preventDefault()
            return
          }
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
            : scaled
              ? 'gap-[calc(11px*var(--u))] px-[calc(18px*var(--u))] py-[calc(11px*var(--u))]'
              : 'gap-3 px-3 py-2',
          isActive
            ? 'bg-gray-100 font-bold dark:bg-gray-800'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800',
          isLockedItem && 'cursor-not-allowed opacity-50 hover:bg-transparent dark:hover:bg-transparent',
        )}
      >
        {item.iconSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.iconSrc}
            alt=""
            className={cn(
              'shrink-0 object-contain',
              scaled ? 'h-[calc(21px*var(--u))] w-[calc(21px*var(--u))]' : 'h-[18px] w-[18px]',
            )}
            draggable={false}
          />
        ) : (
          <Icon
            className={cn(
              'shrink-0',
              scaled ? 'h-[calc(21px*var(--u))] w-[calc(21px*var(--u))]' : 'h-[18px] w-[18px]',
            )}
            style={{ color: isActive ? '#374151' : '#6B7280' }}
          />
        )}
        {!visualCollapsed && (
          <>
            <span
              className={cn(
                'flex-1 whitespace-nowrap transition-colors',
                scaled ? 'text-[calc(14px*var(--u))]' : 'text-[13px]',
                isActive
                  ? 'text-gray-900 dark:text-gray-50'
                  : 'text-gray-600 dark:text-gray-400',
              )}
            >
              {label}
            </span>
            {/* 잠긴 기말대비학습 — 자물쇠 아이콘 */}
            {isLockedItem ? (
              <Lock className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            ) : null}
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
      <div
        className={cn(
          'font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500',
          scaled
            ? 'mb-[calc(4px*var(--u))] mt-[calc(12px*var(--u))] px-[calc(18px*var(--u))] text-[calc(11px*var(--u))]'
            : 'mt-3 mb-1 px-4 text-[11px]',
        )}
      >
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
