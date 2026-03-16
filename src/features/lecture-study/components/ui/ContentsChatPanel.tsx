/**
 * @file ContentsChatPanel.tsx
 * @description 콘텐츠 학습 AI 채팅 패널 — 단발 질의응답 UI
 * @module features/lecture-study/components/ui
 * @dependencies lectureService, react-markdown
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Send, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { MarkdownMessage } from '@/features/ai-tutor/components/ui/MarkdownMessage'
import { trackEvent } from '@/shared/lib/analytics'
import { lectureService } from '../../services/lectureService'
import type { QuizContextPayload } from '../../services/lectureService'
import type { QuizChatContext } from '../../store/useLectureStudyStore'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ContentsChatPanelProps {
  lectureId: string
  quizChatContext: QuizChatContext | null
  onClearQuizContext: () => void
}

export function ContentsChatPanel({ lectureId, quizChatContext, onClearQuizContext }: ContentsChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const prevLectureIdRef = useRef<string>('')
  const t = useTranslations('lectureStudy.contentsChat')

  // 페이지 진입 시 최근 대화 이력 로드
  useEffect(() => {
    if (!lectureId || lectureId === prevLectureIdRef.current) return
    prevLectureIdRef.current = lectureId
    setHistoryLoaded(false)
    setMessages([])

    lectureService.contentsStudyChatHistory(lectureId).then((result) => {
      if (result.data?.messages?.length) {
        setMessages(
          result.data.messages.map((m) => ({
            role: m.role,
            content: m.content,
          }))
        )
      }
      setHistoryLoaded(true)
    }).catch(() => {
      setHistoryLoaded(true)
    })
  }, [lectureId])

  // 히스토리 로드 후 스크롤
  useEffect(() => {
    if (historyLoaded && messages.length > 0) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current!.scrollHeight })
      })
    }
  }, [historyLoaded, messages.length])

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    })
  }, [])

  const handleSubmit = useCallback(async () => {
    const question = input.trim()
    if (!question || isLoading) return

    const quizPayload: QuizContextPayload | undefined = quizChatContext
      ? {
          quiz_id: quizChatContext.quizId,
          question: quizChatContext.question,
          explanation: quizChatContext.explanation,
          choices: quizChatContext.choices,
          source: quizChatContext.source,
        }
      : undefined

    // 퀴즈 컨텍스트가 있으면 배지 텍스트를 질문 앞에 붙여 표시
    const badgePrefix = quizChatContext
      ? `[${t('quizChatBadge', {
          courseTitle: quizChatContext.courseTitle,
          weekNumber: quizChatContext.weekNumber,
          sessionNumber: String(quizChatContext.sessionNumber).padStart(2, '0'),
          quizNumber: quizChatContext.quizIndex + 1,
        })}] `
      : ''
    const displayQuestion = badgePrefix + question

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: displayQuestion }])
    // 전송 후 배지 제거 (1회성)
    if (quizChatContext) onClearQuizContext()
    setIsLoading(true)
    scrollToBottom()

    // Analytics: 콘텐츠형 학습 채팅 메시지 트래킹
    trackEvent('chat_message', 'lecture_study', { lectureId, data: { message_length: question.length, question_type: 'content_study_chat' } })

    try {
      const result = await lectureService.contentsStudyChat(question, lectureId, quizPayload)
      if (result.data?.answer) {
        setMessages(prev => [...prev, { role: 'assistant', content: result.data!.answer }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: t('errorGenerate') }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: t('errorGeneral') }])
    } finally {
      setIsLoading(false)
      scrollToBottom()
    }
  }, [input, isLoading, lectureId, quizChatContext, onClearQuizContext, scrollToBottom, t])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit])

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-gray-400">
            <p className="text-sm text-center whitespace-pre-line">{t('emptyHint')}</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#6366F1] text-white rounded-br-md'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-md'
              }`}
            >
              {msg.role === 'assistant' ? (
                <MarkdownMessage markdown={msg.content} className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0" />
              ) : (
                <span className="whitespace-pre-wrap">{msg.content}</span>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-gray-100 dark:bg-gray-800 px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              <span className="text-sm text-gray-400">{t('generating')}</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 p-3">
        {/* Quiz context badge */}
        {quizChatContext && (
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1 text-xs font-medium">
              {t('quizChatBadge', {
                courseTitle: quizChatContext.courseTitle,
                weekNumber: quizChatContext.weekNumber,
                sessionNumber: String(quizChatContext.sessionNumber).padStart(2, '0'),
                quizNumber: quizChatContext.quizIndex + 1,
              })}
              <button
                type="button"
                onClick={onClearQuizContext}
                className="ml-1 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800 p-0.5 transition-colors"
                aria-label="close"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          </div>
        )}
        <div className="flex items-end gap-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={quizChatContext ? t('quizChatPlaceholder') : t('inputPlaceholder')}
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none max-h-24 overflow-y-auto"
            style={{ minHeight: '1.5rem' }}
            onInput={e => {
              const el = e.currentTarget
              el.style.height = '0'
              el.style.height = Math.min(el.scrollHeight, 96) + 'px'
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#6366F1] text-white transition-colors hover:bg-[#4F46E5] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
