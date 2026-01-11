'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  StudyspaceOverlaySlot,
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
    notesPanelWidth,
    materialsPanelWidth,
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
    setMaterialsPanelWidth: state.setMaterialsPanelWidth
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

  const [isResizingNotes, setIsResizingNotes] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isResizingNotes) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      
      const SIDEBAR_WIDTH = 140
      const MIN_CHAT_WIDTH = 400
      const MIN_NOTES_WIDTH = 300
      const MIN_MATERIALS_WIDTH = 340
      
      const containerRect = containerRef.current.getBoundingClientRect()
      // New Width = Right Edge of Container - Mouse X
      // Note: Container Right Edge excludes the Materials Panel if it's rendered by layout.tsx
      // But here, AITutorContainer is inside Main Content.
      // Wait, layout.tsx handles Materials Panel outside Main Content.
      // So containerRef (inside Main) only spans [Sidebar ... MaterialsStart].
      // So containerRect.right IS the edge of Materials Panel.
      
      const newWidth = containerRect.right - e.clientX
      
      // 노트 패널 최대 너비 계산 (화면 밖으로 밀림 방지)
      // 1. 기본: 컨테이너 너비 - 채팅창 최소 너비(400px)
      // 2. 추가: 전체 화면의 60%를 넘지 않도록 제한
      // 3. 수정: 강의자료 패널이 열려있다면 그 공간도 확보해야 함.
      const availableSpace = window.innerWidth - SIDEBAR_WIDTH - MIN_CHAT_WIDTH - (isMaterialsPanelOpen ? materialsPanelWidth : 0);
      
      const maxNotesWidth = Math.min(
        containerRect.width - MIN_CHAT_WIDTH,
        window.innerWidth * 0.6,
        availableSpace // 추가된 제약 조건: 강의자료 패널 공간 + 채팅창 최소 너비 보장
      )
      
      let targetNotesWidth = newWidth
      
      // 채팅창 최소 너비(MIN_CHAT_WIDTH) 보장 로직
      // 채팅창 너비 = containerRect.width - targetNotesWidth
      // 따라서 targetNotesWidth는 (containerRect.width - MIN_CHAT_WIDTH)를 넘을 수 없음 (최대 너비 제약과 동일하지만 재확인)
      
      // 사용자가 "채팅창이 최소 너비가 됐을 때는... 경계선이 왼쪽으로 작동하지 않게 해줘" 라고 함.
      // 즉, targetNotesWidth가 maxNotesWidth를 초과하려고 하면 막아야 함.
      // 이 로직은 이미 아래 'else if (targetNotesWidth > maxNotesWidth)' 에서 처리됨.
      
      // 그러나 "오른쪽으로만 당겨지게 해줘" 라는 의미는, 
      // 현재 상태가 이미 Max Width에 도달해 있다면, 더 이상 왼쪽으로 드래그해도 반응하지 않아야 한다는 뜻.
      
      if (targetNotesWidth < MIN_NOTES_WIDTH) {
         // 노트 패널 최소 너비 도달 시 로직 (기존 유지)
         targetNotesWidth = MIN_NOTES_WIDTH
         
         if (isMaterialsPanelOpen) {
            const mouseRelativeX = e.clientX - containerRect.left
            const desiredChatWidth = mouseRelativeX
            
            // 남은 공간 계산
            const availableForMaterials = window.innerWidth - SIDEBAR_WIDTH - desiredChatWidth - MIN_NOTES_WIDTH
            
            if (availableForMaterials >= MIN_MATERIALS_WIDTH) {
               setMaterialsPanelWidth(availableForMaterials)
            } else {
               setMaterialsPanelWidth(MIN_MATERIALS_WIDTH)
            }
         }
      } 
      else if (targetNotesWidth >= maxNotesWidth) {
         // 채팅창 최소 너비 도달 시 (노트 패널 최대 너비)
         // 왼쪽 드래그(확장) 시도 시 막음. 오른쪽 드래그(축소)는 허용됨(newWidth가 maxNotesWidth보다 작아지므로 이 블록에 안 들어옴).
         // 하지만 newWidth가 maxNotesWidth보다 크면 여기 들어옴.
         // 따라서 그냥 maxNotesWidth로 고정하면 됨.
         targetNotesWidth = maxNotesWidth
      }
      
      setNotesPanelWidth(targetNotesWidth)
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
  }, [isResizingNotes, setNotesPanelWidth, isMaterialsPanelOpen, materialsPanelWidth, setMaterialsPanelWidth])

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
        <div ref={containerRef} className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <main
            className="flex-1 overflow-y-auto"
            style={{ paddingRight: showInlineNotesPanel ? notesPanelWidth : 0 }}
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
            <div 
              className="absolute inset-y-0 right-0 z-20 border-l border-gray-200 bg-white shadow-xl"
              style={{ width: notesPanelWidth }}
            >
              {/* Resizer Handle */}
              <div
                onMouseDown={(e) => {
                  e.preventDefault()
                  setIsResizingNotes(true)
                }}
                className={`absolute left-0 top-0 z-50 h-full w-1 -translate-x-1/2 cursor-col-resize hover:bg-primary-500/50 ${
                  isResizingNotes ? 'bg-primary-500' : 'bg-transparent'
                }`}
              />
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
        {/* Only render Rightbar content if it's going to be shown.
            However, 'layout.tsx' controls visibility. 
            We can always render it into the slot, layout will hide the slot container if needed.
            Or we can conditionally render here to save resources, but layout logic is the source of truth for visibility.
        */}
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
      </StudyspaceRightbarSlot>

      {isMaterialsPanelOpen && (
        <StudyspaceOverlaySlot>
          <ReferencePanel
            variant="materials"
            allReferences={allReferences}
            onClose={handleCloseMaterialsPanel}
            messages={messages}
            className="flex-1"
          />
        </StudyspaceOverlaySlot>
      )}

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

