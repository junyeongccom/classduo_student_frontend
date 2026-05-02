'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from '@/shared/components/common'
import {
  StudyspaceLayoutProvider,
  useStudyspaceLayoutSlots,
} from '@/shared/components/layouts/studyspace'
import { PanelRightOpen, X, Flame, Settings, MessageSquare, LogOut, Moon, KeyRound } from 'lucide-react'
import { useAITutorStore } from '@/features/ai-tutor/store/useAITutorStore'
import { useNewStudyspace } from '@/shared/lib/featureFlags'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useI18n, type AppLocale } from '@/shared/i18n/I18nProvider'
import { getCourseRewardCounts } from '@/shared/services/progressService'
import { fetchMyCourseState, type StudentCourseStateDto } from '@/shared/services/gamificationService'
import { ExamPrepHeaderBar } from '@/features/exam-prep-final/components/ui/ExamPrepHeaderBar'
import { useSidebarStore, SIDEBAR_WIDTH_EXPANDED, SIDEBAR_WIDTH_COLLAPSED } from '@/shared/store/useSidebarStore'
import { useThemeStore } from '@/shared/store/useThemeStore'
import { FeedbackModalContainer, useFeedbackStore } from '@/features/error-report'
import { PasswordChangeModalContainer } from '@/features/user'

function NewLanguageToggle() {
  const { locale, setLocale } = useI18n()
  const handle = (next: AppLocale) => setLocale(next)

  return (
    <div className="inline-flex items-center rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 p-1 shadow-sm">
      <button
        onClick={() => handle('en')}
        className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
          locale === 'en'
            ? 'bg-[#6366F1] text-white'
            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => handle('ko')}
        className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
          locale === 'ko'
            ? 'bg-[#6366F1] text-white'
            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
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
  const sidebarCollapsed = useSidebarStore((s) => s.isCollapsed)
  const isTablet = useSidebarStore((s) => s.isTablet)
  // 태블릿에서는 사이드바가 항상 72px collapse 상태 (오버레이는 콘텐츠를 밀지 않음)
  const sidebarWidth = isTablet ? SIDEBAR_WIDTH_COLLAPSED : (sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED)
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

  const [gamificationState, setGamificationState] = useState<StudentCourseStateDto | null>(null)
  const [gamificationLoading, setGamificationLoading] = useState(false)

  const refreshGamification = useCallback(async () => {
    if (!examPrepCourseId || !user) return
    setGamificationLoading(true)
    try {
      const { data } = await fetchMyCourseState(examPrepCourseId)
      setGamificationState(data)
    } finally {
      setGamificationLoading(false)
    }
  }, [examPrepCourseId, user])

  // 기말 대비 페이지 진입 / courseId 변경 시 fetch
  useEffect(() => {
    if (!isExamPrepPage) {
      setGamificationState(null)
      return
    }
    refreshGamification()
  }, [isExamPrepPage, examPrepCourseId, refreshGamification])

  // 풀이 제출 등 외부 트리거 시 재조회
  useEffect(() => {
    if (!isExamPrepPage) return
    const handler = () => { refreshGamification() }
    window.addEventListener('exam-prep-rewards-refresh', handler)
    return () => window.removeEventListener('exam-prep-rewards-refresh', handler)
  }, [isExamPrepPage, refreshGamification])

  // 풀이 모드 — 사이드바·헤더 없이 children만 풀스크린으로 표시
  // (모든 hook 호출 뒤에 early return 두어 React Hook 규칙 준수)
  if (isSolveMode) {
    return (
      <div className="flex h-screen bg-[#F9F9FB] dark:bg-gray-950 text-gray-900 dark:text-gray-50">
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#F9F9FB] dark:bg-gray-950">
          {children}
        </main>
        {/* Feedback / Password 모달은 풀이 모드에서도 가능 */}
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
    <div className="flex h-screen bg-[#f5f7f8] dark:bg-gray-950 text-gray-900 dark:text-gray-50">
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
          <div className="flex shrink-0 items-center gap-3 pl-6">
            {isExamPrepPage ? (
              <ExamPrepHeaderBar
                state={gamificationState}
                loading={gamificationLoading}
              />
            ) : (
              <div ref={flameRef} className="relative">
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
                      <p className="text-sm font-medium leading-relaxed text-gray-700 dark:text-gray-300">
                        {locale === 'ko'
                          ? '추첨 이벤트 예정!'
                          : 'Raffle event coming soon!'}
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
            )}
            <div ref={profileRef} className="relative flex items-center gap-3 border-l border-gray-200 dark:border-gray-700 pl-3">
              <img src="/KU_logo.png" alt="" className="h-9 shrink-0 object-contain" />
              <div>
                <p className="text-sm font-bold leading-tight text-gray-900 dark:text-gray-50">{user?.full_name ?? ''}</p>
                <p className="truncate text-xs text-gray-400 dark:text-gray-500" style={{ maxWidth: 160 }}>{user?.email ?? ''}</p>
              </div>
              <button
                onClick={() => setIsProfileOpen((v) => !v)}
                className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                  isProfileOpen ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                <Settings className="h-4 w-4" />
              </button>

              {/* Profile Dropdown */}
              {isProfileOpen && (
                <div className="absolute right-0 top-[calc(100%+1px)] z-[100] w-full overflow-hidden rounded-b-xl border border-t-0 border-gray-200/60 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl">
                  <div className="flex flex-col py-1">
                    {/* 개선 요청 */}
                    <button
                      onClick={() => { setIsProfileOpen(false); openFeedback() }}
                      className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6366F1]/10 text-[#6366F1] transition-colors group-hover:bg-[#6366F1] group-hover:text-white">
                        <MessageSquare className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {locale === 'ko' ? '개선 요청' : 'Send Feedback'}
                      </span>
                    </button>

                    {/* 비밀번호 변경 */}
                    <button
                      onClick={() => { setIsProfileOpen(false); setIsPasswordModalOpen(true) }}
                      className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600 transition-colors group-hover:bg-amber-500 group-hover:text-white">
                        <KeyRound className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {locale === 'ko' ? '비밀번호 변경' : 'Change Password'}
                      </span>
                    </button>

                    {/* 다크 모드 */}
                    <button
                      onClick={toggleTheme}
                      className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition-colors group-hover:bg-gray-700 group-hover:text-white">
                        <Moon className="h-4 w-4" />
                      </div>
                      <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">
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

                    <div className="mx-4 my-1 border-t border-gray-100 dark:border-gray-700" />

                    {/* 로그아웃 */}
                    <button
                      onClick={() => { setIsProfileOpen(false); logout() }}
                      className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-red-50"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-500 transition-colors group-hover:bg-red-500 group-hover:text-white">
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
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#F9F9FB] dark:bg-gray-950">
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
    </div>
  )
}

function StudyspaceLayoutShell({ children }: { children: React.ReactNode }) {
  const { rightbar, overlay } = useStudyspaceLayoutSlots()
  const pathname = usePathname()
  const [isMobileRightbarOpen, setIsMobileRightbarOpen] = useState(false)
  const [isResizingOverlay, setIsResizingOverlay] = useState(false)
  
  const { 
    materialsPanelWidth, 
    setMaterialsPanelWidth,
    notesPanelWidth,
    setNotesPanelWidth,
    isNotesPanelOpen,
    isMaterialsPanelOpen 
  } = useAITutorStore()

  // Sidebar Logic: Hide Sidebar if Notes or Materials Panel is open
  const isAnyPanelOpen = isNotesPanelOpen || isMaterialsPanelOpen
  const showRightSidebar = !isAnyPanelOpen
  const isExamPrep = pathname.startsWith('/studyspace/my-quizzes')
  const isTutorOrReview = pathname.startsWith('/studyspace/feedback') || pathname.startsWith('/studyspace/games')
  const borderTone = isExamPrep || isTutorOrReview ? 'border-gray-200' : 'border-gray-100'

  const resizingRef = useRef<{ startX: number; startCombinedWidth: number } | null>(null)

  const handleOverlayMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizingOverlay(true)
    
    // Capture combined width if Notes panel is open
    if (isNotesPanelOpen) {
      resizingRef.current = {
        startX: e.clientX,
        startCombinedWidth: notesPanelWidth + materialsPanelWidth
      }
    } else {
      resizingRef.current = null
    }
  }

  useEffect(() => {
    if (!isResizingOverlay) return

    const handleMouseMove = (e: MouseEvent) => {
      // 레이아웃 상수
      const LEFT_MENU_WIDTH = 88      // 좌측 메뉴
      const MIN_CHAT_WIDTH = 280      // 채팅창 최소 너비
      const MIN_NOTES_WIDTH = 300     // 노트 패널 최소 너비
      const MIN_MATERIALS_WIDTH = 340 // 머티리얼 패널 최소 너비

      const desiredMaterialsWidth = window.innerWidth - e.clientX
      // 패널이 열려있으면 강의 사이드바(320px)가 숨겨지므로 좌측 메뉴만 고정폭
      const totalFixedWidth = LEFT_MENU_WIDTH
      
      if (isNotesPanelOpen) {
        // 전체 가용 공간 = 화면 - 좌측메뉴 (사이드바는 패널 열릴 때 숨겨짐)
        const availableSpace = window.innerWidth - totalFixedWidth
        // 현재 채팅창 너비
        const currentChatWidth = availableSpace - notesPanelWidth - materialsPanelWidth
        
        let targetMaterialsWidth = desiredMaterialsWidth
        let targetNotesWidth = notesPanelWidth
        
        // 머티리얼 최소 보장
        if (targetMaterialsWidth < MIN_MATERIALS_WIDTH) {
          targetMaterialsWidth = MIN_MATERIALS_WIDTH
        }
        
        if (desiredMaterialsWidth > materialsPanelWidth) {
          // 강의자료 확장 (두 번째 경계선을 왼쪽으로 밀기)
          // 채팅창 고정, 녹음본↔강의자료 트레이드
          const combinedPanelWidth = notesPanelWidth + materialsPanelWidth
          targetNotesWidth = combinedPanelWidth - targetMaterialsWidth
          
          // 녹음본이 최소에 도달하면 → 채팅창도 밀기
          if (targetNotesWidth < MIN_NOTES_WIDTH) {
            targetNotesWidth = MIN_NOTES_WIDTH
            // 강의자료 최대 = 전체 - 채팅최소 - 녹음본최소
            const maxMaterialsWidth = availableSpace - MIN_CHAT_WIDTH - MIN_NOTES_WIDTH
            targetMaterialsWidth = Math.min(desiredMaterialsWidth, maxMaterialsWidth)
          }
        } else {
          // 강의자료 축소 (두 번째 경계선을 오른쪽으로 당기기)
          // 채팅창 고정, 녹음본↔강의자료 트레이드
          const combinedPanelWidth = notesPanelWidth + materialsPanelWidth
          targetNotesWidth = combinedPanelWidth - targetMaterialsWidth
          
          // 녹음본 최대 제한 없음 (첫 번째 경계선이 고정이므로)
        }
        
        setMaterialsPanelWidth(targetMaterialsWidth)
        setNotesPanelWidth(targetNotesWidth)
      } else {
        // 노트 패널이 닫혀있을 때: 채팅↔강의자료 트레이드
        const maxMaterialsWidth = window.innerWidth - totalFixedWidth - MIN_CHAT_WIDTH
        const targetMaterialsWidth = Math.max(MIN_MATERIALS_WIDTH, Math.min(desiredMaterialsWidth, maxMaterialsWidth))
        setMaterialsPanelWidth(targetMaterialsWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizingOverlay(false)
      resizingRef.current = null
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizingOverlay, setMaterialsPanelWidth, isNotesPanelOpen, notesPanelWidth, setNotesPanelWidth, materialsPanelWidth])

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <Sidebar />

      <div className="flex min-h-0 flex-1 transition-all duration-300">
        <div 
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex min-h-0 flex-1 overflow-hidden pl-[88px]">
            {!isExamPrep && showRightSidebar && (
              <button
                onClick={() => setIsMobileRightbarOpen(true)}
                className="fixed right-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50 xl:hidden"
                aria-label="Open right sidebar"
              >
                <PanelRightOpen className="h-5 w-5" />
              </button>
            )}
            {/* Right Sidebar (Desktop) - Now between left menu and main */}
            {!isExamPrep && showRightSidebar && (
              <aside className={`hidden h-full min-h-0 w-[320px] flex-col border-r ${borderTone} bg-white xl:flex`}>
                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                  {rightbar ?? null}
                </div>
              </aside>
            )}

            {/* Main Content Area */}
            <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-50">
              <div className="flex min-h-0 flex-1 flex-col">
                {children}
              </div>
            </main>

            {/* Materials Panel (Overlay Slot) - Render in layout flow if open */}
            {!isExamPrep && overlay && (
              <aside 
                className={`relative hidden h-full flex-col border-l ${borderTone} bg-white xl:flex`}
                style={{ width: materialsPanelWidth }}
              >
                {/* Resizer Handle */}
                <div
                  onMouseDown={handleOverlayMouseDown}
                  className={`absolute left-0 top-0 z-50 h-full w-1 -translate-x-1/2 cursor-col-resize hover:bg-primary-500/50 ${
                    isResizingOverlay ? 'bg-primary-500' : 'bg-transparent'
                  }`}
                />
                <div className="flex-1 overflow-y-auto">
                  {overlay}
                </div>
              </aside>
            )}
          </div>

          {/* Right Sidebar (Mobile Drawer) */}
          {/* Always available on mobile, regardless of panel state? 
              User said: "모바일에서는 Drawer(overlay)로 유지하겠습니다."
              So mobile behavior remains unchanged (hidden xl:flex logic handles desktop visibility).
              Wait, if we hide desktop sidebar, do we affect mobile?
              The 'aside' above has 'hidden xl:flex'.
              The drawer below handles 'xl:hidden'.
              So mobile drawer is independent of the desktop 'showRightSidebar' logic.
          */}
          {!isExamPrep && isMobileRightbarOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm xl:hidden"
                onClick={() => setIsMobileRightbarOpen(false)}
              />
              
              {/* Drawer */}
              <aside className="fixed inset-y-0 right-0 z-50 flex w-[320px] flex-col bg-white shadow-xl transition-transform duration-300 xl:hidden">
                <div className="flex h-14 items-center justify-between border-b border-gray-100 px-4 text-gray-700">
                  <span className="font-semibold text-gray-800">메뉴</span>
                  <button
                    onClick={() => setIsMobileRightbarOpen(false)}
                    className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                {/* On mobile, we might want to show either Sidebar or Materials? 
                    For now, keeping it as Rightbar (Lecture List) as per original drawer implementation.
                    If user wants Materials on mobile, it's typically a separate full-screen or sheet.
                    Let's keep showing 'rightbar' here.
                */}
                <div className="flex-1 overflow-y-auto">
                  {rightbar ?? null}
                </div>
              </aside>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function StudyspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const isNewUI = useNewStudyspace()

  if (isNewUI) {
    return (
      <StudyspaceLayoutProvider>
        <NewStudyspaceLayoutShell>{children}</NewStudyspaceLayoutShell>
      </StudyspaceLayoutProvider>
    )
  }

  return (
    <StudyspaceLayoutProvider>
      <StudyspaceLayoutShell>{children}</StudyspaceLayoutShell>
    </StudyspaceLayoutProvider>
  )
}

