'use client'

import { useState, useCallback } from 'react'
import { TopTabs, TabType } from '@/shared/components/common'
import { ChatInterface } from './components/ChatInterface'
import { LectureSidebar } from './components/LectureSidebar'
import ChatSidebar from './components/ChatSidebar'
import { ReferencePanel } from './components/ReferencePanel'
import { Reference } from '@/features/ai-tutor/api/chatApi'

export default function AITutorPage() {
  const [selectedLectureIds, setSelectedLectureIds] = useState<string[]>([])
  const [isChatSidebarOpen, setIsChatSidebarOpen] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>()
  const [chatKey, setChatKey] = useState(0) // 채팅 리셋용
  const [activeTab, setActiveTab] = useState<TabType>('answer')
  const [references, setReferences] = useState<Reference[]>([])
  const [isSessionLocked, setIsSessionLocked] = useState(false) // 세션 잠금 상태

  // 새 채팅 시작
  const handleNewChat = useCallback(() => {
    setCurrentSessionId(undefined)
    setSelectedLectureIds([]) // 선택 초기화
    setIsSessionLocked(false) // 잠금 해제
    setChatKey(prev => prev + 1) // ChatInterface 리셋
    setReferences([]) // 참고자료 초기화
    setActiveTab('answer')
  }, [])

  // 세션 선택 (기존 세션 불러오기)
  const handleSelectSession = useCallback((sessionId: string, lectureIds?: string[]) => {
    setCurrentSessionId(sessionId)
    if (lectureIds && lectureIds.length > 0) {
      setSelectedLectureIds(lectureIds)
      setIsSessionLocked(true) // 기존 세션은 잠금
    }
    setChatKey(prev => prev + 1)
    setReferences([]) // 새 세션 선택 시 참고자료 초기화
    setActiveTab('answer')
  }, [])

  // 세션 생성 완료 시 (ChatInterface에서 호출)
  const handleSessionCreated = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId)
    setIsSessionLocked(true) // 세션 생성되면 잠금
  }, [])

  // 탭 변경
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab)
  }, [])

  // 참고자료 업데이트 (ChatInterface에서 호출)
  const handleReferencesUpdate = useCallback((newRefs: Reference[]) => {
    setReferences(newRefs)
  }, [])

  // 참고자료 패널 닫기
  const handleClosePanel = useCallback(() => {
    setActiveTab('answer')
  }, [])

  return (
    <div className="flex h-screen flex-col">
      {/* 상단 탭 - 새 채팅 / 채팅 기록 / 답변|수업노트|강의자료 */}
      <TopTabs 
        onNewChat={handleNewChat}
        onOpenChatHistory={() => setIsChatSidebarOpen(true)}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        hasReferences={references.length > 0}
      />

      {/* 채팅 사이드바 (목록/검색) */}
      <ChatSidebar
        isOpen={isChatSidebarOpen}
        onClose={() => setIsChatSidebarOpen(false)}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        currentSessionId={currentSessionId}
      />

      {/* 참고자료 패널 (수업노트/강의자료 탭 선택 시) */}
      {activeTab !== 'answer' && references.length > 0 && (
        <ReferencePanel
          references={references}
          activeTab={activeTab}
          onClose={handleClosePanel}
        />
      )}

      {/* 메인 콘텐츠 영역 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 채팅 인터페이스 */}
        <div className="flex-1">
          <ChatInterface 
            key={chatKey}
            selectedLectureIds={selectedLectureIds}
            sessionId={currentSessionId}
            onSessionCreated={handleSessionCreated}
            onReferencesUpdate={handleReferencesUpdate}
            onLectureIdsLoaded={setSelectedLectureIds}
          />
        </div>

        {/* 우측 사이드바 - 수업 선택 */}
        <LectureSidebar
          selectedLectureIds={selectedLectureIds}
          onSelectLectureIds={setSelectedLectureIds}
          isLocked={isSessionLocked}
        />
      </div>
    </div>
  )
}


