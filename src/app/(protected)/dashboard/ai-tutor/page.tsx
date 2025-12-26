'use client'

import { useState, useCallback } from 'react'
import { TopTabs } from '@/shared/components/common'
import { ChatInterface } from './components/ChatInterface'
import { LectureSidebar } from './components/LectureSidebar'
import ChatSidebar from './components/ChatSidebar'

export default function AITutorPage() {
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([])
  const [isChatSidebarOpen, setIsChatSidebarOpen] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>()
  const [chatKey, setChatKey] = useState(0) // 채팅 리셋용

  // 새 채팅 시작
  const handleNewChat = useCallback(() => {
    setCurrentSessionId(undefined)
    setChatKey(prev => prev + 1) // ChatInterface 리셋
  }, [])

  // 세션 선택
  const handleSelectSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId)
    setChatKey(prev => prev + 1)
  }, [])

  return (
    <div className="flex h-screen flex-col">
      {/* 상단 탭 - 새 채팅 / 채팅 기록 */}
      <TopTabs 
        onNewChat={handleNewChat}
        onOpenChatHistory={() => setIsChatSidebarOpen(true)} 
      />

      {/* 채팅 사이드바 (목록/검색) */}
      <ChatSidebar
        isOpen={isChatSidebarOpen}
        onClose={() => setIsChatSidebarOpen(false)}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        currentSessionId={currentSessionId}
      />

      {/* 메인 콘텐츠 영역 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 채팅 인터페이스 */}
        <div className="flex-1">
          <ChatInterface 
            key={chatKey}
            selectedJobIds={selectedJobIds}
            sessionId={currentSessionId}
            onSessionCreated={setCurrentSessionId}
          />
        </div>

        {/* 우측 사이드바 - 수업일 선택 */}
        <LectureSidebar
          selectedJobIds={selectedJobIds}
          onSelectJobIds={setSelectedJobIds}
        />
      </div>
    </div>
  )
}


