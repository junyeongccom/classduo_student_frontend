/**
 * AI 튜터 채팅 인터페이스 (GPT 스타일 + 세션 관리)
 */
'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, Search, ArrowUp } from 'lucide-react'
import { chatService } from '@/features/ai-tutor/services/chatService'
import { ChatMessage, StoredMessage, Reference, PQMQuestion, ChatMode } from '@/features/ai-tutor/types'
import { useI18n } from '@/shared/i18n/I18nProvider'
import type { AppLocale } from '@/shared/i18n/I18nProvider'
import { reviewService } from '@/features/review'
import { AnswerLoadingReviewBanner } from '../ui/AnswerLoadingReviewBanner'
import { useAITutorStore } from '@/features/ai-tutor/store/useAITutorStore'
import { useCardMatchSet } from '@/features/ai-tutor/hooks/useCardMatchSet'
import { CardMatchGame } from '@/features/ai-tutor/components/ui/CardMatchGame'
import { ChatComposer } from '../ui/ChatComposer'

// 마크다운 렌더링 헬퍼 함수 (ChatGPT 스타일)
function renderMarkdown(text: string) {
  const lines = text.split('\n')
  const elements: JSX.Element[] = []
  let currentParagraph: string[] = []
  let inCodeBlock = false
  let codeBlockContent: string[] = []
  let inList = false
  let listItems: string[] = []

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const paragraphText = currentParagraph.join('\n')
      if (paragraphText.trim()) {
        elements.push(
          <p key={elements.length} className="mb-2 last:mb-0 leading-snug text-sm">
            {parseInlineMarkdown(paragraphText)}
          </p>
        )
      }
      currentParagraph = []
    }
  }

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={elements.length} className="list-disc ml-5 mb-2 space-y-0.5">
          {listItems.map((item, idx) => (
            <li key={idx} className="leading-snug text-sm">
              {parseInlineMarkdown(item)}
            </li>
          ))}
        </ul>
      )
      listItems = []
      inList = false
    }
  }

  const parseBold = (text: string, keyPrefix: string) => {
    const parts: (string | JSX.Element)[] = []
    const boldRegex = /\*\*(.+?)\*\*/g
    let lastIndex = 0
    let match
    let keyCounter = 0

    // **bold** 처리
    while ((match = boldRegex.exec(text)) !== null) {
      // 볼드 이전 텍스트
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index))
      }
      // 볼드 텍스트
      parts.push(
        <strong key={`${keyPrefix}-bold-${keyCounter++}`} className="font-semibold text-gray-900">
          {match[1]}
        </strong>
      )
      lastIndex = match.index + match[0].length
    }

    // 남은 텍스트
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex))
    }

    return parts.length > 0 ? parts : [text]
  }

  const parseInlineMarkdown = (text: string): (string | JSX.Element)[] => {
    return parseBold(text, 'inline')
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmedLine = line.trim()

    // 마크다운 구분선(---) 무시 (3개 이상의 하이픈만)
    if (/^---+$/.test(trimmedLine)) {
      continue
    }

    // 코드 블록 처리
    if (trimmedLine.startsWith('```')) {
      if (inCodeBlock) {
        // 코드 블록 종료
        flushParagraph()
        flushList()
        elements.push(
          <pre key={elements.length} className="bg-gray-100 rounded-lg p-3 my-2 overflow-x-auto border border-gray-200">
            <code className="text-xs text-gray-800 font-mono leading-snug">{codeBlockContent.join('\n')}</code>
          </pre>
        )
        codeBlockContent = []
        inCodeBlock = false
      } else {
        // 코드 블록 시작
        flushParagraph()
        flushList()
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      codeBlockContent.push(line)
      continue
    }

    // 헤딩 처리 (학생에게 ### 노출 방지)
    if (trimmedLine.startsWith('### ')) {
      flushParagraph()
      flushList()
      elements.push(
        <h3 key={elements.length} className="mb-2 text-base font-semibold text-gray-900">
          {parseInlineMarkdown(trimmedLine.replace(/^###\s+/, ''))}
        </h3>
      )
      continue
    }
    if (trimmedLine.startsWith('## ')) {
      flushParagraph()
      flushList()
      elements.push(
        <h2 key={elements.length} className="mb-2 text-lg font-semibold text-gray-900">
          {parseInlineMarkdown(trimmedLine.replace(/^##\s+/, ''))}
        </h2>
      )
      continue
    }

    // 헤딩 처리 (3가지 크기: 대제목, 소제목, 내용)
    if (trimmedLine.startsWith('### ')) {
      flushParagraph()
      flushList()
      const headingText = trimmedLine.replace(/^###\s+/, '')
      elements.push(
        <h3 key={elements.length} className="text-sm font-semibold mb-1.5 mt-3 first:mt-0 text-gray-900">
          {parseInlineMarkdown(headingText)}
        </h3>
      )
      continue
    }

    if (trimmedLine.startsWith('## ')) {
      flushParagraph()
      flushList()
      const headingText = trimmedLine.replace(/^##\s+/, '')
      elements.push(
        <h2 key={elements.length} className="text-base font-bold mb-2 mt-4 first:mt-0 text-gray-900">
          {parseInlineMarkdown(headingText)}
        </h2>
      )
      continue
    }

    if (trimmedLine.startsWith('# ')) {
      flushParagraph()
      flushList()
      const headingText = trimmedLine.replace(/^#\s+/, '')
      elements.push(
        <h1 key={elements.length} className="text-lg font-bold mb-2.5 mt-4 first:mt-0 text-gray-900">
          {parseInlineMarkdown(headingText)}
        </h1>
      )
      continue
    }

    // 리스트 항목 처리
    if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
      flushParagraph()
      if (!inList) {
        inList = true
      }
      const listText = trimmedLine.replace(/^[-*]\s+/, '')
      listItems.push(listText)
      continue
    }

    // 빈 줄 처리
    if (trimmedLine === '') {
      flushParagraph()
      flushList()
      continue
    }

    // 일반 텍스트
    if (inList) {
      flushList()
    }
    currentParagraph.push(line)
  }

  flushParagraph()
  flushList()

  return <div className="markdown-content">{elements}</div>
}

interface ChatInterfaceProps {
  selectedLectureIds: string[]
  sessionId?: string
  onSessionCreated?: (sessionId: string | undefined) => void
  onReferencesUpdate?: (messageIndex: number, references: Reference[]) => void
  onLectureIdsLoaded?: (lectureIds: string[]) => void // 세션 로드 시 lecture_ids 전달
  onMessagesUpdate?: (messages: ChatMessage[]) => void // 메시지 배열 업데이트
  onShowReferencePanel?: (type: 'notes' | 'materials') => void
}

export function ChatInterface({ selectedLectureIds, sessionId, onSessionCreated, onReferencesUpdate, onLectureIdsLoaded, onMessagesUpdate, onShowReferencePanel }: ChatInterfaceProps) {
  const t = useTranslations('aiTutorChat')
  const { locale } = useI18n()
  const { hookingByLocale, pqmByLocale, reviewKeyAnswersByLocale, setHookingCache, setPqmCache, setReviewKeyAnswersCache, setIsRecordingSourceDisabled } = useAITutorStore(state => ({
    hookingByLocale: state.hookingByLocale,
    pqmByLocale: state.pqmByLocale,
    reviewKeyAnswersByLocale: state.reviewKeyAnswersByLocale,
    setHookingCache: state.setHookingCache,
    setPqmCache: state.setPqmCache,
    setReviewKeyAnswersCache: state.setReviewKeyAnswersCache,
    setIsRecordingSourceDisabled: state.setIsRecordingSourceDisabled,
  }))
  
  // 기본 후킹 질문 (API에서 가져오지 못했을 때 사용)
  const DEFAULT_HOOKING_QUESTIONS = [
    t('defaultHookingQuestions.importantConcept'),
    t('defaultHookingQuestions.realLifeApplication'),
    t('defaultHookingQuestions.latestResearch'),
    t('defaultHookingQuestions.easierUnderstanding'),
  ]
  const [input, setInput] = useState('')
  const [chatMode, setChatMode] = useState<ChatMode>('simple')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [pendingReferences, setPendingReferences] = useState<{ messageIndex: number; refs: Reference[] } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  // 타이핑 애니메이션 상태: 메시지 인덱스 -> 현재 표시된 텍스트 길이
  const [typingProgress, setTypingProgress] = useState<Map<number, number>>(new Map())
  // 타이핑 완료 상태: 메시지 인덱스 -> 타이핑 완료 여부
  const [typingComplete, setTypingComplete] = useState<Map<number, boolean>>(new Map())
  const [reviewKeyAnswers, setReviewKeyAnswers] = useState<string[]>([])
  const [isReviewAnswersLoading, setIsReviewAnswersLoading] = useState(false)
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
  const [hookingQuestions, setHookingQuestions] = useState<Array<{ id?: string; question: string; answer?: string; reference_data?: Reference[] | null; summary_keywords?: string | null; summary_keywords_eng?: string | null }>>(
    DEFAULT_HOOKING_QUESTIONS.map(q => ({ question: q }))
  )
  const [pqmQuestions, setPQMQuestions] = useState<PQMQuestion[]>([])
  const [isInputFocused, setIsInputFocused] = useState(false) // 입력창 포커스 상태
  const [cardMatchState, setCardMatchState] = useState<'idle' | 'hidden' | 'completed'>('idle')
  const [showSuccess, setShowSuccess] = useState(false)
  const [successFading, setSuccessFading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isInitialMount = useRef(true)  // 초기 마운트 여부
  const selfCreatedSessionId = useRef<string | undefined>(undefined)  // 자신이 생성한 세션 ID
  const prevLectureIdsRef = useRef<string[]>([]) // 이전 강의회차 선택 상태
  const successFadeTimerRef = useRef<number | null>(null)
  const successHideTimerRef = useRef<number | null>(null)

  const singleLectureId = selectedLectureIds.length === 1 ? selectedLectureIds[0] : null
  const { data: cardMatchSet, isLoading: isCardMatchLoading } = useCardMatchSet(singleLectureId)

  const clearSuccessTimers = useCallback(() => {
    if (successFadeTimerRef.current) {
      window.clearTimeout(successFadeTimerRef.current)
      successFadeTimerRef.current = null
    }
    if (successHideTimerRef.current) {
      window.clearTimeout(successHideTimerRef.current)
      successHideTimerRef.current = null
    }
  }, [])

  // 강의회차 선택 시 카드매칭 상태 초기화
  useEffect(() => {
    // 강의회차가 선택되지 않은 상태에서 선택된 상태로 변경될 때 로드 상태 초기화
    if (prevLectureIdsRef.current.length === 0 && selectedLectureIds.length > 0) {
      setCardMatchState(selectedLectureIds.length === 1 ? 'idle' : 'hidden')
      setShowSuccess(false)
      setSuccessFading(false)
      clearSuccessTimers()
    }
    if (selectedLectureIds.length === 0) {
      setCardMatchState('hidden')
      setShowSuccess(false)
      setSuccessFading(false)
      clearSuccessTimers()
    }
    // 강의회차 선택이 변경될 때마다 로드 상태 초기화 (다른 회차 선택 시)
    else if (prevLectureIdsRef.current.length > 0 && selectedLectureIds.length > 0) {
      // 선택된 회차가 실제로 변경되었는지 확인
      const prevIds = prevLectureIdsRef.current.sort().join(',')
      const currentIds = selectedLectureIds.sort().join(',')
      if (prevIds !== currentIds) {
        setCardMatchState(selectedLectureIds.length === 1 ? 'idle' : 'hidden')
        setShowSuccess(false)
        setSuccessFading(false)
        clearSuccessTimers()
      }
    }
    prevLectureIdsRef.current = [...selectedLectureIds]
  }, [clearSuccessTimers, selectedLectureIds])

  useEffect(() => {
    return () => {
      clearSuccessTimers()
    }
  }, [clearSuccessTimers])

  // 로딩 중 복습 정답 조회 (locale 캐시 스위치)
  useEffect(() => {
    if (!isLoading || selectedLectureIds.length === 0) return

    const lectureKey = [...selectedLectureIds].sort().join(',')
    const cached = reviewKeyAnswersByLocale[locale]?.[lectureKey]
    if (cached) {
      setReviewKeyAnswers(cached)
    }

    let cancelled = false
    const loadAnswers = async (targetLocale: AppLocale, updateState: boolean) => {
      if (updateState) {
        setIsReviewAnswersLoading(true)
      }
      try {
        const { data, error } = await reviewService.getKeyAnswersByLectures(selectedLectureIds, targetLocale)
        if (cancelled) return
        if (data && !error) {
          const answers = data.flatMap(item => item.key_answers).filter(Boolean)
          setReviewKeyAnswersCache(targetLocale, lectureKey, answers)
          if (updateState) {
            setReviewKeyAnswers(answers)
          }
        } else if (updateState) {
          setReviewKeyAnswers([])
        }
      } catch {
        if (!cancelled && updateState) setReviewKeyAnswers([])
      } finally {
        if (!cancelled && updateState) setIsReviewAnswersLoading(false)
      }
    }

    if (!cached) {
      loadAnswers(locale, true)
    }

    const oppositeLocale: AppLocale = locale === 'ko' ? 'en' : 'ko'
    if (!reviewKeyAnswersByLocale[oppositeLocale]?.[lectureKey]) {
      loadAnswers(oppositeLocale, false)
    }

    return () => {
      cancelled = true
    }
  }, [isLoading, selectedLectureIds, locale, reviewKeyAnswersByLocale, setReviewKeyAnswersCache])

  // lecture_ids/locale 변경 시 후킹 질문과 PQM 질문 로드 (단일 선택 시에만)
  useEffect(() => {
    if (selectedLectureIds.length !== 1) {
      setHookingQuestions([])
      setPQMQuestions([])
      return
    }

    const lectureId = selectedLectureIds[0]
    const cachedHooking = hookingByLocale[locale]?.[lectureId]
    const cachedPqm = pqmByLocale[locale]?.[lectureId]

    if (cachedHooking) {
      setHookingQuestions([{
        id: cachedHooking.id,
        question: cachedHooking.question,
        answer: cachedHooking.answer,
        reference_data: cachedHooking.reference_data || null,
        summary_keywords: cachedHooking.summary_keywords || null,
        summary_keywords_eng: cachedHooking.summary_keywords_eng || null
      }])
    } else if (cachedHooking === null) {
      setHookingQuestions(DEFAULT_HOOKING_QUESTIONS.map(q => ({ question: q })))
    }

    if (cachedPqm) {
      setPQMQuestions(cachedPqm)
    } else if (cachedPqm === undefined) {
      setPQMQuestions([])
    }

    const loadQuestions = async (targetLocale: AppLocale, updateState: boolean) => {
      const [hookingResult, pqmResult] = await Promise.allSettled([
        chatService.getHookingByLecture(lectureId, targetLocale),
        chatService.getPQMQuestionsByLecture(lectureId, targetLocale)
      ])

      if (hookingResult.status === 'fulfilled') {
        const { data, error } = hookingResult.value
        if (data && !error) {
          setHookingCache(targetLocale, lectureId, data)
          if (updateState) {
            setHookingQuestions([{
              id: data.id,
              question: data.question,
              answer: data.answer,
              reference_data: data.reference_data || null,
              summary_keywords: data.summary_keywords || null,
              summary_keywords_eng: data.summary_keywords_eng || null
            }])
          }
        } else {
          setHookingCache(targetLocale, lectureId, null)
          if (updateState) {
            setHookingQuestions(DEFAULT_HOOKING_QUESTIONS.map(q => ({ question: q })))
          }
        }
      } else {
        if (updateState) {
          setHookingQuestions(DEFAULT_HOOKING_QUESTIONS.map(q => ({ question: q })))
        }
      }

      if (pqmResult.status === 'fulfilled') {
        const { data, error } = pqmResult.value
        if (data && !error && data.length > 0) {
          setPqmCache(targetLocale, lectureId, data)
          if (updateState) {
            setPQMQuestions(data)
          }
        } else {
          setPqmCache(targetLocale, lectureId, [])
          if (updateState) {
            setPQMQuestions([])
          }
        }
      } else if (updateState) {
        setPQMQuestions([])
      }
    }

    if (cachedHooking === undefined || cachedPqm === undefined) {
      loadQuestions(locale, true)
    }

    const oppositeLocale: AppLocale = locale === 'ko' ? 'en' : 'ko'
    if (!hookingByLocale[oppositeLocale]?.[lectureId] || !pqmByLocale[oppositeLocale]?.[lectureId]) {
      loadQuestions(oppositeLocale, false)
    }
  }, [selectedLectureIds, locale, hookingByLocale, pqmByLocale, setHookingCache, setPqmCache])

  // 컴포넌트 마운트 시 세션 확인 (페이지 복귀 시 작업 완료 확인)
  useEffect(() => {
    const checkSessionOnMount = async () => {
      // currentSessionId가 있고, 메시지가 없거나 적을 때 세션 확인
      if (currentSessionId && messages.length === 0) {
        try {
          const { data, error } = await chatService.getSession(currentSessionId)
          if (data && !error && data.messages.length > 0) {
            const loadedMessages: Array<ChatMessage & { summary_keywords?: string | null; follow_up_question?: string | null }> = data.messages.map((m: StoredMessage) => {
              let followUpQuestion: string | null = null
              if (m.reference_data && Array.isArray(m.reference_data) && m.reference_data.length > 0) {
                const firstRef = m.reference_data[0]
                if (firstRef && typeof firstRef === 'object' && '_meta' in firstRef) {
                  const meta = (firstRef as any)._meta
                  if (meta && meta.follow_up_question) {
                    followUpQuestion = meta.follow_up_question
                  }
                }
              }
              
              return {
                role: m.role,
                content: m.content,
                summary_keywords: m.summary_keywords || null,
                follow_up_question: followUpQuestion,
              }
            })
            
            setMessages(loadedMessages)
            
            // 타이핑 완료 상태 설정
            const completeMap = new Map<number, boolean>()
            const progressMap = new Map<number, number>()
            loadedMessages.forEach((msg, idx) => {
              if (msg.role === 'assistant') {
                completeMap.set(idx, true)
                progressMap.set(idx, msg.content.length)
              }
            })
            setTypingComplete(completeMap)
            setTypingProgress(progressMap)
            
            // 참고자료 복원
            loadedMessages.forEach((msg, idx) => {
              if (msg.role === 'assistant' && data.messages[idx]?.reference_data) {
                const refs = data.messages[idx].reference_data as Reference[]
                if (refs && refs.length > 0 && onReferencesUpdate) {
                  onReferencesUpdate(idx, refs)
                }
              }
            })
          }
        } catch (err) {
          console.error('Failed to check session on mount:', err)
        }
      }
    }
    
    // 약간의 지연 후 확인 (다른 useEffect가 먼저 실행되도록)
    const timer = setTimeout(checkSessionOnMount, 100)
    
    return () => clearTimeout(timer)
  }, []) // 마운트 시에만 실행

  // 페이지 복귀 시 세션 자동 로드 (작업 완료 확인)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      // 페이지가 다시 보이고, 세션이 있고, 로딩 중이 아닐 때만
      if (document.visibilityState === 'visible' && currentSessionId && !isLoading) {
        try {
          const { data, error } = await chatService.getSession(currentSessionId)
          if (data && !error) {
            // 현재 메시지 수와 로드된 메시지 수 비교
            const loadedMessages: Array<ChatMessage & { summary_keywords?: string | null; follow_up_question?: string | null }> = data.messages.map((m: StoredMessage) => {
              let followUpQuestion: string | null = null
              if (m.reference_data && Array.isArray(m.reference_data) && m.reference_data.length > 0) {
                const firstRef = m.reference_data[0]
                if (firstRef && typeof firstRef === 'object' && '_meta' in firstRef) {
                  const meta = (firstRef as any)._meta
                  if (meta && meta.follow_up_question) {
                    followUpQuestion = meta.follow_up_question
                  }
                }
              }
              
              return {
                role: m.role,
                content: m.content,
                summary_keywords: m.summary_keywords || null,
                follow_up_question: followUpQuestion,
              }
            })
            
            // 메시지가 추가되었거나 변경되었으면 업데이트
            if (loadedMessages.length !== messages.length || 
                JSON.stringify(loadedMessages) !== JSON.stringify(messages)) {
              setMessages(loadedMessages)
              
              // 타이핑 완료 상태 설정
              const completeMap = new Map<number, boolean>()
              const progressMap = new Map<number, number>()
              loadedMessages.forEach((msg, idx) => {
                if (msg.role === 'assistant') {
                  completeMap.set(idx, true)
                  progressMap.set(idx, msg.content.length)
                }
              })
              setTypingComplete(completeMap)
              setTypingProgress(progressMap)
              
              // 참고자료 복원
              loadedMessages.forEach((msg, idx) => {
                if (msg.role === 'assistant' && data.messages[idx]?.reference_data) {
                  const refs = data.messages[idx].reference_data as Reference[]
                  if (refs && refs.length > 0 && onReferencesUpdate) {
                    onReferencesUpdate(idx, refs)
                  }
                }
              })
            }
          }
        } catch (err) {
          console.error('Failed to reload session on visibility change:', err)
        }
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [currentSessionId, isLoading, messages, onReferencesUpdate])

  // 세션 변경 시 메시지 로드
  useEffect(() => {
    const loadSession = async () => {
      if (sessionId) {
        // 자신이 방금 생성한 세션이면 로드 건너뛰기
        if (selfCreatedSessionId.current === sessionId) {
          selfCreatedSessionId.current = undefined  // 플래그 초기화
          return
        }
        
        // 메시지 전송 중이면 로드 건너뛰기 (사용자 메시지가 사라지는 것을 방지)
        if (isLoading) {
          return
        }
        
        setIsLoading(true)
        try {
          const { data, error } = await chatService.getSession(sessionId)
          if (data && !error) {
            // 메시지 로드 (summary_keywords, follow_up_question 포함)
            const loadedMessages: Array<ChatMessage & { summary_keywords?: string | null; follow_up_question?: string | null }> = data.messages.map((m: StoredMessage) => {
              // reference_data에서 follow_up_question 추출 (첫 번째 reference의 _meta에서)
              let followUpQuestion: string | null = null
              if (m.reference_data && Array.isArray(m.reference_data) && m.reference_data.length > 0) {
                const firstRef = m.reference_data[0]
                if (firstRef && typeof firstRef === 'object' && '_meta' in firstRef) {
                  const meta = (firstRef as any)._meta
                  if (meta && meta.follow_up_question) {
                    followUpQuestion = meta.follow_up_question
                  }
                }
              }
              
              return {
                role: m.role,
                content: m.content,
                summary_keywords: m.summary_keywords || null,
                follow_up_question: followUpQuestion,
              }
            })
            setMessages(loadedMessages)
            setCurrentSessionId(sessionId)
            
            // 기존 메시지들은 타이핑 완료 상태로 설정
            const completeMap = new Map<number, boolean>()
            const progressMap = new Map<number, number>()
            loadedMessages.forEach((msg, index) => {
              if (msg.role === 'assistant') {
                completeMap.set(index, true)
                progressMap.set(index, msg.content.length)
              }
            })
            setTypingComplete(completeMap)
            setTypingProgress(progressMap)
            
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
              // lecture_ids가 배열이 아닌 경우 파싱 (Supabase JSONB 배열 처리)
              let lectureIds: string | string[] = data.session.lecture_ids
              if (typeof lectureIds === 'string') {
                const stringValue = lectureIds
                try {
                  const parsed = JSON.parse(stringValue)
                  lectureIds = Array.isArray(parsed) ? parsed : [stringValue]
                } catch {
                  lectureIds = [stringValue]
                }
              }
              if (Array.isArray(lectureIds) && lectureIds.length > 0) {
                onLectureIdsLoaded(lectureIds)
              }
            }
          } else {
            // 세션을 찾을 수 없음 (404 등) - 세션 ID 초기화
            console.warn('Session not found, clearing session ID:', sessionId)
            setCurrentSessionId(undefined)
            setMessages([])
            onSessionCreated?.(undefined) // 부모에게 세션 초기화 알림
          }
        } catch (err: any) {
          console.error('Failed to load session:', err)
          // 404 에러인 경우 세션 ID 초기화
          if (err?.status === 404 || err?.response?.status === 404) {
            console.warn('Session not found (404), clearing session ID:', sessionId)
            setCurrentSessionId(undefined)
            setMessages([])
            onSessionCreated?.(undefined as any) // 부모에게 세션 초기화 알림
          }
        } finally {
          setIsLoading(false)
        }
      } else {
        // sessionId가 없으면 초기화 (새 채팅)
        setMessages([])
        setCurrentSessionId(undefined)
        selfCreatedSessionId.current = undefined
        setIsRecordingSourceDisabled(false)
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

  // 참고자료 업데이트를 타이핑 완료 시점에 처리
  useEffect(() => {
    if (pendingReferences && onReferencesUpdate) {
      // 메시지 배열이 업데이트되고, 타이핑이 완료된 후에 참고자료 업데이트
      const currentMessageCount = messages.length
      const isTypingDone = typingComplete.get(pendingReferences.messageIndex)
      
      if (pendingReferences.messageIndex < currentMessageCount && isTypingDone) {
        onReferencesUpdate(pendingReferences.messageIndex, pendingReferences.refs)
        setPendingReferences(null)
      }
    }
  }, [pendingReferences, onReferencesUpdate, messages.length, typingComplete])

  // 타이핑 애니메이션 처리
  useEffect(() => {
    const intervals: NodeJS.Timeout[] = []
    
    typingProgress.forEach((currentLength, messageIndex) => {
      const message = messages[messageIndex]
      if (!message || message.role !== 'assistant') return
      
      const isComplete = typingComplete.get(messageIndex)
      if (isComplete) return
      
      const fullText = message.content
      const targetLength = fullText.length
      
      if (currentLength < targetLength) {
        // 타이핑 속도 조절 (문자당 약 7.5ms, 텍스트 길이에 따라 조정)
        // 짧은 텍스트는 빠르게, 긴 텍스트는 조금 느리게
        const baseSpeed = 7.5
        const lengthFactor = Math.min(targetLength / 1000, 1) // 최대 1배
        const speed = baseSpeed + (lengthFactor * 5) // 7.5ms ~ 12.5ms
        const interval = setInterval(() => {
          setTypingProgress(prev => {
            const newMap = new Map(prev)
            const current = newMap.get(messageIndex) || 0
            const next = Math.min(current + 1, targetLength)
            newMap.set(messageIndex, next)
            
            // 타이핑 완료
            if (next >= targetLength) {
              setTypingComplete(prev => {
                const newMap = new Map(prev)
                newMap.set(messageIndex, true)
                return newMap
              })
            }
            
            return newMap
          })
        }, speed)
        
        intervals.push(interval)
      } else {
        // 이미 완료된 경우
        setTypingComplete(prev => {
          const newMap = new Map(prev)
          newMap.set(messageIndex, true)
          return newMap
        })
      }
    })
    
    return () => {
      intervals.forEach(interval => clearInterval(interval))
    }
  }, [typingProgress, messages, typingComplete])

  // 메시지 전송 (SSE 스트리밍)
  const sendMessage = useCallback(async (
    question: string,
    options?: {
      question_type?: 'hooking' | 'pqm' | 'direct' | 'followup'
      source_question_id?: string
    }
  ) => {
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
        const sessionResult = await chatService.createSession(selectedLectureIds)
        if (sessionResult.error || !sessionResult.data) {
          // 401 에러 확인 (error_code 또는 status로 확인)
          if (sessionResult.error && (sessionResult.error.error_code === 'UNAUTHORIZED' || (sessionResult as any).status === 401)) {
            throw new Error(t('authExpired'))
          }
          throw new Error(sessionResult.error?.message || t('sessionCreateFailed'))
        }
        
        sessionIdToUse = sessionResult.data.id
        selfCreatedSessionId.current = sessionIdToUse
        setCurrentSessionId(sessionIdToUse)
        onSessionCreated?.(sessionIdToUse)
      }

      // SSE 스트리밍으로 채팅 (question_type 전달: 직접 질문은 'direct', 후속질문은 'followup')
      await chatService.sessionChatStream(
        sessionIdToUse,
        question,
        // onProgress: 진행 상황 업데이트 (누적)
        (progressData) => {
          if (progressData.type === 'status') {
            // 녹음 출처 비활성화 상태 저장
            if (progressData.step === 'recording_disabled') {
              setIsRecordingSourceDisabled(true)
            }
            // 새로운 상태 메시지 추가
            setLoadingStatusItems(prev => [...prev, {
              step: progressData.step,
              message: progressData.message || '',
              sources: []
            }])
          } else if (progressData.type === 'source' && progressData.data) {
            // 마지막 상태 항목에 소스 추가
            const sourceData = progressData.data // 타입 가드를 위해 지역 변수로 추출
            setLoadingStatusItems(prev => {
              if (prev.length === 0) {
                // 상태 메시지가 없으면 기본 상태 추가
                return [{
                  step: progressData.step || 'searching',
                  message: t('searchingSources'),
                  sources: [{
                    type: progressData.source_type!,
                    title: sourceData.title || '',
                    preview: sourceData.preview
                  }]
                }]
              }
              const updated = [...prev]
              const lastItem = updated[updated.length - 1]
              updated[updated.length - 1] = {
                ...lastItem,
                sources: [...lastItem.sources, {
                  type: progressData.source_type!,
                  title: sourceData.title || '',
                  preview: sourceData.preview
                }]
              }
              return updated
            })
          }
        },
        // onComplete: 최종 결과 처리
        (result) => {
          const assistantMessage: ChatMessage & { summary_keywords?: string | null; follow_up_question?: string | null } = {
            role: 'assistant',
            content: result.answer,
            summary_keywords: result.summary_keywords || null,
            follow_up_question: result.follow_up_question || null,
          }
          setMessages(prev => {
            const updated = [...prev, assistantMessage]
            const messageIndex = updated.length - 1
            const newRefs = result.references || []
            
            if (newRefs.length > 0) {
              setPendingReferences({ messageIndex, refs: newRefs })
            }
            
            // 타이핑 애니메이션 시작
            setTypingProgress(prev => {
              const newMap = new Map(prev)
              newMap.set(messageIndex, 0)
              return newMap
            })
            setTypingComplete(prev => {
              const newMap = new Map(prev)
              newMap.set(messageIndex, false)
              return newMap
            })
            
            return updated
          })
          setLoadingStatusItems([])
          setIsLoading(false)
        },
        // onError: 에러 처리
        (error) => {
          const errorMessage = error.message || t('chatError')
          setError(errorMessage)
          console.error('Chat error:', error)
          
          if (errorMessage.includes(t('authExpired'))) {
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
        },
        // options: question_type, source_question_id 전달
        {
          question_type: options?.question_type || 'direct',  // 기본값: 직접 질문
          source_question_id: options?.source_question_id,
          chat_mode: chatMode,
        }
      )
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('chatError')
      setError(errorMessage)
      console.error('Chat error:', err)
      
      if (errorMessage.includes(t('authExpired'))) {
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
  }, [currentSessionId, selectedLectureIds, isLoading, onSessionCreated, onReferencesUpdate, chatMode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    
    const question = input
    setInput('')
    await sendMessage(question)
  }

  const handleSuggestionClick = async (hooking: { id?: string; question: string; answer?: string; reference_data?: Reference[] | null; summary_keywords?: string | null; summary_keywords_eng?: string | null }) => {
    // 미리 저장된 답변이 있으면 바로 표시
    if (hooking.answer) {
      // 현재 locale에 따라 summary_keywords 선택
      const summaryKeywords = locale === 'en' 
        ? (hooking.summary_keywords_eng || hooking.summary_keywords || null)
        : (hooking.summary_keywords || null)
      
      // 사용자 메시지 추가
      const userMessage: ChatMessage = {
        role: 'user',
        content: hooking.question,
      }
      setMessages(prev => [...prev, userMessage])
      
      // AI 답변 추가
      const assistantMessage: ChatMessage & { summary_keywords?: string | null } = {
        role: 'assistant',
        content: hooking.answer,
        summary_keywords: summaryKeywords,
      }
      setMessages(prev => {
        const updated = [...prev, assistantMessage]
        const messageIndex = updated.length - 1
        
        // 참고자료가 있으면 부모에게 전달 (후킹 질문은 타이핑 애니메이션이 없으므로 즉시 전달)
        if (hooking.reference_data && hooking.reference_data.length > 0 && onReferencesUpdate) {
          console.log('[후킹 질문] reference_data 전달:', hooking.reference_data)
          // 후킹 질문은 타이핑 애니메이션이 없으므로 즉시 전달
          setTimeout(() => {
            onReferencesUpdate(messageIndex, hooking.reference_data!)
          }, 0)
        } else {
          console.log('[후킹 질문] reference_data 없음:', {
            hasReferenceData: !!hooking.reference_data,
            referenceDataLength: hooking.reference_data?.length || 0,
            hasOnReferencesUpdate: !!onReferencesUpdate
          })
        }
        
        return updated
      })
      
      // 세션이 없으면 생성하고 메시지 저장
      if (!currentSessionId) {
        try {
          console.log('[후킹 질문] 세션 생성 시도:', { selectedLectureIds })
          // 질문의 처음 50자를 title로 사용
          const sessionTitle = hooking.question.length > 50 
            ? hooking.question.substring(0, 50) + '...' 
            : hooking.question
          const sessionResult = await chatService.createSession(selectedLectureIds, sessionTitle)
          console.log('[후킹 질문] 세션 생성 결과:', sessionResult)
          if (sessionResult.error) {
            console.error('[후킹 질문] 세션 생성 실패:', sessionResult.error)
            setError(t('sessionCreateError'))
            return
          }
          if (sessionResult.data && sessionResult.data.id) {
            const newSessionId = sessionResult.data.id
            console.log('[후킹 질문] 세션 생성 성공:', newSessionId)
            selfCreatedSessionId.current = newSessionId
            setCurrentSessionId(newSessionId)
            onSessionCreated?.(newSessionId)
            
            // 세션 생성 완료 후 메시지 저장 (await 사용)
            try {
              await chatService.saveHookingMessage(newSessionId, {
                question: hooking.question,
                answer: hooking.answer,
                reference_data: hooking.reference_data,
                summary_keywords: summaryKeywords,
                hooking_question_id: hooking.id,  // 후킹질문 ID (source_question_id로 저장)
              })
              console.log('[후킹 질문] 메시지 저장 완료')
            } catch (err) {
              console.error('[후킹 질문] 메시지 저장 실패:', err)
            }
          } else {
            console.error('[후킹 질문] 세션 생성 실패: 세션 ID 없음', sessionResult)
            setError(t('sessionCreateError'))
          }
        } catch (err) {
          console.error('[후킹 질문] 세션 생성 예외:', err)
          setError(t('sessionCreateError'))
        }
      } else {
        // 기존 세션에 후킹 질문/답변 저장 (미리 준비된 답변 사용)
        // 현재 locale에 따라 summary_keywords 선택
        const summaryKeywords = locale === 'en' 
          ? (hooking.summary_keywords_eng || hooking.summary_keywords || null)
          : (hooking.summary_keywords || null)
        
        try {
          await chatService.saveHookingMessage(currentSessionId, {
            question: hooking.question,
            answer: hooking.answer,
            reference_data: hooking.reference_data,
            summary_keywords: summaryKeywords,
            hooking_question_id: hooking.id,  // 후킹질문 ID (source_question_id로 저장)
          })
        } catch (err) {
          console.error('Failed to save hooking message:', err)
        }
      }
    } else {
      // 미리 저장된 답변이 없으면 기존처럼 sendMessage 호출
      setInput(hooking.question)
    }
  }

  // PQM 질문 클릭 핸들러
  const handlePQMQuestionClick = async (pqmQuestion: PQMQuestion) => {
    // PQM 질문은 항상 미리 준비된 답변이 있음
    // 사용자 메시지 추가
    const userMessage: ChatMessage = {
      role: 'user',
      content: pqmQuestion.question,
    }
    setMessages(prev => [...prev, userMessage])
    
    // PQM reference_data를 Reference[] 형태로 변환
    const references: Reference[] = []
    if (pqmQuestion.reference_data) {
      // recording_chunks 처리
      if (pqmQuestion.reference_data.recording_chunks) {
        pqmQuestion.reference_data.recording_chunks.forEach((chunk: any) => {
          references.push({
            type: 'recording',
            source_id: chunk.recording_id || '',
            content: chunk.text || '',
            metadata: {
              chunk_index: chunk.chunk_index,
              start_time: chunk.start_time,
              end_time: chunk.end_time,
              score: chunk.score || 0,
            },
            citations: chunk.citations || [],  // 백엔드에서 생성된 citations 사용
            summary: chunk.summary || null,    // 백엔드에서 생성된 summary (인터뷰 기사 형식) 사용
          })
        })
      }
      
      // material_pages 처리
      if (pqmQuestion.reference_data.material_pages) {
        pqmQuestion.reference_data.material_pages.forEach((page: any) => {
          references.push({
            type: 'material',
            source_id: page.material_id || '',
            content: page.text_content || '',
            metadata: {
              material_id: page.material_id,
              page_number: page.page_number,
              image_path: page.image_path,
              image_url: page.image_url,
              score: page.score || 0,
            },
            citations: page.citations || [],  // 백엔드에서 생성된 citations 사용
          })
        })
      }
    }
    
    // AI 답변 추가 (타이핑 애니메이션 없이 바로 표시)
    // 현재 locale에 따라 summary_keywords 선택
    const summaryKeywords = locale === 'en' 
      ? (pqmQuestion.summary_keywords_eng || pqmQuestion.summary_keywords || null)
      : (pqmQuestion.summary_keywords || null)
    
    const assistantMessage: ChatMessage & { summary_keywords?: string | null } = {
      role: 'assistant',
      content: pqmQuestion.answer,
      summary_keywords: summaryKeywords,
    }
    setMessages(prev => {
      const updated = [...prev, assistantMessage]
      const messageIndex = updated.length - 1
      
      // 참고자료가 있으면 부모에게 즉시 전달 (타이핑 애니메이션 없으므로)
      if (references.length > 0 && onReferencesUpdate) {
        console.log('[PQM 질문] reference_data 전달:', references)
        setTimeout(() => {
          onReferencesUpdate(messageIndex, references)
        }, 0)
      } else {
        console.log('[PQM 질문] reference_data 없음:', {
          referencesLength: references.length,
          hasOnReferencesUpdate: !!onReferencesUpdate
        })
      }
      
      // 타이핑 애니메이션 없음 (즉시 완료 상태로 설정)
      setTypingComplete(prev => {
        const newMap = new Map(prev)
        newMap.set(messageIndex, true)
        return newMap
      })
      
      return updated
    })
    
    // 세션이 없으면 생성하고 메시지 저장
    if (!currentSessionId) {
      try {
        console.log('[PQM 질문] 세션 생성 시도:', { selectedLectureIds })
        // 질문의 처음 50자를 title로 사용
        const sessionTitle = pqmQuestion.question.length > 50 
          ? pqmQuestion.question.substring(0, 50) + '...' 
          : pqmQuestion.question
        const sessionResult = await chatService.createSession(selectedLectureIds, sessionTitle)
        console.log('[PQM 질문] 세션 생성 결과:', sessionResult)
        if (sessionResult.error) {
          console.error('[PQM 질문] 세션 생성 실패:', sessionResult.error)
          setError(t('sessionCreateError'))
          return
        }
        if (sessionResult.data && sessionResult.data.id) {
          const newSessionId = sessionResult.data.id
          console.log('[PQM 질문] 세션 생성 성공:', newSessionId)
          selfCreatedSessionId.current = newSessionId
          setCurrentSessionId(newSessionId)
          onSessionCreated?.(newSessionId)
          
          // 세션 생성 완료 후 메시지 저장 (await 사용)
          try {
            await chatService.savePQMMessage(newSessionId, {
              question: pqmQuestion.question,
              answer: pqmQuestion.answer,
              reference_data: references,
              summary_keywords: summaryKeywords,
              pqm_question_id: pqmQuestion.id,  // PQM 질문 ID (source_question_id로 저장)
            })
            console.log('[PQM 질문] 메시지 저장 완료')
          } catch (err) {
            console.error('[PQM 질문] 메시지 저장 실패:', err)
          }
        } else {
          console.error('[PQM 질문] 세션 생성 실패: 세션 ID 없음', sessionResult)
          setError(t('sessionCreateError'))
        }
      } catch (err) {
        console.error('[PQM 질문] 세션 생성 예외:', err)
        setError(t('sessionCreateError'))
      }
    } else {
      // 기존 세션에 PQM 메시지 저장 (미리 준비된 답변 사용)
      // 현재 locale에 따라 summary_keywords 선택
      const summaryKeywords = locale === 'en' 
        ? (pqmQuestion.summary_keywords_eng || pqmQuestion.summary_keywords || null)
        : (pqmQuestion.summary_keywords || null)
      
      try {
        await chatService.savePQMMessage(currentSessionId, {
          question: pqmQuestion.question,
          answer: pqmQuestion.answer,
          reference_data: references,
          summary_keywords: summaryKeywords,
          pqm_question_id: pqmQuestion.id,  // PQM 질문 ID (source_question_id로 저장)
        })
      } catch (err) {
        console.error('Failed to save PQM message:', err)
      }
    }
  }

  // 수업 미선택 상태
  if (selectedLectureIds.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400">
        <div className="text-center">
          <p className="text-lg font-medium">{t('selectLectureTitle')}</p>
          <p className="mt-2 text-sm">{t('selectLectureDescription')}</p>
        </div>
      </div>
    )
  }

  const showCardMatchGame = cardMatchState === 'idle' && selectedLectureIds.length === 1
  const showSuggestions = isInputFocused && !showCardMatchGame && selectedLectureIds.length === 1 && (hookingQuestions.length > 0 || pqmQuestions.length > 0)

  // 대화가 시작되지 않은 초기 상태 (GPT 스타일)
  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex h-full flex-col">
        {/* 중앙 컨텐츠 */}
        <div className={`flex flex-1 flex-col items-center px-4 max-w-full ${showCardMatchGame ? 'justify-start pt-6' : 'justify-center'}`}>
          {showCardMatchGame && (
            <div className="mb-6 flex w-full justify-center">
              <CardMatchGame
                pairs={cardMatchSet?.pairs ?? []}
                status={cardMatchSet?.status}
                isLoading={isCardMatchLoading}
                onComplete={() => {
                  setCardMatchState('completed')
                  setShowSuccess(true)
                  setSuccessFading(false)
                  clearSuccessTimers()
                  successFadeTimerRef.current = window.setTimeout(() => {
                    setSuccessFading(true)
                  }, 2500)
                  successHideTimerRef.current = window.setTimeout(() => {
                    setShowSuccess(false)
                  }, 3000)
                }}
              />
            </div>
          )}
          {/* 중앙 입력창 */}
          <div className="w-full max-w-[772px]">
            {cardMatchState === 'completed' && showSuccess && (
              <div className={`mb-6 -mt-3 flex items-center justify-center text-3xl font-bold text-gray-900 transition-opacity duration-500 ${successFading ? 'opacity-0' : 'opacity-100'}`}>
                SUCCESS
              </div>
            )}
            <ChatComposer
              value={input}
              onChange={(nextValue) => {
                setInput(nextValue)
                if (cardMatchState === 'idle' && nextValue.trim().length > 0) {
                  setCardMatchState('hidden')
                }
              }}
              onSubmit={handleSubmit}
              disabled={isLoading}
              placeholder={t('askAnythingPlaceholder')}
              chatMode={chatMode}
              onChatModeChange={setChatMode}
              sendLabel={t('sendLabel')}
              simpleLabel={t('simpleLabel')}
              deepLabel={t('deepLabel')}
              simpleHelpText={t('simpleHelpText')}
              deepHelpText={t('deepHelpText')}
              onFocus={() => {
                setIsInputFocused(true)
                if (cardMatchState === 'idle') {
                  setCardMatchState('hidden')
                }
              }}
              onBlur={() => {
                // 약간의 딜레이를 주어 버튼 클릭이 가능하도록 함
                setTimeout(() => {
                  setIsInputFocused(false)
                  if (cardMatchState !== 'completed' && input.trim().length === 0) {
                    setCardMatchState('idle')
                  }
                }, 200)
              }}
            />
          </div>

          {/* 입력창 포커스 시 나타나는 제안 질문 목록 (단일 선택 시에만 표시) */}
          {showSuggestions && (
          <div className="mt-6 w-full max-w-[772px] space-y-2 animate-fade-in-up">
              {/* 후킹 질문 (1개) */}
              {hookingQuestions.length > 0 && (
                <>
                  {hookingQuestions.slice(0, 1).map((hooking, index) => (
                    <button
                      key={`hooking-${index}`}
                      onClick={() => handleSuggestionClick(hooking)}
                      className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-left text-sm text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50 hover:shadow-md"
                    >
                      <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span>{hooking.question}</span>
                    </button>
                  ))}
                </>
              )}

              {/* PQM 질문 (4개) */}
              {pqmQuestions.length > 0 && (
                <>
                  {pqmQuestions.map((pqmQuestion) => (
                    <button
                      key={pqmQuestion.id}
                      onClick={() => handlePQMQuestionClick(pqmQuestion)}
                      className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-left text-sm text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50 hover:shadow-md"
                    >
                      <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span>{pqmQuestion.question}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // 대화 진행 중 상태
  return (
    <div className="flex h-full flex-col">
      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-8">
          {messages.map((message, index) => {
            if (message.role === 'user') {
              // 사용자 메시지: 말풍선으로 표시 (오른쪽 정렬)
              return (
                <div key={index} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl bg-gray-200 px-4 py-3">
                    <p className="whitespace-pre-wrap text-sm text-gray-900">{message.content}</p>
                  </div>
                </div>
              )
            } else {
              // AI 답변: 타이핑 애니메이션 적용
              const typingLength = typingProgress.get(index) ?? message.content.length
              const isTypingComplete = typingComplete.get(index) ?? true
              const displayedText = message.content.slice(0, typingLength)
              const assistantMessage = message as ChatMessage & { follow_up_question?: string | null }
              const followUpQuestion = assistantMessage.follow_up_question
              // 가장 마지막 assistant 메시지인지 확인
              const lastAssistantIndex = messages.map((m, i) => m.role === 'assistant' ? i : -1).filter(i => i >= 0).pop()
              const isLastAssistantMessage = index === lastAssistantIndex
              
              return (
                <div key={index} className="flex justify-start">
                  <div className="w-full max-w-none">
                    <div className="text-gray-900">
                      {typingLength < message.content.length ? (
                        <>
                          {renderMarkdown(displayedText)}
                          <span className="inline-block w-2 h-4 bg-gray-900 ml-1 animate-pulse" />
                        </>
                      ) : (
                        renderMarkdown(message.content)
                      )}
                    </div>
                    {/* 후속 질문 버튼 - 가장 마지막 답변에만 표시 */}
                    {isTypingComplete && typingLength >= message.content.length && followUpQuestion && isLastAssistantMessage && (
                      <div className="mt-4 flex justify-start animate-fade-in-up">
                        <button
                          onClick={() => {
                            if (!isLoading) {
                              // 후속질문 클릭 시 question_type: 'followup' 전달
                              sendMessage(followUpQuestion, { question_type: 'followup' })
                            }
                          }}
                          disabled={isLoading}
                          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-50 hover:border-gray-400 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span>💡</span>
                          <span>{followUpQuestion}</span>
                        </button>
                      </div>
                    )}
                    {/* 출처 확인 안내 멘트 - 타이핑 완료 후에만 표시 */}
                    {isTypingComplete && typingLength >= message.content.length && (
                      <div className="mt-6 flex justify-center animate-fade-in-up">
                        <div 
                          onClick={() => onShowReferencePanel?.('notes')}
                          className="inline-flex items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gradient-to-r from-gray-50 via-blue-50 to-purple-50 px-3 py-2 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02] animate-pulse-scale cursor-pointer"
                        >
                          <ArrowUp 
                            className="h-4 w-4 text-gray-600 animate-pulse flex-shrink-0" 
                            strokeWidth={3}
                          />
                          <span className="font-serif text-[10px] font-semibold text-gray-800 italic leading-relaxed tracking-wide whitespace-nowrap">
                            {t('referenceHint')}
                          </span>
                          <ArrowUp 
                            className="h-4 w-4 text-gray-600 animate-pulse flex-shrink-0" 
                            strokeWidth={3}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            }
          })}
          {isLoading && (
            <AnswerLoadingReviewBanner
              answers={reviewKeyAnswers}
              fallbackText={locale === 'en' ? 'Loading answer...' : '핵심 단어 준비중...'}
              className="mb-6"
            />
          )}
          {isLoading && loadingStatusItems.length > 0 && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-gray-50 border border-gray-200 px-5 py-4 max-w-[85%] w-full">
                <div className="flex items-start gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-900 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 space-y-4">
                    {/* 누적된 상태 메시지와 소스 목록 */}
                    {loadingStatusItems.map((statusItem, statusIdx) => (
                      <div key={statusIdx} className="space-y-3">
                        {/* 녹음본 비활성화 안내 - 출처 박스 스타일 유지 */}
                        {statusItem.step === 'recording_disabled' ? (
                          <div className="flex items-start gap-3 px-4 py-3 bg-white rounded-lg border border-gray-200">
                            <div className="flex-shrink-0 mt-0.5">
                              <div className="w-9 h-9 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
                                <span className="text-gray-400 text-base">🎙️</span>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-400">{t('recordingSourceDisabled')}</p>
                              <p className="text-xs text-gray-400 mt-1">{t('sourceLabels.recording')}</p>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* 상태 메시지 */}
                            <p className="text-sm font-medium text-gray-900">{statusItem.message}</p>
                          </>
                        )}

                        {/* 해당 상태의 소스 목록 (녹음본 비활성화가 아닐 때만 표시) */}
                        {statusItem.step !== 'recording_disabled' && statusItem.sources.length > 0 && (
                          <div className="space-y-2 pl-0">
                            <div className="space-y-2">
                              {statusItem.sources.map((source, sourceIdx) => (
                                <div
                                  key={`${statusIdx}-${sourceIdx}`}
                                  className="flex items-start gap-3 px-4 py-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                                >
                                  <div className="flex-shrink-0 mt-0.5">
                                    {source.type === 'recording' ? (
                                      <div className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center">
                                        <span className="text-gray-600 text-base">🎙️</span>
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
                                      {source.type === 'recording' ? t('sourceLabels.recording') : t('sourceLabels.material')}
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
        <div className="mx-auto max-w-[772px]">
          <ChatComposer
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            disabled={isLoading}
            placeholder={t('askAnythingPlaceholder')}
            chatMode={chatMode}
            onChatModeChange={setChatMode}
            sendLabel={t('sendLabel')}
            simpleLabel={t('simpleLabel')}
            deepLabel={t('deepLabel')}
            simpleHelpText={t('simpleHelpText')}
            deepHelpText={t('deepHelpText')}
          />
        </div>
      </div>
    </div>
  )
}

