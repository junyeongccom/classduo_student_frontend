/**
 * @file DialogueLearningContainer.tsx
 * @description 대화형 학습 페이지 — 간소화 회차 사이드바 + AI 튜터 채팅 + 녹음본/강의자료 참조 패널
 * @module features/lecture-study/components/containers
 * @dependencies ai-tutor (ChatInterface, ChatSidebar, ReferencePanel, useAITutorStore, useAITutorSession)
 */

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { History, ChevronRight, ChevronUp, ChevronDown, Menu, X as XIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useAITutorStore } from '@/features/ai-tutor/store/useAITutorStore'
import { useAITutorSession } from '@/features/ai-tutor/hooks/useAITutorSession'
import { ChatInterface } from '@/features/ai-tutor/components/containers/ChatInterface'
import ChatSidebar from '@/features/ai-tutor/components/ui/ChatSidebar'
import { ReferencePanel } from '@/features/ai-tutor/components/ui/ReferencePanel'
import SocraticScorePanel from '@/features/ai-tutor/components/ui/SocraticScorePanel'
import { useSocraticStore } from '@/features/ai-tutor/store/useSocraticStore'
import { buildStageBlocks } from '@/features/ai-tutor/domain/socraticStages'
import { SocraticOnboardingModal } from '@/features/ai-tutor/components/ui/SocraticOnboardingModal'
import { useSocraticOnboarding } from '@/features/ai-tutor/hooks/useSocraticOnboarding'
import { useAuthStore } from '@/features/auth/store/authStore'
import { StudyspaceTopbarSlot } from '@/shared/components/layouts/studyspace'
import { useIsAppWebView } from '@/shared/lib/appBridge'
import { useSidebarStore } from '@/shared/store/useSidebarStore'
import { DialogueLectureSidebar } from '../ui/DialogueLectureSidebar'
import { useLectures } from '../../hooks/useLectures'

const SOCRATIC_PANEL_WIDTH = 380
// 모바일 바텀시트 높이 — 시트가 열려도 채팅 입력창이 가려지지 않게 채팅 영역 하단 패딩과 짝으로 사용
const MOBILE_SHEET_HEIGHT = '45dvh'
// 소크라 컴팩트 바(접힘 상태) 높이만큼의 채팅 하단 패딩
const SOCRATIC_COMPACT_BAR_PAD = '3rem'

interface DialogueLearningContainerProps {
  courseId: string
  lectureId: string
}

export function DialogueLearningContainer({ courseId, lectureId }: DialogueLearningContainerProps) {
  const tTopbar = useTranslations('aiTutorTopbar')
  const t = useTranslations()
  const { courseTitle } = useLectures(courseId)
  // 앱 WebView 모드 — 앱이 자체 헤더로 이 화면을 감싼다.
  // 채팅 카드의 라운드/보더/여백은 앱 안에서 "화면 속 카드"로 보여 좌우 회색 띠를 만들고,
  // 그만큼 툴바 폭을 깎아 세그먼트를 오른쪽 끝에 밀어붙인다 — 앱에서만 full-bleed 로 편다.
  const isAppMode = useIsAppWebView()

  // AI Tutor Store — read
  const {
    currentSessionId,
    selectedLectureIds,
    isChatSidebarOpen,
    isNotesPanelOpen,
    isMaterialsPanelOpen,
    notesPanelWidth,
    materialsPanelWidth,
    messages,
    allReferences,
    chatKey,
    isSessionLocked,
    isRecordingSourceDisabled,
    sourceFocus,
  } = useAITutorStore()

  // AI Tutor Store — actions
  const {
    setActiveTab,
    setIsChatSidebarOpen,
    setMessages,
    updateReferences,
    setSelectedLectureIds,
    setSelectedCourseId,
    setAutoSelectLatest,
    toggleNotesPanel,
    toggleMaterialsPanel,
    setNotesPanelWidth,
    setMaterialsPanelWidth,
  } = useAITutorStore((state) => ({
    setActiveTab: state.setActiveTab,
    setIsChatSidebarOpen: state.setIsChatSidebarOpen,
    setMessages: state.setMessages,
    updateReferences: state.updateReferences,
    setSelectedLectureIds: state.setSelectedLectureIds,
    setSelectedCourseId: state.setSelectedCourseId,
    setAutoSelectLatest: state.setAutoSelectLatest,
    toggleNotesPanel: state.toggleNotesPanel,
    toggleMaterialsPanel: state.toggleMaterialsPanel,
    setNotesPanelWidth: state.setNotesPanelWidth,
    setMaterialsPanelWidth: state.setMaterialsPanelWidth,
  }))

  const {
    handleSessionCreated,
    handleSelectSession,
    handleNewChat,
  } = useAITutorSession()

  const userId = useAuthStore(state => state.user?.user_id ?? null)
  const {
    socraticActiveTopic,
    socraticTotalScore,
    socraticLastPraise,
    socraticLastSuggestion,
    socraticAbuseWarning,
    socraticMastered,
    socraticLeaderboard,
    socraticCurrentStage,
    socraticStageTotal,
    socraticStageOutline,
    socraticPhase,
    socraticScaffoldDepth,
    socraticMaxScaffoldDepth,
    socraticAhaCount,
    socraticCheckpointResults,
    isSocraticPanelOpen: isSocraticPanelOpenFlag,
  } = useSocraticStore(state => ({
    socraticActiveTopic: state.activeTopic,
    socraticTotalScore: state.totalScore,
    socraticLastPraise: state.lastPraise,
    socraticLastSuggestion: state.lastSuggestion,
    socraticAbuseWarning: state.abuseWarning,
    socraticMastered: state.mastered,
    socraticLeaderboard: state.leaderboard,
    socraticCurrentStage: state.currentStage,
    socraticStageTotal: state.stageTotal,
    socraticStageOutline: state.stageOutline,
    socraticPhase: state.phase,
    socraticScaffoldDepth: state.scaffoldDepth,
    socraticMaxScaffoldDepth: state.maxScaffoldDepth,
    socraticAhaCount: state.ahaCount,
    socraticCheckpointResults: state.checkpointResults,
    isSocraticPanelOpen: state.isPanelOpen,
  }))
  const isSocraticPanelOpen = isSocraticPanelOpenFlag && !!socraticActiveTopic

  // 소크라 문답 첫 진입 온보딩 모달 — 주제 선택으로 세션이 시작되는 순간 표시
  const socraticOnboarding = useSocraticOnboarding()

  // 대화형학습 진입 시 좌측 사이드바 자동 접기, 이탈 시 복원
  const setCollapsed = useSidebarStore((s) => s.setCollapsed)
  useEffect(() => {
    const prev = useSidebarStore.getState().isCollapsed
    if (!prev) setCollapsed(true)
    return () => {
      if (!prev) setCollapsed(false)
    }
  }, [setCollapsed])

  // 대화형 학습을 벗어날 때 상태 정리 — 두 store 모두 모듈 전역이라
  // 라우트 이동만으로는 비워지지 않는다. 정리하지 않으면 사이드바로 다시 들어왔을 때
  // 빈 새 채팅 화면에 이전 세션의 소크라 점수 패널 / 우측 출처 패널이 남는다.
  // (진입 시 handleNewChat 도 같은 초기화를 하지만 initializedRef 가드에 걸려
  //  재진입 경로에서 실행되지 않는 경우가 있어, 이탈 시점에 확실히 비운다.)
  useEffect(() => {
    return () => {
      useSocraticStore.getState().reset()
      useAITutorStore.getState().resetChat()
    }
  }, [])

  // 대화형 학습 진입 시 새 채팅으로 초기화 + URL 파라미터로 선택 설정
  const initializedRef = useRef(false)
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    // 이전 세션 초기화 (항상 새 채팅으로 시작)
    handleNewChat()
    // URL 파라미터로 선택 설정 (handleNewChat 이후 덮어씀)
    setSelectedCourseId(courseId)
    setSelectedLectureIds([lectureId])
    setAutoSelectLatest(false)
  }, [courseId, lectureId, setSelectedCourseId, setSelectedLectureIds, setAutoSelectLatest, handleNewChat])

  const handleLectureIdsLoaded = useCallback(
    (ids: string[]) => {
      setSelectedLectureIds(ids)
    },
    [setSelectedLectureIds],
  )

  const handleMessagesUpdate = useCallback(
    (newMessages: any[]) => {
      setMessages(newMessages)
    },
    [setMessages],
  )

  const handleReferencesUpdate = useCallback(
    (messageIndex: number, references: any[]) => {
      updateReferences(messageIndex, references)
    },
    [updateReferences],
  )

  const handleNewChatAndResetPanels = useCallback(() => {
    if (isNotesPanelOpen) toggleNotesPanel(false)
    if (isMaterialsPanelOpen) toggleMaterialsPanel(false)
    setActiveTab('answer')
    handleNewChat()
  }, [isNotesPanelOpen, isMaterialsPanelOpen, toggleNotesPanel, toggleMaterialsPanel, setActiveTab, handleNewChat])

  const handleCloseNotesPanel = () => {
    if (isNotesPanelOpen) {
      toggleNotesPanel(false)
      if (isMaterialsPanelOpen) setActiveTab('materials')
      else setActiveTab('answer')
    }
  }

  const handleCloseMaterialsPanel = () => {
    if (isMaterialsPanelOpen) {
      toggleMaterialsPanel(false)
      if (isNotesPanelOpen) setActiveTab('notes')
      else setActiveTab('answer')
    }
  }

  // Reference count
  const { recordingCount, materialCount } = useMemo(() => {
    let recording = 0
    let material = 0
    allReferences.forEach((refs) => {
      refs.forEach((ref) => {
        const hasCitations = Array.isArray(ref.citations) && ref.citations.length > 0
        if (!hasCitations) return
        if (ref.type === 'recording') recording += 1
        else if (ref.type === 'material') material += 1
      })
    })
    return { recordingCount: recording, materialCount: material }
  }, [allReferences])

  // Panel resizing
  const [isResizingNotes, setIsResizingNotes] = useState(false)
  const [isResizingMaterials, setIsResizingMaterials] = useState(false)
  const [isLectureSidebarOpen, setIsLectureSidebarOpen] = useState(false)
  // 데스크탑(md 이상) 여부 — notes/materials 패널 layout 분기 (모바일은 하단 55dvh sheet)
  const [isDesktopViewport, setIsDesktopViewport] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)')
    const update = () => setIsDesktopViewport(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])
  // 모바일 소크라 점수 시트 — 기본은 접힌 컴팩트 바, 탭하면 45dvh 시트로 확장
  const [isSocraticSheetExpanded, setIsSocraticSheetExpanded] = useState(false)
  // 컴팩트 바에 표시할 진행 중 유형 ("용어암기 1/2") — SocraticScorePanel 의 블록 규칙과 동일
  const socraticBlocks = useMemo(
    () => buildStageBlocks(socraticStageOutline ?? [], socraticStageTotal),
    [socraticStageOutline, socraticStageTotal],
  )
  const socraticActiveBlock =
    socraticBlocks.find(
      (b) => socraticCurrentStage >= b.start && socraticCurrentStage <= b.start + b.count - 1,
    ) ?? null
  const socraticActiveBlockPassed = socraticActiveBlock
    ? Math.min(Math.max(socraticCurrentStage - socraticActiveBlock.start, 0), socraticActiveBlock.count)
    : 0

  // 녹음본·강의자료 출처 패널 동시 표시는 넓은 데스크톱(>=1367)에서만 허용. 태블릿(가로 포함) 이하는 둘 중 하나만.
  const [allowBothPanels, setAllowBothPanels] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1367px)')
    const update = () => setAllowBothPanels(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])
  const chatAreaRef = useRef<HTMLDivElement>(null)

  const MIN_CHAT_WIDTH = 280
  const MIN_PANEL_WIDTH = 300

  useEffect(() => {
    if (!isResizingNotes) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!chatAreaRef.current) return
      const containerRect = chatAreaRef.current.getBoundingClientRect()
      const materialsOffset = isMaterialsPanelOpen ? materialsPanelWidth : 0
      const desiredNotesWidth = containerRect.right - e.clientX - materialsOffset
      const maxNotesWidth = containerRect.width - MIN_CHAT_WIDTH - materialsOffset
      const targetNotesWidth = Math.max(MIN_PANEL_WIDTH, Math.min(desiredNotesWidth, maxNotesWidth))
      setNotesPanelWidth(targetNotesWidth)
    }

    const handleMouseUp = () => setIsResizingNotes(false)

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizingNotes, isMaterialsPanelOpen, materialsPanelWidth, setNotesPanelWidth])

  useEffect(() => {
    if (!isResizingMaterials) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!chatAreaRef.current) return
      const containerRect = chatAreaRef.current.getBoundingClientRect()
      const desiredMaterialsWidth = containerRect.right - e.clientX
      const notesOffset = isNotesPanelOpen ? notesPanelWidth : 0
      const maxMaterialsWidth = containerRect.width - MIN_CHAT_WIDTH - notesOffset
      const targetMaterialsWidth = Math.max(MIN_PANEL_WIDTH, Math.min(desiredMaterialsWidth, maxMaterialsWidth))
      setMaterialsPanelWidth(targetMaterialsWidth)
    }

    const handleMouseUp = () => setIsResizingMaterials(false)

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizingMaterials, isNotesPanelOpen, notesPanelWidth, setMaterialsPanelWidth])

  // 두 패널 동시 오픈 시 paddingRight 합산
  const rightPanelsWidth =
    (isNotesPanelOpen ? notesPanelWidth : 0) + (isMaterialsPanelOpen ? materialsPanelWidth : 0) +
    (isSocraticPanelOpen ? SOCRATIC_PANEL_WIDTH : 0)

  // 두 패널 모두 열리면 사이드바 숨김
  const hideSidebar = isNotesPanelOpen && isMaterialsPanelOpen

  // 모바일 바텀시트가 열릴 때 채팅 카드(입력창 포함)를 시트 위로 밀어 올리는 하단 패딩.
  // 출처 시트/소크라 확장 시트 = 시트 높이만큼, 소크라 컴팩트 바 = 바 높이만큼.
  const mobilePadBottom = !isDesktopViewport
    ? isNotesPanelOpen || isMaterialsPanelOpen
      ? MOBILE_SHEET_HEIGHT
      : isSocraticPanelOpen
        ? isSocraticSheetExpanded
          ? MOBILE_SHEET_HEIGHT
          : SOCRATIC_COMPACT_BAR_PAD
        : undefined
    : undefined

  return (
    <>
      {/* Breadcrumb → Header topbar slot */}
      <StudyspaceTopbarSlot>
        <nav className="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap text-sm font-medium text-gray-400 md:gap-2">
          <Link href="/studyspace/home" className="shrink-0 transition-colors hover:text-[#6366F1]">
            {t('lectureStudy.breadcrumbHome')}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <Link
            href={`/studyspace/course/${courseId}`}
            className="min-w-0 truncate transition-colors hover:text-[#6366F1]"
          >
            {courseTitle ?? '...'}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <span className="shrink-0 font-semibold text-gray-900 dark:text-gray-50">
            {t('lectureStudy.dialogueLearning')}
          </span>
        </nav>
      </StudyspaceTopbarSlot>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* 회차 선택 사이드바 — 데스크탑 inline */}
        <aside className={`hidden h-full w-[320px] shrink-0 flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 ${hideSidebar ? '' : 'xl:flex'}`}>
          <DialogueLectureSidebar
            courseId={courseId}
            selectedLectureIds={selectedLectureIds}
            onSelectLectureIds={setSelectedLectureIds}
            isLocked={messages.length > 0}
          />
        </aside>

        {/* 모바일 회차 사이드바 drawer (xl 미만) */}
        {isLectureSidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/40 xl:hidden"
              onClick={() => setIsLectureSidebarOpen(false)}
              aria-hidden
            />
            <aside className="fixed inset-y-0 left-0 z-50 flex h-full w-[280px] max-w-[85vw] flex-col border-r border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 xl:hidden">
              <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2 dark:border-gray-700">
                <span className="text-sm font-bold text-gray-900 dark:text-gray-50">{t('aiTutorSidebar.lectureSelectTitle')}</span>
                <button
                  onClick={() => setIsLectureSidebarOpen(false)}
                  className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="close"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 min-h-0">
                <DialogueLectureSidebar
                  courseId={courseId}
                  selectedLectureIds={selectedLectureIds}
                  onSelectLectureIds={setSelectedLectureIds}
                  isLocked={messages.length > 0}
                />
              </div>
            </aside>
          </>
        )}

        {/* 채팅 영역 — 콘텐츠 안에 맞게 100% 채움 */}
        <div ref={chatAreaRef} className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <div
            className={`flex flex-1 min-h-0 flex-col ${isAppMode ? 'p-0' : 'px-2 py-1.5 md:px-4'}`}
            style={{
              paddingRight: isDesktopViewport && rightPanelsWidth > 0 ? rightPanelsWidth + 16 : undefined,
              paddingBottom: mobilePadBottom,
            }}
          >
            <div
              className={`flex flex-1 min-h-0 flex-col bg-white dark:bg-gray-900 overflow-hidden ${
                isAppMode
                  ? 'border-0'
                  : 'rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm'
              }`}
            >
              {/* Chat Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-700 px-3 py-2 shrink-0 md:gap-4 md:px-5 md:py-2.5">
                <div className="flex items-center gap-1.5 md:gap-2">
                  {/* 모바일/태블릿 회차 사이드바 토글 + 안내 말풍선 */}
                  <div className="relative inline-flex items-center xl:hidden">
                    <button
                      onClick={() => setIsLectureSidebarOpen(true)}
                      className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                      aria-label="open lecture sidebar"
                      title={t('aiTutorSidebar.selectClassTooltip')}
                    >
                      <Menu className="h-4 w-4 md:h-5 md:w-5" />
                    </button>
                    {/* 앵커를 버튼 좌측 기준으로 — 중앙 정렬(-translate-x-1/2)은 좁은 화면(앱 모드 pl 제거)에서
                        툴팁이 화면 왼쪽 밖으로 잘린다. 화살표만 버튼 중앙 근처(left-2.5)에 둔다.
                        mt-2 는 툴바 py-2 와 같아 말풍선이 툴바 구분선 위에 정확히 걸쳤다 — 선 아래로 내린다. */}
                    <span className="pointer-events-none absolute left-0 top-full z-20 mt-4 animate-pulse whitespace-nowrap rounded-full bg-[#6366F1] px-2.5 py-1 text-[11px] font-semibold text-white shadow-md">
                      <span className="absolute bottom-full left-2.5 border-[5px] border-transparent border-b-[#6366F1]" />
                      {t('aiTutorSidebar.selectClassTooltip')}
                    </span>
                  </div>
                  <button
                    onClick={handleNewChatAndResetPanels}
                    className="rounded-lg border border-gray-200 dark:border-gray-600 px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 transition-colors hover:border-gray-300 hover:text-gray-700 md:px-3 md:py-1.5 md:text-sm"
                  >
                    {tTopbar('newChat')}
                  </button>
                  <button
                    onClick={() => setIsChatSidebarOpen(true)}
                    className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 md:p-2"
                    title={tTopbar('chatHistory')}
                  >
                    <History className="h-4 w-4 md:h-5 md:w-5" />
                  </button>
                </div>

                {/* 세그먼트는 줄이지 않는다(shrink-0) — 좁은 폭에서 눌리면 오른쪽 둥근 캡이 잘려
                    "직선으로 끊긴 바"처럼 보였다. 자리가 모자라면 toolbar 의 flex-wrap 으로 다음 줄에 통째로 내려간다. */}
                <div className="flex shrink-0 rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
                  <button
                    onClick={() => {
                      setActiveTab('answer')
                      if (isNotesPanelOpen) toggleNotesPanel(false)
                      if (isMaterialsPanelOpen) toggleMaterialsPanel(false)
                    }}
                    className={`px-2 py-1 text-xs font-medium rounded-md transition-all md:px-3 md:py-1.5 md:text-sm ${
                      !isNotesPanelOpen && !isMaterialsPanelOpen
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    {tTopbar('tab.answer')}
                  </button>
                  <button
                    onClick={() => {
                      if (isSocraticPanelOpen) return
                      const nextState = !isNotesPanelOpen
                      toggleNotesPanel(nextState)
                      // 태블릿(가로 포함) 이하에선 둘 중 하나만 — notes 열 때 materials 자동 닫기
                      if (nextState && !allowBothPanels && isMaterialsPanelOpen) toggleMaterialsPanel(false)
                      if (nextState) setActiveTab('notes')
                      else if (isMaterialsPanelOpen) setActiveTab('materials')
                      else setActiveTab('answer')
                    }}
                    disabled={isSocraticPanelOpen}
                    className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-all md:gap-1.5 md:px-3 md:py-1.5 md:text-sm ${
                      isNotesPanelOpen
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    } ${isSocraticPanelOpen ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span>{tTopbar('tab.notesSources')}</span>
                    {recordingCount > 0 && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 text-[10px]">
                        {recordingCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      if (isSocraticPanelOpen) return
                      const nextState = !isMaterialsPanelOpen
                      toggleMaterialsPanel(nextState)
                      // 태블릿(가로 포함) 이하에선 둘 중 하나만 — materials 열 때 notes 자동 닫기
                      if (nextState && !allowBothPanels && isNotesPanelOpen) toggleNotesPanel(false)
                      if (nextState) setActiveTab('materials')
                      else if (isNotesPanelOpen) setActiveTab('notes')
                      else setActiveTab('answer')
                    }}
                    disabled={isSocraticPanelOpen}
                    className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-all md:gap-1.5 md:px-3 md:py-1.5 md:text-sm ${
                      isMaterialsPanelOpen
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    } ${isSocraticPanelOpen ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span>{tTopbar('tab.materialsSources')}</span>
                    {materialCount > 0 && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 text-[10px]">
                        {materialCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Chat Interface — flex-1로 남은 공간 채움 */}
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-2">
                <ChatInterface
                  key={chatKey}
                  selectedLectureIds={selectedLectureIds}
                  sessionId={currentSessionId}
                  onSessionCreated={handleSessionCreated}
                  onReferencesUpdate={handleReferencesUpdate}
                  onLectureIdsLoaded={handleLectureIdsLoaded}
                  onMessagesUpdate={handleMessagesUpdate}
                  onSocraticFinish={handleNewChatAndResetPanels}
                  onShowReferencePanel={(type) => {
                    if (type === 'notes') {
                      if (!isNotesPanelOpen) toggleNotesPanel(true)
                      // 태블릿 이하: 한 패널만 — notes 열면 materials 닫기
                      if (!allowBothPanels && isMaterialsPanelOpen) toggleMaterialsPanel(false)
                      setActiveTab('notes')
                    } else {
                      if (!isMaterialsPanelOpen) toggleMaterialsPanel(true)
                      if (!allowBothPanels && isNotesPanelOpen) toggleNotesPanel(false)
                      setActiveTab('materials')
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* 녹음본 출처 패널 — 데스크탑 inline 사이드 / 모바일 하단 45dvh 바텀시트 (바깥 탭으로 닫힘) */}
          {isNotesPanelOpen && !isDesktopViewport && (
            <div
              className="fixed inset-0 z-[60] bg-black/10"
              onClick={handleCloseNotesPanel}
              aria-hidden
            />
          )}
          {isNotesPanelOpen && (
            <div
              className={
                isDesktopViewport
                  ? 'absolute inset-y-0 z-20 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl'
                  : 'fixed inset-x-0 bottom-0 z-[70] flex flex-col overflow-hidden rounded-t-2xl border-t border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900'
              }
              style={
                isDesktopViewport
                  ? { width: notesPanelWidth, right: isMaterialsPanelOpen ? materialsPanelWidth : 0 }
                  : { height: MOBILE_SHEET_HEIGHT }
              }
            >
              {!isDesktopViewport && (
                <div className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-gray-300 dark:bg-gray-600" aria-hidden />
              )}
              <div
                onMouseDown={(e) => {
                  e.preventDefault()
                  setIsResizingNotes(true)
                }}
                className={`hidden md:block absolute left-0 top-0 z-50 h-full w-1 -translate-x-1/2 cursor-col-resize hover:bg-gray-900/50 ${
                  isResizingNotes ? 'bg-gray-900' : 'bg-transparent'
                }`}
              />
              <ReferencePanel
                variant="notes"
                allReferences={allReferences}
                onClose={handleCloseNotesPanel}
                messages={messages}
                isRecordingSourceDisabled={isRecordingSourceDisabled}
                focusTarget={sourceFocus}
                className={isDesktopViewport ? undefined : 'min-h-0 flex-1'}
              />
            </div>
          )}

          {/* 강의자료 출처 패널 — 데스크탑 inline 사이드 / 모바일 하단 45dvh 바텀시트 (바깥 탭으로 닫힘) */}
          {isMaterialsPanelOpen && !isDesktopViewport && (
            <div
              className="fixed inset-0 z-[60] bg-black/10"
              onClick={handleCloseMaterialsPanel}
              aria-hidden
            />
          )}
          {isMaterialsPanelOpen && (
            <div
              className={
                isDesktopViewport
                  ? 'absolute inset-y-0 right-0 z-20 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl'
                  : 'fixed inset-x-0 bottom-0 z-[70] flex flex-col overflow-hidden rounded-t-2xl border-t border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900'
              }
              style={isDesktopViewport ? { width: materialsPanelWidth } : { height: MOBILE_SHEET_HEIGHT }}
            >
              {!isDesktopViewport && (
                <div className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-gray-300 dark:bg-gray-600" aria-hidden />
              )}
              <div
                onMouseDown={(e) => {
                  e.preventDefault()
                  setIsResizingMaterials(true)
                }}
                className={`hidden md:block absolute left-0 top-0 z-50 h-full w-1 -translate-x-1/2 cursor-col-resize hover:bg-gray-900/50 ${
                  isResizingMaterials ? 'bg-gray-900' : 'bg-transparent'
                }`}
              />
              <ReferencePanel
                variant="materials"
                allReferences={allReferences}
                onClose={handleCloseMaterialsPanel}
                messages={messages}
                isRecordingSourceDisabled={isRecordingSourceDisabled}
                focusTarget={sourceFocus}
                className={isDesktopViewport ? undefined : 'min-h-0 flex-1'}
              />
            </div>
          )}

          {/* 소크라 점수 패널 — 데스크탑: 우측 고정 패널(기존 동일) / 모바일: 기본 접힌 컴팩트 바 → 탭 시 45dvh 시트 */}
          {isSocraticPanelOpen && socraticActiveTopic && (
            isDesktopViewport ? (
              <div
                className="absolute inset-y-0 right-0 z-20 h-full w-[var(--ai-w,380px)] border-l border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900"
                style={{ '--ai-w': `${SOCRATIC_PANEL_WIDTH}px` } as React.CSSProperties}
              >
                <SocraticScorePanel
                  topic={socraticActiveTopic}
                  totalScore={socraticTotalScore}
                  praise={socraticLastPraise}
                  suggestion={socraticLastSuggestion}
                  abuseWarning={socraticAbuseWarning}
                  mastered={socraticMastered}
                  leaderboard={socraticLeaderboard}
                  myStudentId={userId}
                  currentStage={socraticCurrentStage}
                  stageTotal={socraticStageTotal}
                  stageOutline={socraticStageOutline}
                  phase={socraticPhase}
                  scaffoldDepth={socraticScaffoldDepth}
                  maxScaffoldDepth={socraticMaxScaffoldDepth}
                  ahaCount={socraticAhaCount}
                  checkpointResults={socraticCheckpointResults}
                />
              </div>
            ) : (
              <div
                className="fixed inset-x-0 bottom-0 z-30 flex w-full flex-col rounded-t-2xl border-t border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
                style={isSocraticSheetExpanded ? { height: MOBILE_SHEET_HEIGHT } : undefined}
              >
                {/* 핸들 + 컴팩트 요약 한 줄 — 탭하면 확장/재접힘 (확장 시에도 채팅 입력창은 시트 위에 노출) */}
                <button
                  type="button"
                  onClick={() => setIsSocraticSheetExpanded((v) => !v)}
                  aria-expanded={isSocraticSheetExpanded}
                  aria-label={t(
                    isSocraticSheetExpanded
                      ? 'aiTutorChat.socraticPanelCollapseAria'
                      : 'aiTutorChat.socraticPanelExpandAria',
                  )}
                  className="flex w-full shrink-0 flex-col items-center gap-1 px-4 pb-2 pt-2"
                >
                  <span className="h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-600" aria-hidden />
                  <span className="flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200">
                    <span>{t('aiTutorChat.socraticCompactScore', { score: socraticTotalScore })}</span>
                    {socraticActiveBlock && (
                      <span className="font-medium text-gray-400 dark:text-gray-500">
                        · {t(`aiTutorChat.socraticStage.${socraticActiveBlock.key}`)}{' '}
                        {socraticActiveBlockPassed}/{socraticActiveBlock.count}
                      </span>
                    )}
                    {isSocraticSheetExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                    ) : (
                      <ChevronUp className="h-3.5 w-3.5 text-gray-400" />
                    )}
                  </span>
                </button>
                {isSocraticSheetExpanded && (
                  <div className="min-h-0 flex-1">
                    <SocraticScorePanel
                      topic={socraticActiveTopic}
                      totalScore={socraticTotalScore}
                      praise={socraticLastPraise}
                      suggestion={socraticLastSuggestion}
                      abuseWarning={socraticAbuseWarning}
                      mastered={socraticMastered}
                      leaderboard={socraticLeaderboard}
                      myStudentId={userId}
                      currentStage={socraticCurrentStage}
                      stageTotal={socraticStageTotal}
                      stageOutline={socraticStageOutline}
                      phase={socraticPhase}
                      scaffoldDepth={socraticScaffoldDepth}
                      maxScaffoldDepth={socraticMaxScaffoldDepth}
                      ahaCount={socraticAhaCount}
                      checkpointResults={socraticCheckpointResults}
                    />
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>

      {/* Chat History Sidebar */}
      <ChatSidebar
        isOpen={isChatSidebarOpen}
        onClose={() => setIsChatSidebarOpen(false)}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChatAndResetPanels}
        currentSessionId={currentSessionId}
      />

      {/* 소크라 문답 첫 진입 온보딩 — 세션 시작을 막지 않고, 닫으면 바로 첫 질문이 보인다 */}
      <SocraticOnboardingModal
        isOpen={socraticOnboarding.isOpen}
        onClose={socraticOnboarding.close}
      />
    </>
  )
}
