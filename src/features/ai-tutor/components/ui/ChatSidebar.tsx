'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { chatService } from '@/features/ai-tutor/services/chatService'
import { ChatSession, SearchResult } from '@/features/ai-tutor/types'
import { AITutorLoading } from '@/features/ai-tutor'
import { useI18n } from '@/shared/i18n/I18nProvider'

interface ChatSidebarProps {
  isOpen: boolean
  onClose: () => void
  onSelectSession: (sessionId: string, lectureIds?: string[]) => void
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
  const t = useTranslations('aiTutorChatHistory')
  const { locale } = useI18n()
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
      const { data, error } = await chatService.getSessions()
      if (data && !error) {
        // 백엔드에서 이미 updated_at.desc로 정렬되어 있음
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

  useEffect(() => {
    if (!isOpen) return

    const trimmedQuery = searchQuery.trim()
    if (!trimmedQuery) {
      setSearchResults([])
      setActiveTab('list')
      return
    }

    const debounceId = window.setTimeout(() => {
      handleSearch(trimmedQuery)
    }, 250)

    return () => {
      window.clearTimeout(debounceId)
    }
  }, [isOpen, searchQuery])

  // 검색
  const handleSearch = async (rawQuery: string) => {
    const trimmedQuery = rawQuery.trim()
    if (trimmedQuery.length < 2) {
      setSearchResults([])
      setActiveTab('list')
      return
    }

    setIsSearching(true)
    setActiveTab('search')
    try {
      const { data, error } = await chatService.searchMessages(trimmedQuery)
      if (!error) {
        // 백엔드에서 이미 rank DESC, created_at DESC로 정렬되어 있음
        setSearchResults(data ?? [])
      } else {
        setSearchResults([])
      }
    } catch (err) {
      console.error('Search failed:', err)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // 세션 삭제
  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation()
    if (!confirm(t('confirmDelete'))) return

    try {
      const { error } = await chatService.deleteSession(sessionId)
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
    const localeTag = locale === 'en' ? 'en-US' : 'ko-KR'

    if (days === 0) {
      return date.toLocaleTimeString(localeTag, { hour: '2-digit', minute: '2-digit' })
    } else if (days === 1) {
      return t('yesterday')
    } else if (days < 7) {
      return t('daysAgo', { days: String(days) })
    } else {
      return date.toLocaleDateString(localeTag, { month: 'short', day: 'numeric' })
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* 오버레이 */}
      <div 
        className="fixed inset-0 bg-slate-900/35 backdrop-blur-[2px] z-[70]"
        onClick={onClose}
      />

      {/* 사이드바 */}
      <div className="fixed left-0 top-0 h-full w-80 bg-slate-50 border-r border-slate-200 shadow-[0_24px_60px_rgba(15,23,42,0.18)] z-[80] flex flex-col">
        {/* 헤더 */}
        <div className="p-5 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900">{t('title')}</h2>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-slate-900/20 transition hover:bg-slate-800 flex items-center justify-center gap-2"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('newChat')}
          </button>
        </div>

        {/* 검색 */}
        <div className="px-5 py-4 border-b border-slate-200">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                const value = e.target.value
                setSearchQuery(value)
                if (!value.trim()) {
                  setSearchResults([])
                  setActiveTab('list')
                }
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
              placeholder={t('searchPlaceholder')}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
            <svg 
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
              </div>
            )}
          </div>

          {/* 탭 */}
          {searchResults.length > 0 && (
            <div className="flex mt-3 gap-2">
              <button
                onClick={() => setActiveTab('list')}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  activeTab === 'list'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {t('allList')}
              </button>
              <button
                onClick={() => setActiveTab('search')}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  activeTab === 'search'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {t('searchResults')} ({searchResults.length})
              </button>
            </div>
          )}
        </div>

        {/* 목록 */}
        <div className="flex-1 overflow-y-auto bg-white/60">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <AITutorLoading message={t('loadingHistory')} size="compact" />
            </div>
          ) : activeTab === 'list' ? (
            // 세션 목록
            sessions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p>{t('emptyTitle')}</p>
                <p className="text-sm mt-1">{t('emptySubtitle')}</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => {
                      onSelectSession(session.id, session.lecture_ids)
                      onClose()
                    }}
                    className={`px-5 py-4 cursor-pointer transition group ${
                      currentSessionId === session.id
                        ? 'bg-slate-100/70'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-slate-900 truncate">
                          {session.title || t('sessionTitleFallback')}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(session.updated_at)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteSession(e, session.id)}
                        className="rounded-full p-1 opacity-0 transition group-hover:opacity-100 hover:bg-slate-200"
                      >
                        <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <p>{t('noSearchResults')}</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {searchResults.map((result) => (
                  <div
                    key={result.message_id}
                    onClick={() => {
                      onSelectSession(result.session_id)
                      onClose()
                    }}
                    className="px-5 py-4 cursor-pointer transition hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        result.message_role === 'user'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {result.message_role === 'user' ? t('messageRole.question') : t('messageRole.answer')}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatDate(result.message_created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-900 line-clamp-2">
                      {result.message_content}
                    </p>
                    {result.session_title && (
                      <p className="mt-1 text-xs text-slate-500 truncate">
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

