/**
 * @file DialogueLearningContainer.tsx
 * @description 대화형 학습 페이지 — 간소화 회차 사이드바 + AI 튜터 채팅 + 녹음본/강의자료 참조 패널
 * @module features/lecture-study/components/containers
 * @dependencies ai-tutor (ChatInterface, ChatSidebar, ReferencePanel, useAITutorStore, useAITutorSession)
 */

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { History, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useAITutorStore } from '@/features/ai-tutor/store/useAITutorStore'
import { useAITutorSession } from '@/features/ai-tutor/hooks/useAITutorSession'
import { ChatInterface } from '@/features/ai-tutor/components/containers/ChatInterface'
import ChatSidebar from '@/features/ai-tutor/components/ui/ChatSidebar'
import { ReferencePanel } from '@/features/ai-tutor/components/ui/ReferencePanel'
import { StudyspaceTopbarSlot } from '@/shared/components/layouts/studyspace'
import { useSidebarStore } from '@/shared/store/useSidebarStore'
import { DialogueLectureSidebar } from '../ui/DialogueLectureSidebar'
import { useLectures } from '../../hooks/useLectures'

interface DialogueLearningContainerProps {
  courseId: string
  lectureId: string
}

export function DialogueLearningContainer({ courseId, lectureId }: DialogueLearningContainerProps) {
  const tTopbar = useTranslations('aiTutorTopbar')
  const t = useTranslations()
  const { courseTitle } = useLectures(courseId)

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

  // 대화형학습 진입 시 좌측 사이드바 자동 접기, 이탈 시 복원
  const setCollapsed = useSidebarStore((s) => s.setCollapsed)
  useEffect(() => {
    const prev = useSidebarStore.getState().isCollapsed
    if (!prev) setCollapsed(true)
    return () => {
      if (!prev) setCollapsed(false)
    }
  }, [setCollapsed])

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
    (isNotesPanelOpen ? notesPanelWidth : 0) + (isMaterialsPanelOpen ? materialsPanelWidth : 0)

  // 두 패널 모두 열리면 사이드바 숨김
  const hideSidebar = isNotesPanelOpen && isMaterialsPanelOpen

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

      <div className="flex h-full min-h-0 overflow-hidden">
        {/* 회차 선택 사이드바 — 수업 고정, 게임/보상 없음 */}
        <aside className={`hidden h-full w-[320px] shrink-0 flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 ${hideSidebar ? '' : 'xl:flex'}`}>
          <DialogueLectureSidebar
            courseId={courseId}
            selectedLectureIds={selectedLectureIds}
            onSelectLectureIds={setSelectedLectureIds}
            isLocked={messages.length > 0}
          />
        </aside>

        {/* 채팅 영역 — 콘텐츠 안에 맞게 100% 채움 */}
        <div ref={chatAreaRef} className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <div
            className="flex flex-1 min-h-0 flex-col px-2 py-1.5 md:px-4"
            style={{ paddingRight: rightPanelsWidth > 0 ? rightPanelsWidth + 16 : undefined }}
          >
            <div className="flex flex-1 min-h-0 flex-col rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
              {/* Chat Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-700 px-3 py-2 shrink-0 md:gap-4 md:px-5 md:py-2.5">
                <div className="flex items-center gap-1.5 md:gap-2">
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

                <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
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
                      const nextState = !isNotesPanelOpen
                      toggleNotesPanel(nextState)
                      if (nextState) setActiveTab('notes')
                      else if (isMaterialsPanelOpen) setActiveTab('materials')
                      else setActiveTab('answer')
                    }}
                    className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-all md:gap-1.5 md:px-3 md:py-1.5 md:text-sm ${
                      isNotesPanelOpen
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
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
                      const nextState = !isMaterialsPanelOpen
                      toggleMaterialsPanel(nextState)
                      if (nextState) setActiveTab('materials')
                      else if (isNotesPanelOpen) setActiveTab('notes')
                      else setActiveTab('answer')
                    }}
                    className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-all md:gap-1.5 md:px-3 md:py-1.5 md:text-sm ${
                      isMaterialsPanelOpen
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
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
              <div className="flex-1 min-h-0 overflow-hidden pb-2">
                <ChatInterface
                  key={chatKey}
                  selectedLectureIds={selectedLectureIds}
                  sessionId={currentSessionId}
                  onSessionCreated={handleSessionCreated}
                  onReferencesUpdate={handleReferencesUpdate}
                  onLectureIdsLoaded={handleLectureIdsLoaded}
                  onMessagesUpdate={handleMessagesUpdate}
                  onShowReferencePanel={(type) => {
                    if (type === 'notes') {
                      if (!isNotesPanelOpen) toggleNotesPanel(true)
                      setActiveTab('notes')
                    } else {
                      if (!isMaterialsPanelOpen) toggleMaterialsPanel(true)
                      setActiveTab('materials')
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* 녹음본 출처 패널 (인라인, 리사이즈 가능) */}
          {isNotesPanelOpen && (
            <div
              className="absolute inset-y-0 z-20 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl"
              style={{
                width: notesPanelWidth,
                right: isMaterialsPanelOpen ? materialsPanelWidth : 0,
              }}
            >
              <div
                onMouseDown={(e) => {
                  e.preventDefault()
                  setIsResizingNotes(true)
                }}
                className={`absolute left-0 top-0 z-50 h-full w-1 -translate-x-1/2 cursor-col-resize hover:bg-gray-900/50 ${
                  isResizingNotes ? 'bg-gray-900' : 'bg-transparent'
                }`}
              />
              <ReferencePanel
                variant="notes"
                allReferences={allReferences}
                onClose={handleCloseNotesPanel}
                messages={messages}
                isRecordingSourceDisabled={isRecordingSourceDisabled}
              />
            </div>
          )}

          {/* 강의자료 출처 패널 (인라인, 리사이즈 가능) */}
          {isMaterialsPanelOpen && (
            <div
              className="absolute inset-y-0 right-0 z-20 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl"
              style={{ width: materialsPanelWidth }}
            >
              <div
                onMouseDown={(e) => {
                  e.preventDefault()
                  setIsResizingMaterials(true)
                }}
                className={`absolute left-0 top-0 z-50 h-full w-1 -translate-x-1/2 cursor-col-resize hover:bg-gray-900/50 ${
                  isResizingMaterials ? 'bg-gray-900' : 'bg-transparent'
                }`}
              />
              <ReferencePanel
                variant="materials"
                allReferences={allReferences}
                onClose={handleCloseMaterialsPanel}
                messages={messages}
                isRecordingSourceDisabled={isRecordingSourceDisabled}
              />
            </div>
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
    </>
  )
}
