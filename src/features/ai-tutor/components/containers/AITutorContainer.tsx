'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { History } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAITutorStore } from '../../store/useAITutorStore'
import { useAITutorSession } from '../../hooks/useAITutorSession'
import { useGameController } from '../../hooks/useGameController'
import { ChatInterface } from './ChatInterface'
import { LectureSidebarContainer } from './LectureSidebarContainer'
import ChatSidebar from '../ui/ChatSidebar'
import { ReferencePanel } from '../ui/ReferencePanel'
import { GameOverlay } from '../ui/GameOverlay'
import { TabType } from '@/shared/components/common'
import { useAuthStore } from '@/features/auth/store/authStore'
import {
  hasVisitedStudyspaceTab,
  markVisitedStudyspaceTab,
} from '@/shared/lib/studyspaceSelection'
import {
  AI_TUTOR_NEW_CHAT_EVENT,
  AI_TUTOR_NEW_CHAT_FLAG,
  AI_TUTOR_NEW_CHAT_PARAM,
} from '@/shared/constants/aiTutor'
import { dialogueSourceAnalytics, trackPageEnter, trackPageLeave } from '@/shared/lib/analytics'
import { areLectureIdsEqual } from '@/shared/lib/studyspaceSelection'
import { useStudyspaceSelectionSync } from '@/shared/hooks/useStudyspaceSelectionSync'
import { useStudyspaceSelectionStore } from '@/shared/store/useStudyspaceSelectionStore'
import {
  StudyspaceRightbarSlot,
  StudyspaceOverlaySlot,
} from '@/shared/components/layouts/studyspace'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

const DEFAULT_NOTES_PANEL_WIDTH = 380
const DEFAULT_MATERIALS_PANEL_WIDTH = 360

export function AITutorContainer() {
  const tTopbar = useTranslations('aiTutorTopbar')
  // Store State
  const {
    currentSessionId,
    selectedLectureIds,
    selectedCourseId,
    activeTab,
    isChatSidebarOpen,
    isNotesPanelOpen,
    isMaterialsPanelOpen,
    notesPanelWidth,
    materialsPanelWidth,
    messages,
    allReferences,
    chatKey,
    autoSelectLatest,
    isSessionLocked,
    isRecordingSourceDisabled
  } = useAITutorStore()
  const userId = useAuthStore(state => state.user?.user_id ?? null)

  // Actions
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
    setMaterialsPanelWidth
  } = useAITutorStore(state => ({
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
    notesPanelWidth: state.notesPanelWidth,
    materialsPanelWidth: state.materialsPanelWidth
  }))

  // Hooks
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const pendingNewChatParam = searchParams.get(AI_TUTOR_NEW_CHAT_PARAM)
  const {
    handleSessionCreated,
    handleSelectSession,
    handleNewChat
  } = useAITutorSession()

  const {
    game,
    handleGameIconClick,
    handleCloseGameOverlay
  } = useGameController()

  const {
    courseId: sharedCourseId,
    lectureIds: sharedLectureIds,
    updatedAt: sharedUpdatedAt,
    isHydrated: isSharedHydrated,
    setSelection: setSharedSelection,
  } = useStudyspaceSelectionStore(state => ({
    courseId: state.courseId,
    lectureIds: state.lectureIds,
    updatedAt: state.updatedAt,
    isHydrated: state.isHydrated,
    setSelection: state.setSelection,
  }))

  useStudyspaceSelectionSync(userId)
  const syncingFromSharedRef = useRef<number | null>(null)

  // Analytics: 대화형 학습 페이지 체류시간 추적
  useEffect(() => {
    trackPageEnter('dialogue')
    return () => { trackPageLeave('dialogue') }
  }, [])

  useEffect(() => {
    if (!isSharedHydrated) return

    if (sharedCourseId || sharedLectureIds.length > 0) {
      syncingFromSharedRef.current = sharedUpdatedAt
      setSelectedCourseId(sharedCourseId)
      setSelectedLectureIds(sharedLectureIds)
      setAutoSelectLatest(false)
      return
    }

    const visited = hasVisitedStudyspaceTab('ai-tutor', userId)
    if (!visited) {
      setAutoSelectLatest(true)
      markVisitedStudyspaceTab('ai-tutor', userId)
    } else {
      setAutoSelectLatest(false)
    }
  }, [
    isSharedHydrated,
    sharedCourseId,
    sharedLectureIds,
    sharedUpdatedAt,
    userId,
    setSelectedCourseId,
    setSelectedLectureIds,
    setAutoSelectLatest,
  ])

  useEffect(() => {
    const inSync =
      sharedCourseId === selectedCourseId &&
      areLectureIdsEqual(sharedLectureIds, selectedLectureIds)
    if (inSync) {
      syncingFromSharedRef.current = null
    }
  }, [sharedCourseId, sharedLectureIds, selectedCourseId, selectedLectureIds])

  // Handlers - 로컬 상태만 업데이트, shared sync는 아래 effect에서 처리
  const handleSelectLectureIds = useCallback((ids: string[]) => {
    setSelectedLectureIds(ids)
  }, [setSelectedLectureIds])

  const handleSelectCourse = useCallback((courseId: string | null) => {
    setSelectedCourseId(courseId)
  }, [setSelectedCourseId])

  // 로컬 상태 → shared 상태 동기화 (단방향, 디바운스)
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!isSharedHydrated) return
    // 이미 동기화된 상태면 skip
    if (
      sharedCourseId === selectedCourseId &&
      areLectureIdsEqual(sharedLectureIds, selectedLectureIds)
    ) {
      return
    }
    // shared에서 받아온 직후면 skip
    if (syncingFromSharedRef.current === sharedUpdatedAt) {
      return
    }
    // 디바운스: 연속 변경 시 마지막 값만 동기화
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
    }
    syncTimeoutRef.current = setTimeout(() => {
      setSharedSelection({
        courseId: selectedCourseId,
        lectureIds: selectedLectureIds,
        source: 'ai-tutor',
      })
      syncTimeoutRef.current = null
    }, 50)
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
        syncTimeoutRef.current = null
      }
    }
  }, [
    isSharedHydrated,
    sharedCourseId,
    sharedLectureIds,
    sharedUpdatedAt,
    selectedCourseId,
    selectedLectureIds,
    setSharedSelection,
  ])

  const handleLectureIdsLoaded = useCallback((ids: string[]) => {
    setSelectedLectureIds(ids)
  }, [setSelectedLectureIds])

  const handleMessagesUpdate = useCallback((newMessages: any[]) => {
    setMessages(newMessages)
  }, [setMessages])

  const handleReferencesUpdate = useCallback((messageIndex: number, references: any[]) => {
    updateReferences(messageIndex, references)
  }, [updateReferences])

  const overlayPanels: Array<'notes' | 'materials'> = []
  const showInlineNotesPanel = isNotesPanelOpen
  
  const handleCloseNotesPanel = () => {
    if (isNotesPanelOpen) {
      toggleNotesPanel(false)
      if (isMaterialsPanelOpen) {
        setActiveTab('materials')
      } else {
        setActiveTab('answer')
      }
    }
  }

  const handleCloseMaterialsPanel = () => {
    if (isMaterialsPanelOpen) {
      toggleMaterialsPanel(false)
      if (isNotesPanelOpen) {
        setActiveTab('notes')
      } else {
        setActiveTab('answer')
      }
    }
  }

  const resetPanelsForNewChat = useCallback(() => {
    if (isNotesPanelOpen) {
      toggleNotesPanel(false)
    }
    if (isMaterialsPanelOpen) {
      toggleMaterialsPanel(false)
    }
    if (notesPanelWidth !== DEFAULT_NOTES_PANEL_WIDTH) {
      setNotesPanelWidth(DEFAULT_NOTES_PANEL_WIDTH)
    }
    if (materialsPanelWidth !== DEFAULT_MATERIALS_PANEL_WIDTH) {
      setMaterialsPanelWidth(DEFAULT_MATERIALS_PANEL_WIDTH)
    }
    setActiveTab('answer')
  }, [
    isNotesPanelOpen,
    isMaterialsPanelOpen,
    notesPanelWidth,
    materialsPanelWidth,
    toggleNotesPanel,
    toggleMaterialsPanel,
    setNotesPanelWidth,
    setMaterialsPanelWidth,
    setActiveTab
  ])

  const handleNewChatAndResetPanels = useCallback(() => {
    resetPanelsForNewChat()
    handleNewChat()
  }, [resetPanelsForNewChat, handleNewChat])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const triggerNewChat = () => {
      sessionStorage.removeItem(AI_TUTOR_NEW_CHAT_FLAG)
      handleNewChatAndResetPanels()
    }

    if (sessionStorage.getItem(AI_TUTOR_NEW_CHAT_FLAG)) {
      triggerNewChat()
    }

    window.addEventListener(AI_TUTOR_NEW_CHAT_EVENT, triggerNewChat)
    return () => {
      window.removeEventListener(AI_TUTOR_NEW_CHAT_EVENT, triggerNewChat)
    }
  }, [handleNewChatAndResetPanels])

  useEffect(() => {
    if (!pendingNewChatParam) {
      return
    }

    handleNewChatAndResetPanels()
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(AI_TUTOR_NEW_CHAT_FLAG)
    }
    router.replace(pathname, { scroll: false })
  }, [pendingNewChatParam, handleNewChatAndResetPanels, router, pathname])

  const { recordingCount, materialCount } = useMemo(() => {
    let recording = 0
    let material = 0

    allReferences.forEach(refs => {
      refs.forEach(ref => {
        const hasCitations = Array.isArray(ref.citations) && ref.citations.length > 0
        if (!hasCitations) {
          return
        }

        if (ref.type === 'recording') {
          recording += 1
        } else if (ref.type === 'material') {
          material += 1
        }
      })
    })

    return { recordingCount: recording, materialCount: material }
  }, [allReferences])

  const [isResizingNotes, setIsResizingNotes] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isResizingNotes) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      
      // 레이아웃 상수
      const LEFT_MENU_WIDTH = 88      // 좌측 메뉴
      const LECTURE_SIDEBAR_WIDTH = 320 // 수업선택바
      const MIN_CHAT_WIDTH = 280      // 채팅창 최소 너비
      const MIN_NOTES_WIDTH = 300     // 노트 패널 최소 너비
      const MIN_MATERIALS_WIDTH = 340 // 머티리얼 패널 최소 너비
      
      const containerRect = containerRef.current.getBoundingClientRect()
      const totalFixedWidth = LEFT_MENU_WIDTH + LECTURE_SIDEBAR_WIDTH
      
      // 마우스 위치 기준 원하는 노트 패널 너비
      const desiredNotesWidth = containerRect.right - e.clientX
      
      if (isMaterialsPanelOpen) {
        // 전체 가용 공간 = 화면 - 좌측메뉴 - 수업선택바
        const availableSpace = window.innerWidth - totalFixedWidth
        
        let targetNotesWidth = desiredNotesWidth
        let targetMaterialsWidth = materialsPanelWidth
        
        // 채팅창 너비 계산 (현재 강의자료 너비 기준)
        const chatWidth = availableSpace - targetNotesWidth - targetMaterialsWidth
        
        if (targetNotesWidth > notesPanelWidth) {
          // 노트 패널 확장 (첫 번째 경계선을 오른쪽으로 밀기)
          if (chatWidth < MIN_CHAT_WIDTH) {
            // 채팅창이 최소 미만이면 → 강의자료 패널을 밀어서 공간 확보
            const deficit = MIN_CHAT_WIDTH - chatWidth
            targetMaterialsWidth = materialsPanelWidth - deficit
            
            // 강의자료도 최소에 도달하면 노트 확장 중지
            if (targetMaterialsWidth < MIN_MATERIALS_WIDTH) {
              targetMaterialsWidth = MIN_MATERIALS_WIDTH
              targetNotesWidth = availableSpace - MIN_CHAT_WIDTH - MIN_MATERIALS_WIDTH
            }
            
            setMaterialsPanelWidth(targetMaterialsWidth)
          }
        } else {
          // 노트 패널 축소 (첫 번째 경계선을 왼쪽으로 밀기)
          // 노트가 최소면 → 강의자료도 같이 줄여서 공간 확보
          if (targetNotesWidth < MIN_NOTES_WIDTH) {
            // 노트가 최소 미만 → 강의자료를 줄여서 채팅창 확장
            const notesDeficit = MIN_NOTES_WIDTH - targetNotesWidth
            targetNotesWidth = MIN_NOTES_WIDTH
            targetMaterialsWidth = materialsPanelWidth - notesDeficit
            
            // 강의자료도 최소에 도달하면 더 이상 축소 불가
            if (targetMaterialsWidth < MIN_MATERIALS_WIDTH) {
              targetMaterialsWidth = MIN_MATERIALS_WIDTH
            }
            
            setMaterialsPanelWidth(targetMaterialsWidth)
          }
        }
        
        // 노트 패널 최소 보장
        targetNotesWidth = Math.max(MIN_NOTES_WIDTH, targetNotesWidth)
        
        setNotesPanelWidth(targetNotesWidth)
      } else {
        // 강의자료 패널이 닫혀있을 때
        const maxNotesWidth = containerRect.width - MIN_CHAT_WIDTH
        const targetNotesWidth = Math.max(MIN_NOTES_WIDTH, Math.min(desiredNotesWidth, maxNotesWidth))
        setNotesPanelWidth(targetNotesWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizingNotes(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizingNotes, setNotesPanelWidth, isMaterialsPanelOpen, materialsPanelWidth, setMaterialsPanelWidth, notesPanelWidth])

  const rightbarContent = useMemo(() => (
    <div className="relative h-full w-[320px]">
      <div className="h-full opacity-100">
        <LectureSidebarContainer
          selectedLectureIds={selectedLectureIds}
          onSelectLectureIds={handleSelectLectureIds}
          initialLectureIds={selectedLectureIds}
          selectedCourseId={selectedCourseId}
          onSelectCourse={handleSelectCourse}
          isLocked={isSessionLocked}
          autoSelectLatest={autoSelectLatest}
          onAutoSelectComplete={() => setAutoSelectLatest(false)}
          onGameIconClick={handleGameIconClick}
        />
      </div>
    </div>
  ), [
    autoSelectLatest,
    handleGameIconClick,
    handleSelectCourse,
    handleSelectLectureIds,
    isSessionLocked,
    selectedCourseId,
    selectedLectureIds,
    setAutoSelectLatest,
  ])

  const materialsPanelContent = useMemo(() => (
    <ReferencePanel
      variant="materials"
      allReferences={allReferences}
      onClose={handleCloseMaterialsPanel}
      messages={messages}
      isRecordingSourceDisabled={isRecordingSourceDisabled}
      className="flex-1"
    />
  ), [allReferences, handleCloseMaterialsPanel, isRecordingSourceDisabled, messages])

  return (
    <>
      <div className="flex h-full min-h-0 overflow-hidden bg-transparent">
        <div ref={containerRef} className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <main
            className="flex flex-1 min-h-0 overflow-y-hidden overflow-x-hidden p-3 sm:p-6 pr-3 sm:pr-6 md:pr-[var(--ai-pr,0px)]"
            style={{ '--ai-pr': showInlineNotesPanel ? `${notesPanelWidth}px` : '0px' } as React.CSSProperties}
          >
            <div className="flex h-full w-full items-center justify-center -ml-3">
              <div
                className="mx-auto flex w-full max-w-6xl flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm overflow-hidden"
                style={{
                  height: '70vw',
                  maxHeight: '94vh',
                }}
              >
               <div className="flex items-center justify-between gap-4 border-b border-gray-200 pb-2 shrink-0 pt-0 -mt-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleNewChatAndResetPanels}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-700"
                  >
                    {tTopbar('newChat')}
                  </button>
                  <button
                    onClick={() => setIsChatSidebarOpen(true)}
                    className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
                    title={tTopbar('chatHistory')}
                  >
                    <History className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex rounded-lg bg-gray-100 p-1">
                  <button
                    onClick={() => {
                      setActiveTab('answer')
                      if (isNotesPanelOpen) toggleNotesPanel(false)
                      if (isMaterialsPanelOpen) toggleMaterialsPanel(false)
                    }}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                      !isNotesPanelOpen && !isMaterialsPanelOpen
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tTopbar('tab.answer')}
                  </button>
                  <button
                    onClick={() => {
                      const nextState = !isNotesPanelOpen
                      toggleNotesPanel(nextState)
                      if (nextState) {
                        setActiveTab('notes')
                        dialogueSourceAnalytics.sourceTabView(selectedLectureIds[0] ?? '', { tab: 'notes' })
                      } else if (isMaterialsPanelOpen) {
                        setActiveTab('materials')
                      } else {
                        setActiveTab('answer')
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                      isNotesPanelOpen
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <span>{tTopbar('tab.notesSources')}</span>
                    {recordingCount > 0 && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-200 text-[10px]">
                        {recordingCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      const nextState = !isMaterialsPanelOpen
                      toggleMaterialsPanel(nextState)
                      if (nextState) {
                        setActiveTab('materials')
                        dialogueSourceAnalytics.sourceTabView(selectedLectureIds[0] ?? '', { tab: 'materials' })
                      } else if (isNotesPanelOpen) {
                        setActiveTab('notes')
                      } else {
                        setActiveTab('answer')
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                      isMaterialsPanelOpen
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <span>{tTopbar('tab.materialsSources')}</span>
                    {materialCount > 0 && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-200 text-[10px]">
                        {materialCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-0">
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
                      if (!isNotesPanelOpen) {
                        toggleNotesPanel(true)
                      }
                      setActiveTab('notes')
                      dialogueSourceAnalytics.sourceTabView(selectedLectureIds[0] ?? '', { tab: 'notes' })
                    } else {
                      if (!isMaterialsPanelOpen) {
                        toggleMaterialsPanel(true)
                      }
                      setActiveTab('materials')
                      dialogueSourceAnalytics.sourceTabView(selectedLectureIds[0] ?? '', { tab: 'materials' })
                    }
                  }}
                />
              </div>
              </div>
            </div>
          </main>

          {showInlineNotesPanel && (
            <div
              className="fixed inset-x-0 bottom-0 z-30 h-[50dvh] w-full rounded-t-2xl border-t border-gray-200 bg-white shadow-2xl md:absolute md:inset-y-0 md:right-0 md:left-auto md:bottom-auto md:h-full md:w-[var(--ai-w,380px)] md:rounded-none md:border-l md:border-t-0 md:shadow-xl md:z-20"
              style={{ '--ai-w': `${notesPanelWidth}px` } as React.CSSProperties}
            >
              {/* Mobile grip handle */}
              <div className="md:hidden mx-auto mt-2 h-1.5 w-12 rounded-full bg-gray-300" aria-hidden />
              {/* Resizer Handle (desktop) */}
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
              />
            </div>
          )}
        </div>
      </div>

      <StudyspaceRightbarSlot>{rightbarContent}</StudyspaceRightbarSlot>

      {isMaterialsPanelOpen && (
        <StudyspaceOverlaySlot>{materialsPanelContent}</StudyspaceOverlaySlot>
      )}

      <ChatSidebar
        isOpen={isChatSidebarOpen}
        onClose={() => setIsChatSidebarOpen(false)}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChatAndResetPanels}
        currentSessionId={currentSessionId}
      />

      <GameOverlay
        isOpen={game.isOpen}
        onClose={handleCloseGameOverlay}
        triggerPosition={game.triggerPosition}
        lectureId={game.lectureId}
        courseId={game.courseId}
        lectureNo={game.lectureNo}
        courseName={game.courseName}
      />
    </>
  )
}

