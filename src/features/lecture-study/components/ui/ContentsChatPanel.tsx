/**
 * @file ContentsChatPanel.tsx
 * @description 콘텐츠 학습 AI 채팅 패널 — 세션 관리(새 채팅·목록·전환·삭제) + 질의응답 UI
 * @module features/lecture-study/components/ui
 * @dependencies lectureService, react-markdown
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { History, Loader2, Send, SquarePen, Trash2, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { MarkdownMessage } from '@/features/ai-tutor/components/ui/MarkdownMessage'
import { trackEvent } from '@/shared/lib/analytics'
import { lectureService } from '../../services/lectureService'
import type { ChatSessionItem, QuizContextPayload } from '../../services/lectureService'
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
  const [sessions, setSessions] = useState<ChatSessionItem[]>([])
  /** null = 새 채팅 (첫 전송 시 서버가 세션 lazy 생성) */
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [isSessionListOpen, setIsSessionListOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const sessionListRef = useRef<HTMLDivElement>(null)
  const prevLectureIdRef = useRef<string>('')
  const t = useTranslations('lectureStudy.contentsChat')

  // 페이지 진입 시 최근 세션의 대화 이력 로드
  useEffect(() => {
    if (!lectureId || lectureId === prevLectureIdRef.current) return
    prevLectureIdRef.current = lectureId
    setHistoryLoaded(false)
    setMessages([])
    setSessions([])
    setActiveSessionId(null)

    const load = async () => {
      try {
        const sess = await lectureService.contentsStudyChatSessions(lectureId)
        if (sess.data?.sessions) setSessions(sess.data.sessions)
        const result = await lectureService.contentsStudyChatHistory(lectureId)
        if (result.data?.messages?.length) {
          setMessages(
            result.data.messages.map((m) => ({
              role: m.role,
              content: m.content,
            }))
          )
          setActiveSessionId(result.data.session_id ?? null)
        }
      } finally {
        setHistoryLoaded(true)
      }
    }
    void load()
  }, [lectureId])

  // 세션 목록 드롭다운 바깥 클릭 시 닫기
  useEffect(() => {
    if (!isSessionListOpen) return
    const close = (e: MouseEvent) => {
      if (!sessionListRef.current?.contains(e.target as Node)) setIsSessionListOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [isSessionListOpen])

  const refreshSessions = useCallback(() => {
    lectureService.contentsStudyChatSessions(lectureId).then((sess) => {
      if (sess.data?.sessions) setSessions(sess.data.sessions)
    }).catch(() => {})
  }, [lectureId])

  // 새 채팅 — 화면 비우고 세션 미지정 (첫 전송 시 서버가 생성)
  const handleNewChat = useCallback(() => {
    if (isLoading) return
    setActiveSessionId(null)
    setMessages([])
    setIsSessionListOpen(false)
    inputRef.current?.focus()
    trackEvent('chat_new_session', 'lecture_study', { lectureId })
  }, [isLoading, lectureId])

  // 세션 전환 — 해당 세션 이력 로드
  const handleSelectSession = useCallback((sessionId: string) => {
    if (isLoading || sessionId === activeSessionId) {
      setIsSessionListOpen(false)
      return
    }
    setIsSessionListOpen(false)
    setActiveSessionId(sessionId)
    setMessages([])
    setHistoryLoaded(false)
    lectureService.contentsStudyChatHistory(lectureId, sessionId).then((result) => {
      if (result.data?.messages) {
        setMessages(result.data.messages.map((m) => ({ role: m.role, content: m.content })))
      }
      setHistoryLoaded(true)
    }).catch(() => setHistoryLoaded(true))
    trackEvent('chat_switch_session', 'lecture_study', { lectureId })
  }, [isLoading, activeSessionId, lectureId])

  // 세션 삭제 — 활성 세션이면 새 채팅 상태로
  const handleDeleteSession = useCallback((sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm(t('sessionDeleteConfirm'))) return
    lectureService.contentsStudyDeleteChatSession(sessionId).then(() => {
      setSessions((prev) => prev.filter((s) => s.session_id !== sessionId))
      if (sessionId === activeSessionId) {
        setActiveSessionId(null)
        setMessages([])
      }
    }).catch(() => {})
    trackEvent('chat_delete_session', 'lecture_study', { lectureId })
  }, [activeSessionId, lectureId, t])

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
          // 서술형은 choices가 없고 modelAnswer로 대체
          ...(quizChatContext.choices ? { choices: quizChatContext.choices } : {}),
          ...(quizChatContext.modelAnswer ? { model_answer: quizChatContext.modelAnswer } : {}),
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
      const result = await lectureService.contentsStudyChat(question, lectureId, quizPayload, activeSessionId)
      if (result.data?.answer) {
        setMessages(prev => [...prev, { role: 'assistant', content: result.data!.answer }])
        // 새 세션이 lazy 생성된 경우 이어받기 + 목록 갱신
        if (result.data.session_id && result.data.session_id !== activeSessionId) {
          setActiveSessionId(result.data.session_id)
        }
        refreshSessions()
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: t('errorGenerate') }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: t('errorGeneral') }])
    } finally {
      setIsLoading(false)
      scrollToBottom()
    }
  }, [input, isLoading, lectureId, quizChatContext, onClearQuizContext, scrollToBottom, t, activeSessionId, refreshSessions])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit])

  const activeTitle = sessions.find((s) => s.session_id === activeSessionId)?.title

  return (
    <div className="flex h-full flex-col">
      {/* Session toolbar */}
      <div className="relative flex shrink-0 items-center gap-1 border-b border-gray-200 dark:border-gray-700 px-2 py-1.5">
        <div ref={sessionListRef} className="relative min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setIsSessionListOpen((v) => !v)}
            className="flex w-full min-w-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={t('sessionList')}
          >
            <History className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span className="truncate">
              {/* 활성 대화의 제목. 아직 세션이 없으면 우측 '새 채팅' 버튼과 문구가 겹치므로
                  드롭다운의 정체(대화 목록)를 그대로 라벨로 쓴다. */}
              {activeSessionId ? (activeTitle || t('sessionUntitled')) : t('sessionList')}
            </span>
          </button>

          {isSessionListOpen && (
            <div className="absolute left-0 top-full z-20 mt-1 max-h-64 w-72 max-w-[80vw] overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-1 shadow-lg">
              {sessions.length === 0 ? (
                <p className="px-3 py-2 text-xs text-gray-400">{t('sessionEmpty')}</p>
              ) : (
                sessions.map((s) => (
                  <div
                    key={s.session_id}
                    onClick={() => handleSelectSession(s.session_id)}
                    className={`group flex cursor-pointer items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      s.session_id === activeSessionId
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate">{s.title || t('sessionUntitled')}</span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSession(s.session_id, e)}
                      className="shrink-0 rounded p-1 text-gray-400 opacity-0 transition-opacity hover:bg-gray-200 hover:text-red-500 dark:hover:bg-gray-600 group-hover:opacity-100"
                      aria-label={t('sessionDelete')}
                      title={t('sessionDelete')}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleNewChat}
          disabled={isLoading}
          className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors disabled:opacity-40"
          title={t('newChat')}
        >
          <SquarePen className="h-3.5 w-3.5" />
          {t('newChat')}
        </button>
      </div>

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
