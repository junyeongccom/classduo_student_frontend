'use client'

import { useState, useEffect, useCallback } from 'react'
import { chatApi, ChatSession, SearchResult } from '@/features/ai-tutor/api/chatApi'

interface ChatSidebarProps {
  isOpen: boolean
  onClose: () => void
  onSelectSession: (sessionId: string) => void
  onNewChat: () => void
  currentSessionId?: string
}

export default function ChatSidebar({
  isOpen,
  onClose,
  onSelectSession,
  onNewChat,
  currentSessionId,
}: ChatSidebarProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'list' | 'search'>('list')

  // 세션 목록 로드
  const loadSessions = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error } = await chatApi.getSessions()
      if (data && !error) {
        setSessions(data)
      }
    } catch (err) {
      console.error('Failed to load sessions:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadSessions()
    }
  }, [isOpen, loadSessions])

  // 검색
  const handleSearch = async () => {
    if (searchQuery.length < 2) return

    setIsSearching(true)
    try {
      const { data, error } = await chatApi.searchMessages(searchQuery)
      if (data && !error) {
        setSearchResults(data)
        setActiveTab('search')
      }
    } catch (err) {
      console.error('Search failed:', err)
    } finally {
      setIsSearching(false)
    }
  }

  // 세션 삭제
  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation()
    if (!confirm('이 채팅을 삭제하시겠습니까?')) return

    try {
      const { error } = await chatApi.deleteSession(sessionId)
      if (!error) {
        setSessions(prev => prev.filter(s => s.id !== sessionId))
        if (currentSessionId === sessionId) {
          onNewChat()
        }
      }
    } catch (err) {
      console.error('Failed to delete session:', err)
    }
  }

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    } else if (days === 1) {
      return '어제'
    } else if (days < 7) {
      return `${days}일 전`
    } else {
      return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* 오버레이 */}
      <div 
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* 사이드바 */}
      <div className="fixed left-0 top-0 h-full w-80 bg-white shadow-xl z-50 flex flex-col">
        {/* 헤더 */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">채팅 기록</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 새 채팅 버튼 */}
          <button
            onClick={() => {
              onNewChat()
              onClose()
            }}
            className="w-full py-2 px-4 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            새 채팅
          </button>
        </div>

        {/* 검색 */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="채팅 내용 검색..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            />
            <svg 
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* 탭 */}
          {searchResults.length > 0 && (
            <div className="flex mt-3 gap-2">
              <button
                onClick={() => setActiveTab('list')}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  activeTab === 'list'
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                전체 목록
              </button>
              <button
                onClick={() => setActiveTab('search')}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  activeTab === 'search'
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                검색 결과 ({searchResults.length})
              </button>
            </div>
          )}
        </div>

        {/* 목록 */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : activeTab === 'list' ? (
            // 세션 목록
            sessions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p>채팅 기록이 없습니다</p>
                <p className="text-sm mt-1">새 채팅을 시작해보세요!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => {
                      onSelectSession(session.id)
                      onClose()
                    }}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors group ${
                      currentSessionId === session.id ? 'bg-primary-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">
                          {session.title || '새 채팅'}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(session.updated_at)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteSession(e, session.id)}
                        className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded transition-all"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            // 검색 결과
            searchResults.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>검색 결과가 없습니다</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {searchResults.map((result) => (
                  <div
                    key={result.message_id}
                    onClick={() => {
                      onSelectSession(result.session_id)
                      onClose()
                    }}
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        result.message_role === 'user' 
                          ? 'bg-primary-100 text-primary-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {result.message_role === 'user' ? '질문' : '답변'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDate(result.message_created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 line-clamp-2">
                      {result.message_content}
                    </p>
                    {result.session_title && (
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        📁 {result.session_title}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </>
  )
}

