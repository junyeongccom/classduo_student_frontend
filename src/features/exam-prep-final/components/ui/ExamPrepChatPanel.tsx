/**
 * @file ExamPrepChatPanel.tsx
 * @description 핵심테스트(core/mid/final) 풀이 화면 AI 챗봇 패널
 * @module features/exam-prep-final/components/ui
 * @dependencies examPrepChatService, react-markdown, useExamPrepSolveStore
 *
 * ContentsChatPanel(콘텐츠 학습)과 동일한 UX 를 제공하되,
 * fetch 함수 / DB 분리 / 문항 메타 페이로드만 핵심테스트용으로 교체.
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, Send, X } from 'lucide-react'
import { MarkdownMessage } from '@/features/ai-tutor/components/ui/MarkdownMessage'
import { trackEvent } from '@/shared/lib/analytics'
import {
  examPrepChat,
  examPrepChatHistory,
  type ExamPrepQuizContextPayload,
} from '../../services/examPrepChatService'
import type { ExamPrepQuizChatContext } from '../../store/useExamPrepSolveStore'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ExamPrepChatPanelProps {
  testId: string
  /** 현재 풀고 있는 문항의 source_lecture_id (RAG 컨텍스트용, 없으면 자료 없이 응답) */
  currentLectureId: string | null
  quizChatContext: ExamPrepQuizChatContext | null
  onClearQuizContext: () => void
}

export function ExamPrepChatPanel({
  testId,
  currentLectureId,
  quizChatContext,
  onClearQuizContext,
}: ExamPrepChatPanelProps) {
  const t = useTranslations('examPrepFinal')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const prevTestIdRef = useRef<string>('')

  // testId 변경 시 히스토리 재로드 + 초기화
  useEffect(() => {
    if (!testId || testId === prevTestIdRef.current) return
    prevTestIdRef.current = testId
    setHistoryLoaded(false)
    setMessages([])

    examPrepChatHistory(testId).then((result) => {
      if (result.data?.messages?.length) {
        setMessages(
          result.data.messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        )
      }
      setHistoryLoaded(true)
    }).catch(() => {
      setHistoryLoaded(true)
    })
  }, [testId])

  useEffect(() => {
    if (historyLoaded && messages.length > 0) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current!.scrollHeight })
      })
    }
  }, [historyLoaded, messages.length])

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current!.scrollHeight, behavior: 'smooth' })
    })
  }, [])

  const handleSubmit = useCallback(async () => {
    const question = input.trim()
    if (!question || isLoading) return

    const quizPayload: ExamPrepQuizContextPayload | undefined = quizChatContext
      ? {
          seq: quizChatContext.seq,
          test_label: quizChatContext.testLabel,
          stem: quizChatContext.stem,
          options: quizChatContext.options,
          answer: quizChatContext.answer,
          explanation: quizChatContext.explanation,
          hint: quizChatContext.hint,
        }
      : undefined

    const badgePrefix = quizChatContext
      ? `[${quizChatContext.courseTitle} ${quizChatContext.testLabel} #Q${quizChatContext.seq}] `
      : ''
    const displayQuestion = badgePrefix + question

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: displayQuestion }])
    if (quizChatContext) onClearQuizContext()
    setIsLoading(true)
    scrollToBottom()

    trackEvent('chat_message', 'exam_prep_solve', {
      data: {
        message_length: question.length,
        question_type: 'exam_prep_chat',
        test_id: testId,
      },
    })

    try {
      const result = await examPrepChat({
        question,
        testId,
        lectureId: currentLectureId,
        quizContext: quizPayload,
      })
      if (result.data?.answer) {
        setMessages((prev) => [...prev, { role: 'assistant', content: result.data!.answer }])
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: t('chat.answerFailed') },
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: t('chat.tempError') },
      ])
    } finally {
      setIsLoading(false)
      scrollToBottom()
    }
  }, [input, isLoading, testId, currentLectureId, quizChatContext, onClearQuizContext, scrollToBottom, t])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // 한글(IME) 조합 중 Enter 가드 — 조합 중에는 keydown 의 keyCode 가 229.
      // 이 가드가 없으면 마지막 글자 조합이 끝나기 전에 submit→setInput('') 이 돌고,
      // 직후 compositionend 가 마지막 글자를 입력바에 되살려 "마지막 글자 잔류" 버그가 난다.
      if (e.nativeEvent.isComposing || e.keyCode === 229) return
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit],
  )

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-gray-400">
            <p className="text-sm text-center whitespace-pre-line">
              {t('chat.introPrompt')}
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#6366F1] text-white rounded-br-md'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-md'
              }`}
            >
              {msg.role === 'assistant' ? (
                <MarkdownMessage
                  markdown={msg.content}
                  className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                />
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
              <span className="text-sm text-gray-400">{t('chat.generating')}</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 p-3">
        {quizChatContext && (
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1 text-xs font-medium">
              {`${quizChatContext.testLabel} #Q${quizChatContext.seq}`}
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
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              quizChatContext
                ? t('chat.placeholderWithQuestion')
                : t('chat.placeholderGeneral')
            }
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none max-h-24 overflow-y-auto"
            style={{ minHeight: '1.5rem' }}
            onInput={(e) => {
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
