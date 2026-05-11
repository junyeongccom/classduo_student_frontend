/**
 * @file LectureStudyContainer.tsx
 * @description 회차별 학습 메인 컨테이너 — 접이식 강의자료(좌) + 요약/퀴즈/게임(중앙) + 접이식 채팅(우)
 * @module features/lecture-study/components/containers
 * @dependencies useLectureDetail, useLectureStudyStore, Tabs, LeftPanelMaterials, RightPanelPlaceholder, useIsMobile
 */

'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { Loader2, X, ChevronRight, FileText, Bot } from 'lucide-react'
import Link from 'next/link'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui'
import { trackTabView } from '@/shared/hooks/useAnalytics'
import { trackPageEnter, trackPageLeave, lectureStudyAnalytics, panelAnalytics, materialViewAnalytics, createFocusLossTracker } from '@/shared/lib/analytics'
import { StudyspaceTopbarSlot } from '@/shared/components/layouts/studyspace'
import { useLectureDetail } from '../../hooks/useLectureDetail'
import { useLectures } from '../../hooks/useLectures'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { useSidebarStore } from '@/shared/store/useSidebarStore'
import { useLectureStudyStore } from '../../store/useLectureStudyStore'
import { LeftPanelMaterials } from './LeftPanelMaterials'
import { LeftPanelRecordings } from '../ui/LeftPanelRecordings'
import { SummaryTabContainer } from './SummaryTabContainer'
import { QuizTabContainer } from './QuizTabContainer'
import { GameTabContainer } from './GameTabContainer'
import { ContentsChatPanel } from '../ui/ContentsChatPanel'
import type { LeftPanelTab, LectureStudyTab } from '../../types'

const MIN_LEFT_WIDTH = 320
const MIN_CENTER_WIDTH = 280
const MIN_CHAT_WIDTH = 300

interface LectureStudyContainerProps {
  lectureId: string
  courseId?: string
  courseTitle?: string
  lectureTitle?: string
}

export function LectureStudyContainer({ lectureId, courseId, courseTitle, lectureTitle }: LectureStudyContainerProps) {
  const t = useTranslations()
  const isMobile = useIsMobile()
  const searchParams = useSearchParams()
  const { recordings, isLoading, error, refresh } = useLectureDetail(lectureId)
  const { lectures, courseTitle: fetchedCourseTitle } = useLectures(courseId ?? '')

  const currentLecture = useMemo(
    () => lectures.find((l) => l.id === lectureId),
    [lectures, lectureId],
  )

  // Store
  const isLeftPanelOpen = useLectureStudyStore(s => s.isLeftPanelOpen)
  const isChatPanelOpen = useLectureStudyStore(s => s.isChatPanelOpen)
  const leftTab = useLectureStudyStore(s => s.leftTab)
  const rightTab = useLectureStudyStore(s => s.rightTab)
  const _toggleLeftPanel = useLectureStudyStore(s => s.toggleLeftPanel)
  const _toggleChatPanel = useLectureStudyStore(s => s.toggleChatPanel)

  const toggleLeftPanel = useCallback(() => {
    _toggleLeftPanel()
    panelAnalytics.toggle('material', !isLeftPanelOpen, lectureId)
  }, [_toggleLeftPanel, isLeftPanelOpen, lectureId])

  const toggleChatPanel = useCallback(() => {
    _toggleChatPanel()
    panelAnalytics.toggle('chat', !isChatPanelOpen, lectureId)
  }, [_toggleChatPanel, isChatPanelOpen, lectureId])
  const setLeftTab = useLectureStudyStore(s => s.setLeftTab)
  const setRightTab = useLectureStudyStore(s => s.setRightTab)
  const setStoreLectureId = useLectureStudyStore(s => s.setLectureId)
  const setGameWords = useLectureStudyStore(s => s.setGameWords)
  const targetChunkIndex = useLectureStudyStore(s => s.targetChunkIndex)
  const setTargetChunkIndex = useLectureStudyStore(s => s.setTargetChunkIndex)
  const resetNavigationState = useLectureStudyStore(s => s.resetNavigationState)
  const setTotalRecordingChunks = useLectureStudyStore(s => s.setTotalRecordingChunks)
  const quizChatContext = useLectureStudyStore(s => s.quizChatContext)
  const clearQuizChatContext = useLectureStudyStore(s => s.clearQuizChatContext)

  // Analytics: 페이지 체류시간 추적 (이탈 시 마지막 탭 정보 포함)
  const rightTabRef = useRef(rightTab)
  useEffect(() => { rightTabRef.current = rightTab }, [rightTab])
  useEffect(() => {
    trackPageEnter('lecture_study', { lectureId, courseId })
    return () => { trackPageLeave('lecture_study', { lectureId, courseId, lastTab: rightTabRef.current }) }
  }, [lectureId, courseId])

  // Analytics: 포커스 이탈 감지
  useEffect(() => {
    return createFocusLossTracker('lecture_study', lectureId)
  }, [lectureId])

  useEffect(() => {
    setStoreLectureId(lectureId)
    setGameWords([])
    resetNavigationState() // Task 785: lectureId 변경 시 네비게이션 상태 초기화
    // 쿼리 파라미터로 초기 탭 지정 (예: ?tab=game)
    const tabParam = searchParams.get('tab')
    const validTabs: LectureStudyTab[] = ['summary', 'quiz', 'game']
    const initialTab: LectureStudyTab = tabParam && validTabs.includes(tabParam as LectureStudyTab)
      ? (tabParam as LectureStudyTab)
      : 'summary'
    // 페이지 진입 시 강의자료/챗봇 패널 닫힌 상태 + 탭 설정 + 사이드바 접기
    useLectureStudyStore.setState({ isLeftPanelOpen: false, isChatPanelOpen: false, rightTab: initialTab })
    useSidebarStore.setState({ isCollapsed: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lectureId])

  // totalRecordingChunks를 store에 반영 (SummaryTabContainer 출처 범위 검증용)
  useEffect(() => {
    const totalChunks = recordings.reduce((acc, rec) => acc + rec.chunk_summaries.length, 0)
    setTotalRecordingChunks(totalChunks)
  }, [recordings, setTotalRecordingChunks])

  // Local state
  const [leftWidth, setLeftWidth] = useState<number | null>(null)
  const [chatWidth, setChatWidth] = useState<number | null>(null)
  const [isResizingLeft, setIsResizingLeft] = useState(false)
  const [isResizingChat, setIsResizingChat] = useState(false)
  const [hasUserResizedLeft, setHasUserResizedLeft] = useState(false)
  const [hasUserResizedChat, setHasUserResizedChat] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const resolveLectureLabel = (): string => {
    if (lectureTitle) return lectureTitle
    if (currentLecture) {
      const wn = currentLecture.week_number
      const sn = currentLecture.session_number
      const title = currentLecture.title
      if (wn != null && sn != null) {
        return title
          ? t('lectureStudy.breadcrumb.weekSessionTitle', { week: wn, session: sn, title })
          : t('lectureStudy.breadcrumb.weekSession', { week: wn, session: sn })
      }
      if (currentLecture.lecture_number != null) {
        return title
          ? t('lectureStudy.breadcrumb.lectureNumberTitle', { number: currentLecture.lecture_number, title })
          : t('lectureStudy.breadcrumb.lectureNumber', { number: currentLecture.lecture_number })
      }
      if (title) return title
    }
    return t('lectureStudy.breadcrumb.lectureFallback')
  }

  // 사용 가능한 컨테이너 너비에서 고정 패널 크기를 빼고 남은 공간 계산 헬퍼
  const getContainerWidth = useCallback(() => {
    return containerRef.current?.getBoundingClientRect().width ?? 0
  }, [])

  // Left panel auto-size
  useLayoutEffect(() => {
    if (isMobile || !containerRef.current || !isLeftPanelOpen) return
    const element = containerRef.current
    const updateWidth = () => {
      if (hasUserResizedLeft) return
      const total = element.getBoundingClientRect().width
      if (!total) return
      // 양쪽 패널 모두 열림 → 균등 3분할, 한쪽만 열림 → 나머지의 절반
      const target = isChatPanelOpen
        ? Math.floor(total / 3)
        : Math.floor(total / 2)
      const chatOffset = isChatPanelOpen && chatWidth ? chatWidth : 0
      const available = total - chatOffset - MIN_CENTER_WIDTH
      setLeftWidth(Math.min(Math.max(target, MIN_LEFT_WIDTH), Math.max(available, MIN_LEFT_WIDTH)))
    }
    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(element)
    return () => observer.disconnect()
  }, [hasUserResizedLeft, isMobile, isLeftPanelOpen, isChatPanelOpen, chatWidth])

  // Chat panel auto-size
  useLayoutEffect(() => {
    if (isMobile || !containerRef.current || !isChatPanelOpen) return
    const element = containerRef.current
    const updateWidth = () => {
      if (hasUserResizedChat) return
      const total = element.getBoundingClientRect().width
      if (!total) return
      // 양쪽 패널 모두 열림 → 균등 3분할, 한쪽만 열림 → 1/3
      const target = Math.floor(total / 3)
      const leftOffset = isLeftPanelOpen && leftWidth ? leftWidth : 0
      const available = total - leftOffset - MIN_CENTER_WIDTH
      setChatWidth(Math.min(Math.max(target, MIN_CHAT_WIDTH), Math.max(available, MIN_CHAT_WIDTH)))
    }
    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(element)
    return () => observer.disconnect()
  }, [hasUserResizedChat, isMobile, isChatPanelOpen, isLeftPanelOpen, leftWidth])

  // Left resizer drag
  useEffect(() => {
    if (!isResizingLeft || isMobile) return
    const handleMouseMove = (e: MouseEvent) => {
      const total = getContainerWidth()
      if (!total) return
      const rect = containerRef.current!.getBoundingClientRect()
      const next = e.clientX - rect.left
      const chatOffset = isChatPanelOpen && chatWidth ? chatWidth : 0
      const max = total - chatOffset - MIN_CENTER_WIDTH
      setLeftWidth(Math.min(Math.max(next, MIN_LEFT_WIDTH), max))
    }
    const handleMouseUp = () => setIsResizingLeft(false)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizingLeft, isMobile, isChatPanelOpen, chatWidth, getContainerWidth])

  // Chat resizer drag (오른쪽에서 왼쪽으로 드래그)
  useEffect(() => {
    if (!isResizingChat || isMobile) return
    const handleMouseMove = (e: MouseEvent) => {
      const total = getContainerWidth()
      if (!total) return
      const rect = containerRef.current!.getBoundingClientRect()
      const next = rect.right - e.clientX
      const leftOffset = isLeftPanelOpen && leftWidth ? leftWidth : 0
      const max = total - leftOffset - MIN_CENTER_WIDTH
      setChatWidth(Math.min(Math.max(next, MIN_CHAT_WIDTH), max))
    }
    const handleMouseUp = () => setIsResizingChat(false)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizingChat, isMobile, isLeftPanelOpen, leftWidth, getContainerWidth])

  // Window resize clamp
  useEffect(() => {
    if (isMobile) return
    const handleResize = () => {
      const total = getContainerWidth()
      if (!total) return
      if (isLeftPanelOpen) {
        const chatOffset = isChatPanelOpen && chatWidth ? chatWidth : 0
        const maxLeft = total - chatOffset - MIN_CENTER_WIDTH
        setLeftWidth(prev => {
          if (prev == null) return Math.floor((total - chatOffset) / 2)
          return Math.min(Math.max(prev, MIN_LEFT_WIDTH), maxLeft)
        })
      }
      if (isChatPanelOpen) {
        const leftOffset = isLeftPanelOpen && leftWidth ? leftWidth : 0
        const maxChat = total - leftOffset - MIN_CENTER_WIDTH
        setChatWidth(prev => {
          if (prev == null) return Math.floor((total - leftOffset) / 3)
          return Math.min(Math.max(prev, MIN_CHAT_WIDTH), maxChat)
        })
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isMobile, isLeftPanelOpen, isChatPanelOpen, leftWidth, chatWidth, getContainerWidth])

  const handleLeftResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setHasUserResizedLeft(true)
    setIsResizingLeft(true)
  }, [])

  const handleChatResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setHasUserResizedChat(true)
    setIsResizingChat(true)
  }, [])

  // 패널 열릴 때 수동 리사이즈 플래그 리셋 → 균등 분할 재적용
  useEffect(() => {
    if (isLeftPanelOpen) setHasUserResizedLeft(false)
  }, [isLeftPanelOpen])

  useEffect(() => {
    if (isChatPanelOpen) setHasUserResizedChat(false)
  }, [isChatPanelOpen])

  // Analytics: 탭 전환 체류시간 추적
  const rightTabEnterTime = useRef(Date.now())
  const prevRightTab = useRef(rightTab)

  // 양쪽 패널 모두 닫혀있을 때만 중앙 배치
  const isCenterOnly = !isLeftPanelOpen && !isChatPanelOpen

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-sm text-gray-500">{t('lectureStudy.error.loadFailed')}</p>
        <button
          onClick={refresh}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800"
        >
          {t('home.retry')}
        </button>
      </div>
    )
  }

  const rightPanelContent = (
    <Tabs
      value={rightTab}
      onValueChange={v => {
        const now = Date.now()
        const durationMs = now - rightTabEnterTime.current
        lectureStudyAnalytics.tabSwitch(lectureId, {
          from_tab: prevRightTab.current,
          to_tab: v,
          duration_ms: durationMs,
        })
        prevRightTab.current = v as LectureStudyTab
        rightTabEnterTime.current = now
        setRightTab(v as LectureStudyTab)
        trackTabView({ tab: v, lecture_id: lectureId, course_id: courseId ?? '' })
      }}
      className="flex flex-1 min-h-0 flex-col"
    >
      <div className="shrink-0 border-b border-gray-200 dark:border-gray-700 px-3">
        <TabsList className="h-auto w-full gap-4 rounded-none bg-transparent p-0">
          {(['summary', 'quiz', 'game'] as const).map(tab => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="flex-1 min-w-0 truncate rounded-none bg-transparent px-1 py-2.5 text-xs font-medium text-gray-400 shadow-none transition-colors data-[state=active]:bg-transparent data-[state=active]:text-[#6366F1] data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#6366F1] hover:text-gray-600 dark:hover:text-gray-300"
            >
              {t(`lectureStudy.rightPanel.${tab}Tab`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      <TabsContent value="summary" className="flex-1 min-h-0 mt-0">
        <SummaryTabContainer lectureId={lectureId} courseId={courseId ?? ''} />
      </TabsContent>
      <TabsContent value="quiz" className="flex-1 min-h-0 mt-0">
        <QuizTabContainer
          lectureId={lectureId}
          courseId={courseId ?? ''}
          courseTitle={courseTitle ?? fetchedCourseTitle ?? undefined}
          weekNumber={currentLecture?.week_number}
          sessionNumber={currentLecture?.session_number}
        />
      </TabsContent>
      <TabsContent value="game" className="flex-1 min-h-0 mt-0">
        <GameTabContainer lectureId={lectureId} accessSource={searchParams.get('from') === 'game_menu' ? 'game_menu' : 'content'} />
      </TabsContent>
    </Tabs>
  )

  const resolvedCourseTitle = courseTitle ?? fetchedCourseTitle ?? '...'

  return (
    <div className="flex h-full flex-col">
      {/* Breadcrumb + Action buttons → Header topbar slot */}
      <StudyspaceTopbarSlot>
        <nav className="flex items-center gap-2 text-sm font-medium text-gray-400">
          <Link href="/studyspace/home" className="transition-colors hover:text-[#6366F1]">
            {t('lectureStudy.breadcrumbHome')}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          {courseId ? (
            <Link href={`/studyspace/course/${courseId}`} className="transition-colors hover:text-[#6366F1]">
              {resolvedCourseTitle}
            </Link>
          ) : (
            <span>{resolvedCourseTitle}</span>
          )}
          <ChevronRight className="h-3.5 w-3.5" />
          {courseId ? (
            <Link href={`/studyspace/course/${courseId}/lectures`} className="transition-colors hover:text-[#6366F1]">
              {t('courseNav.lectureStudy')}
            </Link>
          ) : (
            <span>{t('lectureStudy.tabLecture')}</span>
          )}
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="truncate font-semibold text-gray-900 dark:text-gray-50">
            {resolveLectureLabel()}
          </span>
        </nav>
      </StudyspaceTopbarSlot>

      {/* Mobile: removed old drawer toggle — center panel is now primary */}

      {/* Panels */}
      <div
        ref={containerRef}
        className="relative flex flex-1 min-h-0"
      >
        {/* 강의자료 아이콘 + 말풍선 (패널 닫힌 상태) — 모바일+데스크톱 공통 */}
        {!isLeftPanelOpen && (
          <div className="absolute bottom-4 left-4 z-10 flex items-end gap-2">
            <button
              onClick={() => {
                toggleLeftPanel()
                materialViewAnalytics.iconClick(lectureId)
              }}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#6366F1]/30 bg-white dark:bg-gray-800 shadow-md text-[#6366F1] hover:bg-[#6366F1]/5 dark:hover:bg-[#6366F1]/10 transition-colors"
              title={t('lectureStudy.leftPanel.materialsTab')}
            >
              <FileText className="h-6 w-6" />
            </button>
            <div className="relative mb-1 rounded-lg bg-[#6366F1] px-3 py-1.5 text-xs font-medium text-white shadow-md whitespace-nowrap">
              {t('lectureStudy.materialsBubble')}
              <div className="absolute left-[-6px] bottom-2 h-0 w-0 border-t-[6px] border-t-transparent border-r-[6px] border-r-[#6366F1] border-b-[6px] border-b-transparent" />
            </div>
          </div>
        )}

        {/* 챗봇 아이콘 + 말풍선 (패널 닫힌 상태) — 모바일+데스크톱 공통 */}
        {!isChatPanelOpen && (
          <div className="absolute bottom-4 right-4 z-10 flex items-end gap-2">
            <div className="relative mb-1 rounded-lg bg-[#6366F1] px-3 py-1.5 text-xs font-medium text-white shadow-md whitespace-nowrap">
              {t('lectureStudy.askAiBubble')}
              <div className="absolute right-[-6px] bottom-2 h-0 w-0 border-t-[6px] border-t-transparent border-l-[6px] border-l-[#6366F1] border-b-[6px] border-b-transparent" />
            </div>
            <button
              onClick={toggleChatPanel}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#6366F1]/30 bg-white dark:bg-gray-800 shadow-md text-[#6366F1] hover:bg-[#6366F1]/5 dark:hover:bg-[#6366F1]/10 transition-colors"
              title="AI Chat"
            >
              <Bot className="h-6 w-6" />
            </button>
          </div>
        )}

        {/* Mobile: 강의자료/녹음본 패널 (전체 폭 오버레이) */}
        {isMobile && isLeftPanelOpen && (
          <section className="absolute inset-0 z-20 flex flex-col bg-white dark:bg-gray-900">
            <Tabs
              value={leftTab}
              onValueChange={v => setLeftTab(v as LeftPanelTab)}
              className="flex h-full flex-col"
            >
              <div className="flex items-center shrink-0 border-b border-gray-200 dark:border-gray-700 px-3">
                <TabsList className="h-auto flex-1 gap-4 rounded-none bg-transparent p-0">
                  {(['materials', 'recordings'] as const).map(tab => (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      className="flex-1 rounded-none bg-transparent px-1 py-2.5 text-xs font-medium text-gray-400 shadow-none transition-colors data-[state=active]:bg-transparent data-[state=active]:text-[#6366F1] data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#6366F1] hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {t(`lectureStudy.leftPanel.${tab}Tab`)}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <button
                  onClick={toggleLeftPanel}
                  className="ml-2 mb-2 rounded-md p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <TabsContent value="materials" className="flex-1 min-h-0 mt-0">
                <LeftPanelMaterials />
              </TabsContent>
              <TabsContent value="recordings" className="flex-1 min-h-0 mt-0">
                <LeftPanelRecordings
                  recordings={recordings}
                  essence7Words={currentLecture?.essence_7words}
                  targetChunkIndex={targetChunkIndex}
                  onTargetConsumed={() => setTargetChunkIndex(null)}
                  lectureId={lectureId}
                />
              </TabsContent>
            </Tabs>
          </section>
        )}

        {/* Mobile: 채팅 패널 (전체 폭 오버레이) */}
        {isMobile && isChatPanelOpen && (
          <section className="absolute inset-0 z-20 flex flex-col bg-white dark:bg-gray-900">
            <div className="flex items-center justify-between shrink-0 border-b border-gray-100 dark:border-gray-700 px-3 py-2">
              <div className="flex items-center gap-1.5">
                <Bot className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">AI Chat</span>
              </div>
              <button
                onClick={toggleChatPanel}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <ContentsChatPanel lectureId={lectureId} quizChatContext={quizChatContext} onClearQuizContext={clearQuizChatContext} />
            </div>
          </section>
        )}

        {/* Desktop: 강의자료/녹음본 패널 (열린 상태) */}
        {!isMobile && isLeftPanelOpen && (
          <section
            className="flex h-full min-h-0 flex-col border-r border-gray-200 dark:border-gray-700"
            style={{ width: leftWidth ?? '33%' }}
          >
            <Tabs
              value={leftTab}
              onValueChange={v => setLeftTab(v as LeftPanelTab)}
              className="flex h-full flex-col"
            >
              <div className="flex items-center shrink-0 border-b border-gray-200 dark:border-gray-700 px-3">
                <TabsList className="h-auto flex-1 gap-4 rounded-none bg-transparent p-0">
                  {(['materials', 'recordings'] as const).map(tab => (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      className="flex-1 rounded-none bg-transparent px-1 py-2.5 text-xs font-medium text-gray-400 shadow-none transition-colors data-[state=active]:bg-transparent data-[state=active]:text-[#6366F1] data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#6366F1] hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {t(`lectureStudy.leftPanel.${tab}Tab`)}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <button
                  onClick={toggleLeftPanel}
                  className="ml-2 mb-2 rounded-md p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <TabsContent value="materials" className="flex-1 min-h-0 mt-0">
                <LeftPanelMaterials />
              </TabsContent>
              <TabsContent value="recordings" className="flex-1 min-h-0 mt-0">
                <LeftPanelRecordings
                  recordings={recordings}
                  essence7Words={currentLecture?.essence_7words}
                  targetChunkIndex={targetChunkIndex}
                  onTargetConsumed={() => setTargetChunkIndex(null)}
                  lectureId={lectureId}
                />
              </TabsContent>
            </Tabs>
          </section>
        )}

        {/* Desktop: 좌측 리사이저 */}
        {!isMobile && isLeftPanelOpen && (
          <div
            className="group relative flex w-1 cursor-col-resize items-center justify-center bg-gray-200 dark:bg-gray-700 hover:bg-blue-400 transition-colors"
            onMouseDown={handleLeftResizeStart}
          >
            <div className="h-8 w-1 rounded-full bg-gray-400 dark:bg-gray-500 group-hover:bg-white transition-colors" />
            {isResizingLeft && (
              <div className="fixed inset-0 z-50 cursor-col-resize" />
            )}
          </div>
        )}

        {/* 중앙 패널 (회차제목 + 버튼 + 요약/퀴즈/게임) — 항상 렌더링 (모바일 패널은 위에 오버레이) */}
        <section className={`flex h-full min-h-0 flex-1 flex-col ${isCenterOnly ? 'max-w-2xl mx-auto' : ''}`}>
          {/* 회차 제목 (항상 표시) */}
          <div className="shrink-0 px-4 pt-4 pb-1">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-50 truncate">
              {resolveLectureLabel()}
            </h2>
          </div>

          {rightPanelContent}
        </section>

        {/* Desktop: 우측 리사이저 */}
        {!isMobile && isChatPanelOpen && (
          <div
            className="group relative flex w-1 cursor-col-resize items-center justify-center bg-gray-200 dark:bg-gray-700 hover:bg-blue-400 transition-colors"
            onMouseDown={handleChatResizeStart}
          >
            <div className="h-8 w-1 rounded-full bg-gray-400 dark:bg-gray-500 group-hover:bg-white transition-colors" />
            {isResizingChat && (
              <div className="fixed inset-0 z-50 cursor-col-resize" />
            )}
          </div>
        )}

        {/* Desktop: 채팅 패널 (열린 상태) */}
        {!isMobile && isChatPanelOpen && (
          <section
            className="flex h-full min-h-0 flex-col border-l border-gray-200 dark:border-gray-700"
            style={{ width: chatWidth ?? '33%' }}
          >
            <div className="flex items-center justify-between shrink-0 border-b border-gray-100 dark:border-gray-700 px-3 py-2">
              <div className="flex items-center gap-1.5">
                <Bot className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">AI Chat</span>
              </div>
              <button
                onClick={toggleChatPanel}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <ContentsChatPanel lectureId={lectureId} quizChatContext={quizChatContext} onClearQuizContext={clearQuizChatContext} />
            </div>
          </section>
        )}
      </div>

      {/* Mobile drawer removed — center panel is now primary on mobile */}
    </div>
  )
}
