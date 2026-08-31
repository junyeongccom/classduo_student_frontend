'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from '@/shared/components/common'
import {
  StudyspaceLayoutProvider,
  useStudyspaceLayoutSlots,
} from '@/shared/components/layouts/studyspace'
import { Flame, Settings, MessageSquare, LogOut, Moon, KeyRound } from 'lucide-react'
import { useIsAppWebView } from '@/shared/lib/appBridge'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useI18n, type AppLocale } from '@/shared/i18n/I18nProvider'
import { getCourseRewardCounts } from '@/shared/services/progressService'
import { fetchMyCourseState, type StudentCourseStateDto } from '@/shared/services/gamificationService'
import { ExamPrepHeaderBar } from '@/features/exam-prep-final/components/ui/ExamPrepHeaderBar'
import { XpToastHost } from '@/shared/components/common/XpToastHost'
import { MissionsPanel } from '@/shared/components/common/MissionsPanel'
import { useSidebarStore, SIDEBAR_WIDTH_EXPANDED, SIDEBAR_WIDTH_COLLAPSED } from '@/shared/store/useSidebarStore'
import { useThemeStore } from '@/shared/store/useThemeStore'
import { FeedbackModalContainer, useFeedbackStore } from '@/features/error-report'
import { PasswordChangeModalContainer } from '@/features/user'
import { DialogueFeedbackModal } from '@/features/ai-tutor/components/ui/DialogueFeedbackModal'
import { useDialogueFeedbackPopup } from '@/features/ai-tutor/hooks/useDialogueFeedbackPopup'

function NewLanguageToggle() {
  const { locale, setLocale } = useI18n()
  const handle = (next: AppLocale) => setLocale(next)

  return (
    <div className="inline-flex items-center rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 p-1 shadow-sm">
      <button
        onClick={() => handle('en')}
        className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
          locale === 'en'
            ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => handle('ko')}
        className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
          locale === 'ko'
            ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
        }`}
      >
        KO
      </button>
    </div>
  )
}

function NewStudyspaceLayoutShell({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const { logout } = useAuth()
  const { locale } = useI18n()
  const { topbar } = useStudyspaceLayoutSlots()
  const pathname = usePathname()
  // 대화형 학습 이탈 시 만족도 평가 모달 트리거
  const dialogueFeedback = useDialogueFeedbackPopup()
  const sidebarCollapsed = useSidebarStore((s) => s.isCollapsed)
  const isTablet = useSidebarStore((s) => s.isTablet)
  const isMobile = useSidebarStore((s) => s.isMobile)
  // 모바일은 레일 없이 좌하단 플로팅 버튼 → 콘텐츠 좌패딩 0.
  // 태블릿에서는 사이드바가 항상 72px collapse 상태 (오버레이는 콘텐츠를 밀지 않음).
  const sidebarWidth = isMobile
    ? 0
    : isTablet
      ? SIDEBAR_WIDTH_COLLAPSED
      : sidebarCollapsed
        ? SIDEBAR_WIDTH_COLLAPSED
        : SIDEBAR_WIDTH_EXPANDED
  const isFeedbackOpen = useFeedbackStore((s) => s.isOpen)
  const closeFeedback = useFeedbackStore((s) => s.close)
  const openFeedback = useFeedbackStore((s) => s.open)
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggle)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [isFlamePopupOpen, setIsFlamePopupOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const flameRef = useRef<HTMLDivElement>(null)

  // 현재 URL에서 lectureId 추출
  const currentLectureId = (() => {
    const match = pathname.match(/\/lecture\/([^/]+)/)
    return match?.[1] ?? null
  })()

  // 콘텐츠형 학습 페이지 진입 시에만 불꽃 팝업 자동 표시 (대화형 학습 제외)
  const isDialoguePage = pathname.includes('/dialogue')

  // 풀이 모드 — 글로벌 사이드바 + 헤더 숨김 (자체 레이아웃 사용)
  const isSolveMode = /\/exam-prep\/test\//.test(pathname)

  // 앱 WebView 모드 — 앱 네이티브 UI와 중복되는 사이드바/헤더 숨김 (콘텐츠만 표시)
  const isAppMode = useIsAppWebView()

  useEffect(() => {
    if (!currentLectureId || isDialoguePage) {
      setIsFlamePopupOpen(false)
      return
    }
    const dismissed = localStorage.getItem(`flamePopup_dismissed_${currentLectureId}`)
    if (!dismissed) {
      setIsFlamePopupOpen(true)
    } else {
      setIsFlamePopupOpen(false)
    }
  }, [currentLectureId, isDialoguePage])

  // 프로필 드롭다운 외부 클릭 닫기
  useEffect(() => {
    if (!isProfileOpen) return
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isProfileOpen])

  // 불꽃 팝업 외부 클릭 닫기
  useEffect(() => {
    if (!isFlamePopupOpen) return
    const handleClick = (e: MouseEvent) => {
      if (flameRef.current && !flameRef.current.contains(e.target as Node)) {
        setIsFlamePopupOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isFlamePopupOpen])

  // 불꽃 카운트 조회 (전체 과목 합산, 페이지 무관 불변)
  const [flameCount, setFlameCount] = useState(0)

  useEffect(() => {
    if (!user) return
    getCourseRewardCounts().then(({ data }) => {
      if (!data) { setFlameCount(0); return }
      const total = data.reduce((sum, r) => sum + r.total_amount, 0)
      setFlameCount(total)
    })
  }, [user])

  // 보상 모달에서 발행하는 flame-increment 이벤트 수신
  useEffect(() => {
    const handler = () => setFlameCount(prev => prev + 1)
    window.addEventListener('flame-increment', handler)
    return () => window.removeEventListener('flame-increment', handler)
  }, [])

  // 기말 대비 학습 페이지 감지: /studyspace/course/[courseId]/exam-prep[/...]
  // 이 페이지에서는 보라색 불꽃 대신 도장/XP/계급 위젯을 표시한다.
  const examPrepMatch = pathname.match(/^\/studyspace\/course\/([^/]+)\/exam-prep(?:\/|$)/)
  const examPrepCourseId = examPrepMatch?.[1] ?? null
  const isExamPrepPage = !!examPrepCourseId

  // 2026-2 성장 시스템: XP·랭크 헤더를 과목 컨텍스트가 있는 모든 페이지로 확대 노출
  const courseCtxMatch = pathname.match(/^\/studyspace\/course\/([^/]+)/)
  const headerCourseId = courseCtxMatch?.[1] ?? null
  // 과목 대시보드에는 인라인 미션 카드가 있어 헤더 미션 버튼은 숨김 (2026-09-01)
  const isCourseDashboardPage = /^\/studyspace\/course\/[^/]+\/?$/.test(pathname)

  // 회차별 학습 페이지 감지 (/lectures 목록 + /lecture/[id] 상세).
  // 불꽃(연속 학습 보상)은 회차별 학습에서만 노출 — 과목 대시보드·대화형 등에서는 숨김.
  const isLectureStudyPage = /^\/studyspace\/course\/[^/]+\/lectures?(?:\/|$)/.test(pathname)

  const [gamificationState, setGamificationState] = useState<StudentCourseStateDto | null>(null)
  const [gamificationLoading, setGamificationLoading] = useState(false)

  const refreshGamification = useCallback(async () => {
    if (!headerCourseId || !user) return
    setGamificationLoading(true)
    try {
      const { data } = await fetchMyCourseState(headerCourseId)
      setGamificationState(data)
    } finally {
      setGamificationLoading(false)
    }
  }, [headerCourseId, user])

  // 과목 페이지 진입 / courseId 변경 시 fetch
  useEffect(() => {
    if (!headerCourseId) {
      setGamificationState(null)
      return
    }
    refreshGamification()
  }, [headerCourseId, refreshGamification])

  // 풀이 제출·XP 획득 등 외부 트리거 시 재조회
  useEffect(() => {
    if (!headerCourseId) return
    const handler = () => { refreshGamification() }
    window.addEventListener('exam-prep-rewards-refresh', handler)
    return () => window.removeEventListener('exam-prep-rewards-refresh', handler)
  }, [headerCourseId, refreshGamification])

  // main 은 overflow-hidden 고정 레이아웃이라 어떤 경로(패널 토글 시 브라우저
  // 스크롤 복원, focus 스크롤 등)로든 scrollTop 이 밀리면 화면 하단이 잘려 보인다
  // (2026-08-25 한림 회차학습 AI Chat 실측). scroll 이벤트에서 즉시 0 으로 고정한다.
  const mainScrollGuard = useCallback((el: HTMLElement | null) => {
    if (!el) return
    el.addEventListener('scroll', () => {
      if (el.scrollTop !== 0 || el.scrollLeft !== 0) {
        el.scrollTop = 0
        el.scrollLeft = 0
      }
    })
  }, [])

  // 풀이 모드 / 앱 WebView 모드 — 사이드바·헤더 없이 children만 풀스크린으로 표시
  // (모든 hook 호출 뒤에 early return 두어 React Hook 규칙 준수)
  if (isSolveMode || isAppMode) {
    return (
      <div className="flex h-dvh bg-[#F9F9FB] dark:bg-gray-950 text-gray-900 dark:text-gray-50">
        <main ref={mainScrollGuard} className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#F9F9FB] dark:bg-gray-950">
          {children}
        </main>
        {/* Feedback / Password 모달은 풀이 모드에서도 가능 */}
        <XpToastHost />
        <FeedbackModalContainer isOpen={isFeedbackOpen} onClose={closeFeedback} />
        <PasswordChangeModalContainer
          isOpen={isPasswordModalOpen}
          onClose={() => setIsPasswordModalOpen(false)}
          onLogout={logout}
        />
      </div>
    )
  }

  return (
    <div className="flex h-dvh bg-[#f5f7f8] dark:bg-gray-950 text-gray-900 dark:text-gray-50">
      <XpToastHost />
      <Sidebar />
      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden transition-[padding] duration-300 ease-in-out"
        style={{ paddingLeft: sidebarWidth }}
      >
        {/* Top Header Bar */}
        <header className="relative z-[40] flex shrink-0 items-center justify-between border-b border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-900/80 py-3 pl-4 pr-4 md:pl-8 backdrop-blur-md">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <NewLanguageToggle />
            {topbar && (
              <div className="min-w-0 flex-1">{topbar}</div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-3 pl-2 md:pl-6">
            {headerCourseId && (
              <div className="hidden md:flex md:items-center md:gap-3">
                <ExamPrepHeaderBar
                  state={gamificationState}
                  loading={gamificationLoading}
                  courseId={headerCourseId}
                />
                {!isCourseDashboardPage && <MissionsPanel courseId={headerCourseId} />}
              </div>
            )}
            {isLectureStudyPage && !isDialoguePage ? (
              <div ref={flameRef} className="relative hidden md:block">
                <button
                  id="flame-badge"
                  onClick={() => setIsFlamePopupOpen(v => !v)}
                  className="flex items-center gap-1.5 rounded-xl bg-[#6366F1]/10 px-3.5 py-2.5 text-[#6366F1] transition-colors hover:bg-[#6366F1]/20"
                >
                  <Flame className="h-5 w-5 fill-current" />
                  <span className="text-sm font-bold">{flameCount}</span>
                </button>
                {isFlamePopupOpen && (
                  <div className="absolute right-0 top-[calc(100%+8px)] z-[100] w-72 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-2xl">
                    <div className="mb-3">
                      <p className="text-sm font-medium leading-relaxed text-gray-700 dark:text-gray-300">
                        {locale === 'ko'
                          ? '퀴즈 20개를 모두 풀고 불꽃을 얻으세요!'
                          : 'Complete all 20 quizzes to earn flames!'}
                      </p>
                    </div>
                    <div className="flex items-center justify-end border-t border-gray-100 dark:border-gray-700 pt-3">
                      <button
                        onClick={() => {
                          if (currentLectureId) {
                            localStorage.setItem(`flamePopup_dismissed_${currentLectureId}`, '1')
                          }
                          setIsFlamePopupOpen(false)
                        }}
                        className="rounded-lg bg-[#6366F1] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#5558E6]"
                      >
                        {locale === 'ko' ? '확인' : 'OK'}
                      </button>
                    </div>
                    <div className="absolute -top-2 right-6 h-0 w-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] border-b-white dark:border-b-gray-900" />
                  </div>
                )}
              </div>
            ) : null}
            <div ref={profileRef} className="relative flex items-center gap-3 md:border-l md:border-gray-200 dark:border-gray-700 md:pl-3">
              <img src="/KU_logo.png" alt="" className="hidden md:block h-9 shrink-0 object-contain" />
              <div className="hidden md:block">
                <p className="text-sm font-bold leading-tight text-gray-900 dark:text-gray-50">{user?.full_name ?? ''}</p>
                <p className="truncate text-xs text-gray-500 dark:text-gray-500" style={{ maxWidth: 160 }}>{user?.email ?? ''}</p>
              </div>
              <button
                onClick={() => setIsProfileOpen((v) => !v)}
                className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                  isProfileOpen ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                <Settings className="h-4 w-4" />
              </button>

              {/* Profile Dropdown */}
              {isProfileOpen && (
                <div className="absolute right-0 top-[calc(100%+1px)] z-[100] w-56 overflow-hidden rounded-xl border border-gray-200/60 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl sm:w-full sm:rounded-b-xl sm:rounded-t-none sm:border-t-0">
                  <div className="flex flex-col py-0.5 sm:py-1">
                    {/* 개선 요청 */}
                    <button
                      onClick={() => { setIsProfileOpen(false); openFeedback() }}
                      className="group flex items-center gap-2.5 px-3 py-1.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 sm:gap-3 sm:px-4 sm:py-2.5"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg sm:h-8 sm:w-8 bg-[#6366F1]/10 text-[#6366F1] transition-colors group-hover:bg-[#6366F1] group-hover:text-white">
                        <MessageSquare className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {locale === 'ko' ? '개선 요청' : 'Send Feedback'}
                      </span>
                    </button>

                    {/* 비밀번호 변경 */}
                    <button
                      onClick={() => { setIsProfileOpen(false); setIsPasswordModalOpen(true) }}
                      className="group flex items-center gap-2.5 px-3 py-1.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 sm:gap-3 sm:px-4 sm:py-2.5"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg sm:h-8 sm:w-8 bg-amber-100 text-amber-600 transition-colors group-hover:bg-amber-500 group-hover:text-white">
                        <KeyRound className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {locale === 'ko' ? '비밀번호 변경' : 'Change Password'}
                      </span>
                    </button>

                    {/* 다크 모드 */}
                    <button
                      onClick={toggleTheme}
                      className="group flex items-center gap-2.5 px-3 py-1.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 sm:gap-3 sm:px-4 sm:py-2.5"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg sm:h-8 sm:w-8 bg-gray-100 text-gray-600 transition-colors group-hover:bg-gray-700 group-hover:text-white">
                        <Moon className="h-4 w-4" />
                      </div>
                      <span className="flex-1 text-left text-sm font-medium text-gray-900 dark:text-gray-100">
                        {locale === 'ko' ? '다크 모드' : 'Dark Mode'}
                      </span>
                      <div
                        className={`relative flex h-[22px] w-[40px] items-center rounded-full p-0.5 transition-colors ${
                          theme === 'dark' ? 'justify-end bg-[#6366F1]' : 'bg-gray-200'
                        }`}
                      >
                        <div className="h-full aspect-square rounded-full bg-white shadow-md" />
                      </div>
                    </button>

                    <div className="mx-3 my-0.5 border-t border-gray-100 dark:border-gray-700 sm:mx-4 sm:my-1" />

                    {/* 로그아웃 */}
                    <button
                      onClick={() => { setIsProfileOpen(false); logout() }}
                      className="group flex items-center gap-2.5 px-3 py-1.5 transition-colors hover:bg-red-50 sm:gap-3 sm:px-4 sm:py-2.5"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg sm:h-8 sm:w-8 bg-red-100 text-red-500 transition-colors group-hover:bg-red-500 group-hover:text-white">
                        <LogOut className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium text-red-500">
                        {locale === 'ko' ? '로그아웃' : 'Log Out'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        <main ref={mainScrollGuard} className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#F9F9FB] dark:bg-gray-950">
          {children}
        </main>
      </div>

      {/* Feedback Modal */}
      <FeedbackModalContainer isOpen={isFeedbackOpen} onClose={closeFeedback} />

      {/* Password Change Modal */}
      <PasswordChangeModalContainer
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onLogout={logout}
      />

      {/* 대화형 학습 만족도 평가 모달 — dialogue 페이지 이탈 시 자동 트리거 */}
      <DialogueFeedbackModal
        sessionId={dialogueFeedback.feedbackSessionId}
        onClose={dialogueFeedback.dismiss}
        onRated={dialogueFeedback.onRated}
      />
    </div>
  )
}

export default function StudyspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <StudyspaceLayoutProvider>
      <NewStudyspaceLayoutShell>{children}</NewStudyspaceLayoutShell>
    </StudyspaceLayoutProvider>
  )
}

