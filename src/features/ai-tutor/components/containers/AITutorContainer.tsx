'use client'

import { useCallback, useEffect, useMemo } from 'react'
import { History } from 'lucide-react'
import { useAITutorStore } from '../../store/useAITutorStore'
import { useAITutorSession } from '../../hooks/useAITutorSession'
import { useGameController } from '../../hooks/useGameController'
import { ChatInterface } from './ChatInterface'
import { LectureSidebarContainer } from './LectureSidebarContainer'
import ChatSidebar from '../ui/ChatSidebar'
import { ReferencePanel } from '../ui/ReferencePanel'
import { GameOverlay } from '../ui/GameOverlay'
import { TabType } from '@/shared/components/common'
import {
  AI_TUTOR_NEW_CHAT_EVENT,
  AI_TUTOR_NEW_CHAT_FLAG,
  AI_TUTOR_NEW_CHAT_PARAM,
} from '@/shared/constants/aiTutor'
import {
  StudyspaceRightbarSlot,
  StudyspaceTopbarSlot,
} from '@/shared/components/layouts/studyspace'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export function AITutorContainer() {
  // Store State
  const {
    currentSessionId,
    selectedLectureIds,
    selectedCourseId,
    activeTab,
    isChatSidebarOpen,
    isNotesPanelOpen,
    isMaterialsPanelOpen,
    messages,
    allReferences,
    chatKey,
    autoSelectLatest,
    isSessionLocked
  } = useAITutorStore()

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
    toggleMaterialsPanel
  } = useAITutorStore(state => ({
    setActiveTab: state.setActiveTab,
    setIsChatSidebarOpen: state.setIsChatSidebarOpen,
    setMessages: state.setMessages,
    updateReferences: state.updateReferences,
    setSelectedLectureIds: state.setSelectedLectureIds,
    setSelectedCourseId: state.setSelectedCourseId,
    setAutoSelectLatest: state.setAutoSelectLatest,
    toggleNotesPanel: state.toggleNotesPanel,
    toggleMaterialsPanel: state.toggleMaterialsPanel
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

  // Handlers
  const handleSelectLectureIds = useCallback((ids: string[]) => {
    setSelectedLectureIds(ids)
  }, [setSelectedLectureIds])

  const handleSelectCourse = useCallback((courseId: string | null) => {
    setSelectedCourseId(courseId)
  }, [setSelectedCourseId])

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
  const showInlineNotesPanel = isNotesPanelOpen && isMaterialsPanelOpen
  if (isMaterialsPanelOpen) {
    overlayPanels.push('materials')
  }
  if (isNotesPanelOpen && !isMaterialsPanelOpen) {
    overlayPanels.push('notes')
  }
  const shouldHideSidebar = isNotesPanelOpen || isMaterialsPanelOpen

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

  useEffect(() => {
    if (typeof window === 'undefined') return

    const triggerNewChat = () => {
      sessionStorage.removeItem(AI_TUTOR_NEW_CHAT_FLAG)
      handleNewChat()
    }

    if (sessionStorage.getItem(AI_TUTOR_NEW_CHAT_FLAG)) {
      triggerNewChat()
    }

    window.addEventListener(AI_TUTOR_NEW_CHAT_EVENT, triggerNewChat)
    return () => {
      window.removeEventListener(AI_TUTOR_NEW_CHAT_EVENT, triggerNewChat)
    }
  }, [handleNewChat])

  useEffect(() => {
    if (!pendingNewChatParam) {
      return
    }

    handleNewChat()
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(AI_TUTOR_NEW_CHAT_FLAG)
    }
    router.replace(pathname, { scroll: false })
  }, [pendingNewChatParam, handleNewChat, router, pathname])

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

  return (
    <>
      <StudyspaceTopbarSlot>
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button
                onClick={handleNewChat}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:border-primary-300 hover:text-primary-700"
              >
                새 채팅
              </button>
              <button
                onClick={() => setIsChatSidebarOpen(true)}
                className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
                title="채팅 기록"
              >
                <History className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="mr-2 flex rounded-lg bg-gray-100 p-1">
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
                답변
              </button>
              <button
                onClick={() => {
                  const nextState = !isNotesPanelOpen
                  toggleNotesPanel(nextState)
                  if (nextState) {
                    setActiveTab('notes')
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
                <span>수업녹음본</span>
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
                <span>강의자료</span>
                {materialCount > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-200 text-[10px]">
                    {materialCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </StudyspaceTopbarSlot>

      <div className="flex h-full min-h-0 overflow-hidden bg-white">
        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <main
            className="flex-1 overflow-y-auto"
            style={{ paddingRight: showInlineNotesPanel ? 380 : 0 }}
          >
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
                } else {
                  if (!isMaterialsPanelOpen) {
                    toggleMaterialsPanel(true)
                  }
                  setActiveTab('materials')
                }
              }}
            />
          </main>

          {showInlineNotesPanel && (
            <div className="absolute inset-y-0 right-0 z-20 w-[380px] border-l border-gray-200 bg-white shadow-xl">
              <ReferencePanel
                variant="notes"
                allReferences={allReferences}
                onClose={handleCloseNotesPanel}
                messages={messages}
              />
            </div>
          )}
        </div>
      </div>

      <StudyspaceRightbarSlot>
        <div className="relative h-full w-[320px]">
          <div
            className={`h-full transition-[opacity] duration-300 ${
              shouldHideSidebar ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
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

          {overlayPanels.length > 0 && (
            <div className="absolute inset-0 z-10 flex flex-col border-l border-gray-200 bg-white shadow-xl">
              {overlayPanels.map(panel => (
                <ReferencePanel
                  key={panel}
                  variant={panel}
                  allReferences={allReferences}
                  onClose={panel === 'notes' ? handleCloseNotesPanel : handleCloseMaterialsPanel}
                  messages={messages}
                  className="flex-1"
                />
              ))}
            </div>
          )}
        </div>
      </StudyspaceRightbarSlot>

      <ChatSidebar
        isOpen={isChatSidebarOpen}
        onClose={() => setIsChatSidebarOpen(false)}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
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

