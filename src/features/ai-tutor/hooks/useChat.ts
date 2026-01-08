/**
 * AI 튜터 채팅 훅
 */
'use client'

import { useState } from 'react'
import { chatService } from '../services/chatService'
import { ChatMessage, Reference } from '../types'

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [references, setReferences] = useState<Reference[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = async (question: string, lectureIds: string[]) => {
    if (!question.trim()) return

    setIsLoading(true)
    setError(null)

    // 사용자 메시지 추가
    const userMessage: ChatMessage = { role: 'user', content: question }
    setMessages(prev => [...prev, userMessage])

    try {
      const { data, error: apiError } = await chatService.chat({
        question,
        lecture_ids: lectureIds,
        chat_history: messages,
      })

      if (apiError || !data) {
        throw new Error(apiError?.message || '채팅 중 오류가 발생했습니다')
      }

      // AI 답변 추가
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.answer,
      }
      setMessages(prev => [...prev, assistantMessage])

      // 참고 데이터 저장
      setReferences(data.references)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '채팅 중 오류가 발생했습니다'
      setError(errorMessage)
      console.error('Chat error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const clearChat = () => {
    setMessages([])
    setReferences([])
    setError(null)
  }

  return {
    messages,
    references,
    isLoading,
    error,
    sendMessage,
    clearChat,
  }
}

