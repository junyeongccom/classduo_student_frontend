/**
 * AI 튜터 채팅 인터페이스 (GPT 스타일 + 세션 관리)
 */
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, Search } from 'lucide-react'
import { chatApi, ChatMessage, StoredMessage, Reference } from '@/features/ai-tutor/api/chatApi'

interface ChatInterfaceProps {
  selectedLectureIds: string[]
  sessionId?: string
  onSessionCreated?: (sessionId: string) => void
  onReferencesUpdate?: (messageIndex: number, references: Reference[]) => void
  onLectureIdsLoaded?: (lectureIds: string[]) => void // 세션 로드 시 lecture_ids 전달
  onMessagesUpdate?: (messages: ChatMessage[]) => void // 메시지 배열 업데이트
}

// 기본 후킹 질문 (API에서 가져오지 못했을 때 사용)
const DEFAULT_HOOKING_QUESTIONS = [
  '이 수업에서 가장 중요한 개념은 무엇인가요?',
  '이 내용을 실생활에 어떻게 적용할 수 있나요?',
  '이 주제와 관련된 최신 연구는 무엇인가요?',
  '이 개념을 더 쉽게 이해하려면 어떻게 해야 하나요?',
]

export function ChatInterface({ selectedLectureIds, sessionId, onSessionCreated, onReferencesUpdate, onLectureIdsLoaded, onMessagesUpdate }: ChatInterfaceProps) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [pendingReferences, setPendingReferences] = useState<{ messageIndex: number; refs: Reference[] } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingStatusItems, setLoadingStatusItems] = useState<Array<{
    step: string
    message: string
    sources: Array<{ 
      type: 'recording' | 'material'
      title: string
      preview?: string
    }>
  }>>([])
  const [error, setError] = useState<string | null>(null)
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(sessionId)
  const [hookingQuestions, setHookingQuestions] = useState<Array<{ question: string; answer?: string; reference_data?: Reference[] | null }>>(
    DEFAULT_HOOKING_QUESTIONS.map(q => ({ question: q }))
  )
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isInitialMount = useRef(true)  // 초기 마운트 여부
  const selfCreatedSessionId = useRef<string | undefined>(undefined)  // 자신이 생성한 세션 ID

  // lecture_ids 변경 시 후킹 질문 로드 (단일 선택 시에만)
  useEffect(() => {
    const loadHookingQuestions = async () => {
      // 복수 선택이거나 선택 없으면 후킹 질문 숨김
      if (selectedLectureIds.length !== 1) {
        setHookingQuestions([])
        return
      }
      
      try {
        const { data, error } = await chatApi.getHookingByLecture(selectedLectureIds[0])
        if (data && !error) {
          // 후킹 질문이 있으면 해당 질문과 답변, 참고자료 함께 저장
          setHookingQuestions([{
            question: data.question,
            answer: data.answer,
            reference_data: data.reference_data || null
          }])
        } else {
          // 후킹 질문이 없으면 기본 질문 사용
          setHookingQuestions(DEFAULT_HOOKING_QUESTIONS.map(q => ({ question: q })))
        }
      } catch (err) {
        console.error('Failed to load hooking questions:', err)
        setHookingQuestions(DEFAULT_HOOKING_QUESTIONS.map(q => ({ question: q })))
      }
    }
    
    loadHookingQuestions()
  }, [selectedLectureIds])

  // 세션 변경 시 메시지 로드
  useEffect(() => {
    const loadSession = async () => {
      if (sessionId) {
        // 자신이 방금 생성한 세션이면 로드 건너뛰기
        if (selfCreatedSessionId.current === sessionId) {
          selfCreatedSessionId.current = undefined  // 플래그 초기화
          return
        }
        
        setIsLoading(true)
        try {
          const { data, error } = await chatApi.getSession(sessionId)
          if (data && !error) {
            // 메시지 로드 (summary_keywords 포함)
            const loadedMessages: Array<ChatMessage & { summary_keywords?: string | null }> = data.messages.map((m: StoredMessage) => ({
              role: m.role,
              content: m.content,
              summary_keywords: m.summary_keywords || null,
            }))
            setMessages(loadedMessages)
            setCurrentSessionId(sessionId)
            
            // 메시지 배열을 부모에게 전달 (키워드 표시를 위해 필요)
            if (onMessagesUpdate) {
              onMessagesUpdate(loadedMessages)
            }
            
            // 각 assistant 메시지의 참고자료를 부모에게 전달
            // 메시지 배열에서 실제 assistant 메시지의 인덱스를 찾아서 전달
            loadedMessages.forEach((msg, index) => {
              if (msg.role === 'assistant') {
                // 원본 메시지 배열에서 해당 인덱스의 메시지 찾기
                const originalMessage = data.messages[index]
                if (originalMessage && originalMessage.reference_data && originalMessage.reference_data.length > 0 && onReferencesUpdate) {
                  onReferencesUpdate(index, originalMessage.reference_data)
                }
              }
            })
            
            // 세션의 lecture_ids를 부모에게 전달 (session 객체에서 가져옴)
            if (data.session?.lecture_ids && onLectureIdsLoaded) {
              onLectureIdsLoaded(data.session.lecture_ids)
            }
          }
        } catch (err) {
          console.error('Failed to load session:', err)
        } finally {
          setIsLoading(false)
        }
      } else {
        // sessionId가 없으면 초기화 (새 채팅)
        setMessages([])
        setCurrentSessionId(undefined)
        selfCreatedSessionId.current = undefined
      }
    }

    // 초기 마운트이거나 sessionId가 변경되었을 때 로드
    if (isInitialMount.current) {
      isInitialMount.current = false
      if (sessionId) {
        loadSession()
      }
    } else {
      loadSession()
    }
  }, [sessionId, onLectureIdsLoaded])

  // 메시지 추가 시 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 메시지 배열 업데이트 시 부모에게 전달
  useEffect(() => {
    if (onMessagesUpdate) {
      onMessagesUpdate(messages)
    }
  }, [messages, onMessagesUpdate])

  // 참고자료 업데이트를 useEffect에서 처리 (렌더링 중 setState 방지)
  useEffect(() => {
    if (pendingReferences && onReferencesUpdate) {
      // 메시지 배열이 업데이트된 후에 참고자료 업데이트
      const currentMessageCount = messages.length
      if (pendingReferences.messageIndex < currentMessageCount) {
        onReferencesUpdate(pendingReferences.messageIndex, pendingReferences.refs)
        setPendingReferences(null)
      }
    }
  }, [pendingReferences, onReferencesUpdate, messages.length])

  // 메시지 전송 (SSE 스트리밍)
  const sendMessage = useCallback(async (question: string) => {
    if (!question.trim() || isLoading || selectedLectureIds.length === 0) return

    setIsLoading(true)
    setError(null)
    setLoadingStatusItems([])

    // 사용자 메시지 즉시 표시
    const userMessage: ChatMessage = { role: 'user', content: question }
    setMessages(prev => [...prev, userMessage])

    try {
      let sessionIdToUse = currentSessionId

      // 세션이 없으면 생성
      if (!sessionIdToUse) {
        const sessionResult = await chatApi.createSession(selectedLectureIds)
        if (sessionResult.error || !sessionResult.data) {
          if (sessionResult.error && sessionResult.status === 401) {
            throw new Error('인증이 만료되었습니다. 페이지를 새로고침해주세요.')
          }
          throw new Error(sessionResult.error?.message || '세션 생성 실패')
        }
        
        sessionIdToUse = sessionResult.data.id
        selfCreatedSessionId.current = sessionIdToUse
        setCurrentSessionId(sessionIdToUse)
        onSessionCreated?.(sessionIdToUse)
      }

      // SSE 스트리밍으로 채팅
      await chatApi.sessionChatStream(
        sessionIdToUse,
        question,
        // onProgress: 진행 상황 업데이트 (누적)
        (progressData) => {
          if (progressData.type === 'status') {
            // 새로운 상태 메시지 추가
            setLoadingStatusItems(prev => [...prev, {
              step: progressData.step,
              message: progressData.message || '',
              sources: []
            }])
          } else if (progressData.type === 'source' && progressData.data) {
            // 마지막 상태 항목에 소스 추가
            setLoadingStatusItems(prev => {
              if (prev.length === 0) {
                // 상태 메시지가 없으면 기본 상태 추가
                return [{
                  step: progressData.step || 'searching',
                  message: '관련 자료를 검색하는 중...',
                  sources: [{
                    type: progressData.source_type!,
                    title: progressData.data.title || '',
                    preview: progressData.data.preview
                  }]
                }]
              }
              const updated = [...prev]
              const lastItem = updated[updated.length - 1]
              updated[updated.length - 1] = {
                ...lastItem,
                sources: [...lastItem.sources, {
                  type: progressData.source_type!,
                  title: progressData.data.title || '',
                  preview: progressData.data.preview
                }]
              }
              return updated
            })
          }
        },
        // onComplete: 최종 결과 처리
        (result) => {
          const assistantMessage: ChatMessage = {
            role: 'assistant',
            content: result.answer,
          }
          setMessages(prev => {
            const updated = [...prev, assistantMessage]
            const messageIndex = updated.length - 1
            const newRefs = result.references || []
            
            if (newRefs.length > 0) {
              setPendingReferences({ messageIndex, refs: newRefs })
            }
            
            return updated
          })
          setLoadingStatusItems([])
          setIsLoading(false)
        },
        // onError: 에러 처리
        (error) => {
          const errorMessage = error.message || '채팅 중 오류가 발생했습니다'
          setError(errorMessage)
          console.error('Chat error:', error)
          
          if (errorMessage.includes('인증이 만료되었습니다')) {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('classduo_access_token')
              localStorage.removeItem('classduo_refresh_token')
              setTimeout(() => {
                window.location.reload()
              }, 2000)
            }
          }
          
          setMessages(prev => prev.slice(0, -1))
          setLoadingStatusItems([])
          setIsLoading(false)
        }
      )
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '채팅 중 오류가 발생했습니다'
      setError(errorMessage)
      console.error('Chat error:', err)
      
      if (errorMessage.includes('인증이 만료되었습니다')) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('classduo_access_token')
          localStorage.removeItem('classduo_refresh_token')
          setTimeout(() => {
            window.location.reload()
          }, 2000)
        }
      }
      
      setMessages(prev => prev.slice(0, -1))
      setLoadingStatusItems([])
      setIsLoading(false)
    }
  }, [currentSessionId, selectedLectureIds, isLoading, onSessionCreated, onReferencesUpdate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    
    const question = input
    setInput('')
    await sendMessage(question)
  }

  const handleSuggestionClick = async (hooking: { question: string; answer?: string; reference_data?: Reference[] | null }) => {
    // 미리 저장된 답변이 있으면 바로 표시
    if (hooking.answer) {
      // 사용자 메시지 추가
      const userMessage: ChatMessage = {
        role: 'user',
        content: hooking.question,
      }
      setMessages(prev => [...prev, userMessage])
      
      // AI 답변 추가
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: hooking.answer,
      }
      setMessages(prev => {
        const updated = [...prev, assistantMessage]
        const messageIndex = updated.length - 1
        
        // 참고자료가 있으면 부모에게 전달
        if (hooking.reference_data && hooking.reference_data.length > 0 && onReferencesUpdate) {
          setPendingReferences({ messageIndex, refs: hooking.reference_data })
        }
        
        return updated
      })
      
      // 세션이 없으면 생성하고 메시지 저장
      if (!currentSessionId) {
        try {
          const sessionResult = await chatApi.createSession(selectedLectureIds)
          if (sessionResult.data) {
            const newSessionId = sessionResult.data.id
            selfCreatedSessionId.current = newSessionId
            setCurrentSessionId(newSessionId)
            onSessionCreated?.(newSessionId)
            
            // 메시지 저장 (백그라운드)
            chatApi.sessionChat(newSessionId, hooking.question).catch(err => {
              console.error('Failed to save hooking message:', err)
            })
          }
        } catch (err) {
          console.error('Failed to create session for hooking:', err)
        }
      } else {
        // 기존 세션에 메시지 저장 (백그라운드)
        chatApi.sessionChat(currentSessionId, hooking.question).catch(err => {
          console.error('Failed to save hooking message:', err)
        })
      }
    } else {
      // 미리 저장된 답변이 없으면 기존처럼 sendMessage 호출
      setInput(hooking.question)
    }
  }

  // 수업 미선택 상태
  if (selectedLectureIds.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400">
        <div className="text-center">
          <p className="text-lg font-medium">수업을 선택해주세요</p>
          <p className="mt-2 text-sm">우측에서 수업을 선택하면 AI 튜터와 대화할 수 있습니다</p>
        </div>
      </div>
    )
  }

  // 대화가 시작되지 않은 초기 상태 (GPT 스타일)
  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex h-full flex-col">
        {/* 중앙 컨텐츠 */}
        <div className="flex flex-1 flex-col items-center justify-center px-4">
          {/* 후킹 질문 목록 */}
          <div className="mb-8 w-full max-w-2xl space-y-2">
            {hookingQuestions.map((hooking, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(hooking)}
                className="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
              >
                <Search className="h-4 w-4 text-gray-400" />
                <span>{hooking.question}</span>
              </button>
            ))}
          </div>

          {/* 중앙 입력창 */}
          <div className="w-full max-w-2xl">
            <form onSubmit={handleSubmit}>
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="무엇이든 물어보세요."
                  disabled={isLoading}
                  className="w-full rounded-full border border-gray-300 bg-gray-50 px-5 py-3.5 pr-14 text-sm focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100"
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-primary-500 text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // 대화 진행 중 상태
  return (
    <div className="flex h-full flex-col">
      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="whitespace-pre-wrap text-sm">{message.content}</p>
              </div>
            </div>
          ))}
          {isLoading && loadingStatusItems.length > 0 && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-gray-50 border border-gray-200 px-5 py-4 max-w-[85%] w-full">
                <div className="flex items-start gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 space-y-4">
                    {/* 누적된 상태 메시지와 소스 목록 */}
                    {loadingStatusItems.map((statusItem, statusIdx) => (
                      <div key={statusIdx} className="space-y-3">
                        {/* 상태 메시지 */}
                        <p className="text-sm font-medium text-gray-900">{statusItem.message}</p>
                        
                        {/* 해당 상태의 소스 목록 */}
                        {statusItem.sources.length > 0 && (
                          <div className="space-y-2 pl-0">
                            <div className="space-y-2">
                              {statusItem.sources.map((source, sourceIdx) => (
                                <div
                                  key={`${statusIdx}-${sourceIdx}`}
                                  className="flex items-start gap-3 px-4 py-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                                >
                                  <div className="flex-shrink-0 mt-0.5">
                                    {source.type === 'recording' ? (
                                      <div className="w-9 h-9 rounded-full bg-primary-50 border border-primary-200 flex items-center justify-center">
                                        <span className="text-primary-600 text-base">🎙️</span>
                                      </div>
                                    ) : (
                                      <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center">
                                        <span className="text-blue-600 text-base">📄</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 mb-1">
                                      {source.title}
                                    </p>
                                    {source.preview && (
                                      <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
                                        {source.preview}
                                      </p>
                                    )}
                                    <p className="text-xs text-gray-500 mt-1.5">
                                      {source.type === 'recording' ? '수업 녹음본' : '강의자료'}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="border-t border-gray-200 bg-red-50 px-6 py-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* 하단 입력 영역 */}
      <div className="border-t border-gray-200 px-4 py-3">
        <form onSubmit={handleSubmit} className="mx-auto max-w-2xl">
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="무엇이든 물어보세요."
              disabled={isLoading}
              className="w-full rounded-full border border-gray-300 bg-gray-50 px-5 py-3 pr-14 text-sm focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-primary-500 text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
