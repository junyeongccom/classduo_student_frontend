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
  const [allReferences, setAllReferences] = useState<Map<number, Reference[]>>(new Map()) // 메시지별 참고자료 저장
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; summary_keywords?: string | null }>>([]) // 메시지 배열 저장 (summary_keywords 포함)
  const [isSessionLocked, setIsSessionLocked] = useState(false) // 세션 잠금 상태

  // 새 채팅 시작
  const handleNewChat = useCallback(() => {
    setCurrentSessionId(undefined)
    setSelectedLectureIds([]) // 선택 초기화
    setIsSessionLocked(false) // 잠금 해제
    setChatKey(prev => prev + 1) // ChatInterface 리셋
    setAllReferences(new Map()) // 참고자료 초기화
    setMessages([]) // 메시지 초기화
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
    // 참고자료와 메시지는 ChatInterface에서 세션 로드 시 자동으로 복원됨
    // 초기화하지 않으면 이전 세션의 데이터가 남아있을 수 있으므로 초기화
    setAllReferences(new Map())
    setMessages([])
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

  // 참고자료 업데이트 (ChatInterface에서 호출) - 메시지 인덱스와 함께
  const handleReferencesUpdate = useCallback((messageIndex: number, newRefs: Reference[]) => {
    setAllReferences(prev => {
      const updated = new Map(prev)
      updated.set(messageIndex, newRefs)
      return updated
    })
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
        hasReferences={Array.from(allReferences.values()).some(refs => refs.length > 0)}
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
        {/* 채팅 인터페이스 또는 참고자료 탭 */}
        {activeTab === 'answer' ? (
          <div className="flex-1">
            <ChatInterface 
              key={chatKey}
              selectedLectureIds={selectedLectureIds}
              sessionId={currentSessionId}
              onSessionCreated={handleSessionCreated}
              onReferencesUpdate={handleReferencesUpdate}
              onLectureIdsLoaded={setSelectedLectureIds}
              onMessagesUpdate={setMessages}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <ReferencePanel
              allReferences={allReferences}
              activeTab={activeTab}
              onClose={handleClosePanel}
              messages={messages}
            />
          </div>
        )}

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


