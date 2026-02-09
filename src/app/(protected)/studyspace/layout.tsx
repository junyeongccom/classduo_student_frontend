'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from '@/shared/components/common'
import {
  StudyspaceLayoutProvider,
  useStudyspaceLayoutSlots,
} from '@/shared/components/layouts/studyspace'
import { PanelRightOpen, X } from 'lucide-react'
import { useAITutorStore } from '@/features/ai-tutor/store/useAITutorStore'

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
  const isExamPrep = pathname.startsWith('/studyspace/exam')
  const isTutorOrReview = pathname.startsWith('/studyspace/ai-tutor') || pathname.startsWith('/studyspace/review')
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
      const LECTURE_SIDEBAR_WIDTH = 320 // 수업선택바
      const MIN_CHAT_WIDTH = 280      // 채팅창 최소 너비
      const MIN_NOTES_WIDTH = 300     // 노트 패널 최소 너비
      const MIN_MATERIALS_WIDTH = 340 // 머티리얼 패널 최소 너비
      
      const desiredMaterialsWidth = window.innerWidth - e.clientX
      const totalFixedWidth = LEFT_MENU_WIDTH + LECTURE_SIDEBAR_WIDTH
      
      if (isNotesPanelOpen) {
        // 전체 가용 공간 = 화면 - 좌측메뉴 - 수업선택바
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
  return (
    <StudyspaceLayoutProvider>
      <StudyspaceLayoutShell>{children}</StudyspaceLayoutShell>
    </StudyspaceLayoutProvider>
  )
}

