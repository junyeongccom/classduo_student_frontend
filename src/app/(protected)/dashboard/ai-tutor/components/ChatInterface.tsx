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
  onReferencesUpdate?: (references: Reference[]) => void
}

// 기본 후킹 질문 (API에서 가져오지 못했을 때 사용)
const DEFAULT_HOOKING_QUESTIONS = [
  '이 수업에서 가장 중요한 개념은 무엇인가요?',
  '이 내용을 실생활에 어떻게 적용할 수 있나요?',
  '이 주제와 관련된 최신 연구는 무엇인가요?',
  '이 개념을 더 쉽게 이해하려면 어떻게 해야 하나요?',
]

export function ChatInterface({ selectedLectureIds, sessionId, onSessionCreated, onReferencesUpdate }: ChatInterfaceProps) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [references, setReferences] = useState<Reference[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(sessionId)
  const [skipNextLoad, setSkipNextLoad] = useState(false)  // 다음 로드 건너뛰기 플래그
  const [hookingQuestions, setHookingQuestions] = useState<string[]>(DEFAULT_HOOKING_QUESTIONS)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isInitialMount = useRef(true)  // 초기 마운트 여부

  // lecture_ids 변경 시 후킹 질문 로드 (단일 선택 시에만)
  useEffect(() => {
    const loadHookingQuestions = async () => {
      // 복수 선택이거나 선택 없으면 기본 질문 사용
      if (selectedLectureIds.length !== 1) {
        setHookingQuestions(DEFAULT_HOOKING_QUESTIONS)
        return
      }
      
      try {
        const { data, error } = await chatApi.getHookingByLecture(selectedLectureIds[0])
        if (data && !error) {
          // 후킹 질문이 있으면 해당 질문만 표시
          setHookingQuestions([data.question])
        } else {
          // 후킹 질문이 없으면 기본 질문 사용
          setHookingQuestions(DEFAULT_HOOKING_QUESTIONS)
        }
      } catch (err) {
        console.error('Failed to load hooking questions:', err)
        setHookingQuestions(DEFAULT_HOOKING_QUESTIONS)
      }
    }
    
    loadHookingQuestions()
  }, [selectedLectureIds])

  // 세션 변경 시 메시지 로드
  useEffect(() => {
    // 건너뛰기 플래그가 설정되어 있으면 무시 (새 세션 생성 직후)
    if (skipNextLoad) {
      setSkipNextLoad(false)
      return
    }

    const loadSession = async () => {
      if (sessionId) {
        setIsLoading(true)
        try {
          const { data, error } = await chatApi.getSession(sessionId)
          if (data && !error) {
            const loadedMessages: ChatMessage[] = data.messages.map((m: StoredMessage) => ({
              role: m.role,
              content: m.content,
            }))
            setMessages(loadedMessages)
            setCurrentSessionId(sessionId)
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
  }, [sessionId, skipNextLoad])

  // 메시지 추가 시 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 메시지 전송
  const sendMessage = useCallback(async (question: string) => {
    if (!question.trim() || isLoading || selectedLectureIds.length === 0) return

    setIsLoading(true)
    setError(null)

    // 사용자 메시지 즉시 표시
    const userMessage: ChatMessage = { role: 'user', content: question }
    setMessages(prev => [...prev, userMessage])

    try {
      let response

      if (currentSessionId) {
        // 기존 세션에서 채팅
        const result = await chatApi.sessionChat(currentSessionId, question)
        response = result.data
        if (result.error) throw new Error(result.error.message)
      } else {
        // 새 세션 생성 후 채팅
        const sessionResult = await chatApi.createSession(selectedLectureIds)
        if (sessionResult.error || !sessionResult.data) {
          throw new Error(sessionResult.error?.message || '세션 생성 실패')
        }
        
        const newSessionId = sessionResult.data.id
        setSkipNextLoad(true)  // 다음 useEffect 로드 건너뛰기
        setCurrentSessionId(newSessionId)
        onSessionCreated?.(newSessionId)

        // 세션 내 채팅
        const chatResult = await chatApi.sessionChat(newSessionId, question)
        response = chatResult.data
        if (chatResult.error) throw new Error(chatResult.error.message)
      }

      if (response) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.answer,
        }
        setMessages(prev => [...prev, assistantMessage])
        const newRefs = response.references || []
        setReferences(newRefs)
        onReferencesUpdate?.(newRefs)  // 부모 컴포넌트에 참고자료 전달
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '채팅 중 오류가 발생했습니다'
      setError(errorMessage)
      console.error('Chat error:', err)
      // 실패 시 사용자 메시지 제거
      setMessages(prev => prev.slice(0, -1))
    } finally {
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

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion)
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
            {hookingQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(question)}
                className="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
              >
                <Search className="h-4 w-4 text-gray-400" />
                <span>{question}</span>
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
          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-gray-100 px-4 py-3">
                <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
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
