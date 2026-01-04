'use client'

import { useState, useCallback, useEffect } from 'react'
import { TopTabs, TabType } from '@/shared/components/common'
import { ChatInterface } from './components/ChatInterface'
import { LectureSidebar } from './components/LectureSidebar'
import ChatSidebar from './components/ChatSidebar'
import { ReferencePanel } from './components/ReferencePanel'
import { GameOverlay } from './components/GameOverlay'
import { Reference } from '@/features/ai-tutor/api/chatApi'

const AI_TUTOR_SESSION_KEY = 'ai-tutor-current-session-id'
const AI_TUTOR_LECTURE_IDS_KEY = 'ai-tutor-current-lecture-ids'

export default function AITutorPage() {
  // localStorage에서 세션 ID 복원
  const [currentSessionId, setCurrentSessionIdState] = useState<string | undefined>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(AI_TUTOR_SESSION_KEY) || undefined
    }
    return undefined
  })
  
  // localStorage에서 lecture IDs 복원
  const [selectedLectureIds, setSelectedLectureIdsState] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(AI_TUTOR_LECTURE_IDS_KEY)
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch {
          return []
        }
      }
    }
    return []
  })
  
  const [isChatSidebarOpen, setIsChatSidebarOpen] = useState(false)
  const [chatKey, setChatKey] = useState(0) // 채팅 리셋용
  const [activeTab, setActiveTab] = useState<TabType>('answer')
  const [allReferences, setAllReferences] = useState<Map<number, Reference[]>>(new Map()) // 메시지별 참고자료 저장
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; summary_keywords?: string | null }>>([]) // 메시지 배열 저장 (summary_keywords 포함)
  const [isSessionLocked, setIsSessionLocked] = useState(false) // 세션 잠금 상태
  const [autoSelectLatest, setAutoSelectLatest] = useState(false) // 가장 최신 회차 자동 선택 플래그
  const [isGameOverlayOpen, setIsGameOverlayOpen] = useState(false) // 게임 오버레이 표시 상태
  const [gameTriggerPosition, setGameTriggerPosition] = useState<{ top: number; left: number; width: number; height: number } | null>(null) // 게임 아이콘 위치
  
  // 세션 ID 설정 (localStorage 동기화)
  const setCurrentSessionId = useCallback((sessionId: string | undefined) => {
    setCurrentSessionIdState(sessionId)
    if (typeof window !== 'undefined') {
      if (sessionId) {
        localStorage.setItem(AI_TUTOR_SESSION_KEY, sessionId)
      } else {
        localStorage.removeItem(AI_TUTOR_SESSION_KEY)
      }
    }
  }, [])
  
  // lecture IDs 설정 (localStorage 동기화)
  const setSelectedLectureIds = useCallback((lectureIds: string[]) => {
    setSelectedLectureIdsState(lectureIds)
    if (typeof window !== 'undefined') {
      if (lectureIds.length > 0) {
        localStorage.setItem(AI_TUTOR_LECTURE_IDS_KEY, JSON.stringify(lectureIds))
      } else {
        localStorage.removeItem(AI_TUTOR_LECTURE_IDS_KEY)
      }
    }
  }, [])

  // 새 채팅 시작
  const handleNewChat = useCallback(() => {
    setCurrentSessionId(undefined)
    // 현재 선택된 강의 회차는 유지 (초기화하지 않음)
    // setSelectedLectureIds([]) // 선택 초기화 - 제거
    setIsSessionLocked(false) // 잠금 해제
    setChatKey(prev => prev + 1) // ChatInterface 리셋
    setAllReferences(new Map()) // 참고자료 초기화
    setMessages([]) // 메시지 초기화
    setActiveTab('answer')
    // 강의 회차가 이미 선택되어 있으면 유지, 없으면 최신 회차 자동 선택
    if (selectedLectureIds.length === 0) {
      setAutoSelectLatest(true) // 선택된 강의가 없을 때만 최신 회차 자동 선택
    } else {
      setAutoSelectLatest(false) // 이미 선택된 강의가 있으면 유지
    }
    // localStorage에서 세션 ID만 제거 (lecture IDs는 유지)
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AI_TUTOR_SESSION_KEY)
      // localStorage.removeItem(AI_TUTOR_LECTURE_IDS_KEY) - 제거
    }
  }, [setCurrentSessionId, selectedLectureIds])

  // 세션 선택 (기존 세션 불러오기)
  const handleSelectSession = useCallback((sessionId: string, lectureIds?: string[]) => {
    setCurrentSessionId(sessionId)
    // lectureIds가 있으면 즉시 설정, 없으면 ChatInterface에서 세션 로드 시 설정됨
    if (lectureIds && lectureIds.length > 0) {
      setSelectedLectureIds(lectureIds)
    }
    setIsSessionLocked(true) // 기존 세션은 잠금
    setChatKey(prev => prev + 1)
    setAutoSelectLatest(false) // 자동 선택 플래그 초기화
    // 참고자료와 메시지는 ChatInterface에서 세션 로드 시 자동으로 복원됨
    // 초기화하지 않으면 이전 세션의 데이터가 남아있을 수 있으므로 초기화
    setAllReferences(new Map())
    setMessages([])
    setActiveTab('answer')
  }, [setCurrentSessionId, setSelectedLectureIds])

  // 세션 생성 완료 시 (ChatInterface에서 호출)
  const handleSessionCreated = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId)
    setIsSessionLocked(true) // 세션 생성되면 잠금
  }, [setCurrentSessionId])
  
  // lecture IDs가 변경될 때 localStorage 업데이트
  useEffect(() => {
    if (selectedLectureIds.length > 0 && typeof window !== 'undefined') {
      localStorage.setItem(AI_TUTOR_LECTURE_IDS_KEY, JSON.stringify(selectedLectureIds))
    }
  }, [selectedLectureIds])

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

  // 게임 아이콘 클릭 핸들러
  const handleGameIconClick = useCallback((lectureId: string, position: { top: number; left: number; width: number; height: number }) => {
    setGameTriggerPosition(position)
    setIsGameOverlayOpen(true)
  }, [])

  // 게임 오버레이 닫기
  const handleCloseGameOverlay = useCallback(() => {
    setIsGameOverlayOpen(false)
    setTimeout(() => {
      setGameTriggerPosition(null)
    }, 600) // 애니메이션 완료 후 위치 초기화
  }, [])

  return (
    <div className="flex h-screen flex-col">
      {/* 상단 탭 - 새 채팅 / 채팅 기록 / 답변|수업녹음본|강의자료 */}
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
        {/* 채팅 인터페이스 - 항상 DOM에 유지하되 CSS로 숨김 */}
        <div className={`flex-1 ${activeTab === 'answer' ? 'block' : 'hidden'}`}>
          <ChatInterface 
            key={chatKey}
            selectedLectureIds={selectedLectureIds}
            sessionId={currentSessionId}
            onSessionCreated={handleSessionCreated}
            onReferencesUpdate={handleReferencesUpdate}
            onLectureIdsLoaded={setSelectedLectureIds}
            onMessagesUpdate={setMessages}
            onTabChange={handleTabChange}
          />
        </div>
        
        {/* 참고자료 패널 - 항상 DOM에 유지하되 CSS로 숨김 */}
        <div className={`flex-1 overflow-hidden ${activeTab !== 'answer' ? 'block' : 'hidden'}`}>
          <ReferencePanel
            allReferences={allReferences}
            activeTab={activeTab}
            onClose={handleClosePanel}
            messages={messages}
          />
        </div>

        {/* 우측 사이드바 - 수업 선택 */}
        <LectureSidebar
          selectedLectureIds={selectedLectureIds}
          onSelectLectureIds={setSelectedLectureIds}
          isLocked={isSessionLocked}
          initialLectureIds={selectedLectureIds.length > 0 ? selectedLectureIds : undefined}
          autoSelectLatest={autoSelectLatest}
          onGameIconClick={handleGameIconClick}
        />
      </div>

      {/* 게임 오버레이 */}
      <GameOverlay
        isOpen={isGameOverlayOpen}
        onClose={handleCloseGameOverlay}
        triggerPosition={gameTriggerPosition}
      />
    </div>
  )
}


