/**
 * AI 튜터 채팅 인터페이스 (GPT 스타일 + 세션 관리)
 */
'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'
import { Loader2, Search, ArrowUp } from 'lucide-react'
import { chatService } from '@/features/ai-tutor/services/chatService'
import { trackAiTutorQuestion, trackAiTutorFeedback } from '@/shared/hooks/useAnalytics'
import { useTrackPendingDialogueFeedback } from '@/features/ai-tutor/hooks/useDialogueFeedbackPopup'
import { chatAnalytics } from '@/shared/lib/analytics'
import { useIsAppWebView } from '@/shared/lib/appBridge'
import { ChatMessage, StoredMessage, Reference, PQMQuestion, ChatMode, SocraticTopic } from '@/features/ai-tutor/types'
import { useI18n } from '@/shared/i18n/I18nProvider'
import type { AppLocale } from '@/shared/i18n/I18nProvider'
import { AnswerLoadingReviewBanner } from '../ui/AnswerLoadingReviewBanner'
import { useAITutorStore } from '@/features/ai-tutor/store/useAITutorStore'
import { useSocraticStore } from '@/features/ai-tutor/store/useSocraticStore'
import { socraticService } from '@/features/ai-tutor/services/socraticService'
import { ChatComposer } from '../ui/ChatComposer'
import { resizeImageForChat } from '@/features/ai-tutor/domain/resizeImageForChat'
import SocraticTopicPicker from '../ui/SocraticTopicPicker'
import SocraticFinishBar from '../ui/SocraticFinishBar'
import SocraticLoading from '../ui/SocraticLoading'
import { MarkdownMessage, type CitationTag } from '@/features/ai-tutor/components/ui/MarkdownMessage'
import { MathText } from '@/shared/components/math/MathText'
import { InlineCitationCard } from '@/features/ai-tutor/components/ui/InlineCitationCard'
import { findCitationReference } from '@/features/ai-tutor/domain/findCitationReference'
import { FeedbackButtons } from '../ui/FeedbackButtons'
import TranscriptSaveButton from '../ui/TranscriptSaveButton'
import ChatTranscriptPrintView, {
  type TranscriptPrintData,
  type TranscriptPrintTurn,
} from '../ui/ChatTranscriptPrintView'
import { useTranscriptPrint } from '@/features/ai-tutor/hooks/useTranscriptPrint'
import { buildTranscriptFilename } from '@/features/ai-tutor/domain/buildTranscriptFilename'
import { buildSocraticSummary } from '@/features/ai-tutor/domain/socraticStages'
import { dropUnansweredUserTurns } from '@/features/ai-tutor/domain/dropUnansweredUserTurns'

const shuffleArray = <T,>(items: T[]) => {
  const array = [...items]
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

// NOTE: ai-tutor chat uses a Markdown renderer with GFM support (tables) via `MarkdownMessage`.

interface ChatInterfaceProps {
  selectedLectureIds: string[]
  sessionId?: string
  onSessionCreated?: (sessionId: string | undefined) => void
  onReferencesUpdate?: (messageIndex: number, references: Reference[]) => void
  onLectureIdsLoaded?: (lectureIds: string[]) => void // 세션 로드 시 lecture_ids 전달
  onMessagesUpdate?: (messages: ChatMessage[]) => void // 메시지 배열 업데이트
  onShowReferencePanel?: (type: 'notes' | 'materials') => void
  // 소크라 문답 4단계를 모두 끝낸 뒤 '종료하기'를 눌렀을 때 — 새 채팅 화면으로 돌아간다.
  onSocraticFinish?: () => void
}

export function ChatInterface({ selectedLectureIds, sessionId, onSessionCreated, onReferencesUpdate, onLectureIdsLoaded, onMessagesUpdate, onShowReferencePanel, onSocraticFinish }: ChatInterfaceProps) {
  const t = useTranslations('aiTutorChat')
  const tSidebar = useTranslations('aiTutorSidebar')
  const { locale } = useI18n()
  const { pqmByLocale, reviewKeyAnswersByLocale, setPqmCache, setReviewKeyAnswersCache, setIsRecordingSourceDisabled, selectedCourseId, focusSource } = useAITutorStore(state => ({
    pqmByLocale: state.pqmByLocale,
    reviewKeyAnswersByLocale: state.reviewKeyAnswersByLocale,
    setPqmCache: state.setPqmCache,
    setReviewKeyAnswersCache: state.setReviewKeyAnswersCache,
    setIsRecordingSourceDisabled: state.setIsRecordingSourceDisabled,
    selectedCourseId: state.selectedCourseId,
    focusSource: state.focusSource,
  }))
  const { socraticActiveTopic, setSocraticActiveTopic, socraticCurrentStage, socraticStageTotal, ahaMessageIds } = useSocraticStore(state => ({
    socraticActiveTopic: state.activeTopic,
    setSocraticActiveTopic: state.setActiveTopic,
    socraticCurrentStage: state.currentStage,
    socraticStageTotal: state.stageTotal,
    ahaMessageIds: state.ahaMessageIds,
  }))

  const [input, setInput] = useState('')
  const [chatMode, setChatMode] = useState<ChatMode>('simple')
  // 소크라 문답: 회차의 주제 목록 (모드 전환 시 조회)
  const [socraticTopics, setSocraticTopics] = useState<SocraticTopic[]>([])
  // 앱 WebView 모드 — 빈 대화 초기 화면의 입력창 정렬 판단에만 쓴다(아래 참조).
  const isAppMode = useIsAppWebView()
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
  const [pqmQuestions, setPQMQuestions] = useState<PQMQuestion[]>([])
  const [showSuggestionsPanel, setShowSuggestionsPanel] = useState(false) // 질문 리스트 표시 상태
  const [hasTypedInSession, setHasTypedInSession] = useState(false) // 세션 내 타이핑 여부
  // v1.0: DEEP 모드 안내 배너 제거 — 관련 state 삭제
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isInitialMount = useRef(true)  // 초기 마운트 여부
  const selfCreatedSessionId = useRef<string | undefined>(undefined)  // 자신이 생성한 세션 ID

  // 출처 버튼([녹음본 N]/[페이지 N]) 클릭 → 패널 포커스 대상 기록 + 해당 출처 패널 열기.
  // MarkdownMessage 가 React.memo 이므로 stable 참조 유지 (onShowReferencePanel 은 ref 로 우회).
  const onShowReferencePanelRef = useRef(onShowReferencePanel)
  useEffect(() => {
    onShowReferencePanelRef.current = onShowReferencePanel
  }, [onShowReferencePanel])
  // 모바일(md 미만)에서 출처 칩을 탭하면 패널 대신 칩 아래 인라인 아코디언으로 펼친다.
  // 대상 ref 를 찾지 못하면 기존 패널 열기로 폴백. (세션 전환 시 아래 effect 에서 초기화)
  const [inlineCitation, setInlineCitation] = useState<{
    messageIndex: number
    type: 'recording' | 'material'
    no: number
  } | null>(null)
  const handleCitationClick = useCallback((citation: CitationTag, messageIndex: number) => {
    if (messageIndex < 0) return
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
    if (isMobile) {
      const refs = useAITutorStore.getState().allReferences.get(messageIndex) ?? []
      if (findCitationReference(refs, citation.type, citation.no)) {
        setInlineCitation(prev =>
          prev && prev.messageIndex === messageIndex && prev.type === citation.type && prev.no === citation.no
            ? null
            : { messageIndex, type: citation.type, no: citation.no }
        )
        return
      }
    }
    focusSource({ type: citation.type, messageIndex, sourceNo: citation.no })
    onShowReferencePanelRef.current?.(citation.type === 'recording' ? 'notes' : 'materials')
  }, [focusSource])
  // 인라인 아코디언에 쓸 참조 데이터 — 스토어의 메시지 인덱스별 references
  const allReferencesFromStore = useAITutorStore(state => state.allReferences)
  // 세션 전환/새 채팅 시 펼침 상태 초기화 (다른 세션의 메시지 인덱스를 가리키지 않도록)
  useEffect(() => {
    setInlineCitation(null)
  }, [currentSessionId])

  // 대화형 학습 만족도 평가 — user 메시지 ≥1 인 active session 을 sessionStorage 에 등록 +
  // currentSessionId 변경 (새 채팅 / 다른 세션) 감지 시 이전 세션 평가 모달 트리거.
  // 페이지 이탈 시 trigger 는 studyspace layout 의 useDialogueFeedbackPopup 이 처리.
  const userMessageCount = messages.filter((m) => m.role === 'user').length
  useTrackPendingDialogueFeedback(currentSessionId, userMessageCount)

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
        const responses = await Promise.all(
          selectedLectureIds.map(lectureId => chatService.getLectureKeywords(lectureId, targetLocale))
        )
        const errors = responses.filter(res => res.error)
        const keywords = responses.flatMap(res => res.data?.keywords ?? [])
        if (cancelled) return
        if (errors.length === 0 && keywords.length > 0) {
          const answers = keywords
            .map(item => {
              const keyword = targetLocale === 'en' ? (item.keyword_eng || item.keyword) : item.keyword
              const description = targetLocale === 'en'
                ? (item.description_eng || item.description)
                : item.description
              if (keyword && description) {
                return `${keyword} - ${description}`
              }
              return keyword || description || ''
            })
            .filter(Boolean)
          const uniqueAnswers = Array.from(new Set(answers))
          const randomized = shuffleArray(uniqueAnswers)
          setReviewKeyAnswersCache(targetLocale, lectureKey, randomized)
          if (updateState) {
            setReviewKeyAnswers(randomized)
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

  // 제안 질문 패널은 회차/locale 이 실제로 바뀔 때만 닫는다.
  // (아래 로딩 effect 는 Zustand 캐시 객체 identity 변화 — 반대 locale 백그라운드 프리페치의
  //  setPqmCache — 로 재실행되는데, 거기서 패널을 닫으면 사용자가 막 연 패널이
  //  깜빡이며 사라지는 버그가 생긴다. 그래서 닫기 책임을 식별자 의존 effect 로 분리.)
  const lectureKey = selectedLectureIds.join(',')
  useEffect(() => {
    setShowSuggestionsPanel(false)
  }, [lectureKey, locale])

  // lecture_ids/locale 변경 시 PQM 질문 로드 (단일 선택 시에만)
  useEffect(() => {
    if (selectedLectureIds.length !== 1) {
      setPQMQuestions([])
      return
    }

    const lectureId = selectedLectureIds[0]
    const cachedPqm = pqmByLocale[locale]?.[lectureId]

    if (cachedPqm) {
      setPQMQuestions(cachedPqm)
    } else if (cachedPqm === undefined) {
      setPQMQuestions([])
    }

    const loadQuestions = async (targetLocale: AppLocale, updateState: boolean) => {
      const [pqmResult] = await Promise.allSettled([
        chatService.getPQMQuestionsByLecture(lectureId, targetLocale)
      ])

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

    if (cachedPqm === undefined) {
      loadQuestions(locale, true)
    }

    const oppositeLocale: AppLocale = locale === 'ko' ? 'en' : 'ko'
    const oppositePqm = pqmByLocale[oppositeLocale]?.[lectureId]
    if (oppositePqm === undefined) {
      loadQuestions(oppositeLocale, false)
    }
  }, [selectedLectureIds, locale, pqmByLocale, setPqmCache])

  // 컴포넌트 마운트 시 세션 확인 (페이지 복귀 시 작업 완료 확인)
  useEffect(() => {
    const checkSessionOnMount = async () => {
      // currentSessionId가 있고, 메시지가 없거나 적을 때 세션 확인
      if (currentSessionId && messages.length === 0) {
        try {
          const { data, error } = await chatService.getSession(currentSessionId)
          if (data && !error && data.messages.length > 0) {
            // 답변을 못 받은 학생 발화(실패 턴)를 걷어낸 뒤 렌더한다 — 아래 인덱스 접근도 이 배열 기준.
            const storedMessages = dropUnansweredUserTurns(data.messages)
            const loadedMessages: Array<ChatMessage & { summary_keywords?: string | null; follow_up_question?: string | null }> = storedMessages.map((m: StoredMessage, idx, arr) => {
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

              // v1.0: DB 로드 시 assistant 메시지의 original_question 복원
              // 직전의 user 메시지를 원 질문으로 간주 (elaboration도 SIMPLE의 직전 user 질문을 공유)
              let originalQuestion: string | undefined = undefined
              if (m.role === 'assistant') {
                for (let i = idx - 1; i >= 0; i--) {
                  if (arr[i].role === 'user') {
                    originalQuestion = arr[i].content
                    break
                  }
                }
              }

              // 사진 첨부(2026-08-22): user 메시지 reference_data 의 저장된 사진 URL 복원
              let attachedImageUrl: string | undefined = undefined
              if (m.role === 'user' && Array.isArray(m.reference_data)) {
                const att = (m.reference_data as any[]).find(
                  (r) => r && typeof r === 'object' && r.type === 'attached_image' && typeof r.url === 'string',
                )
                if (att) attachedImageUrl = att.url
              }

              return {
                role: m.role,
                content: m.content,
                summary_keywords: m.summary_keywords || null,
                follow_up_question: followUpQuestion,
                attachedImageUrl,
                id: m.id,
                // v1.0: elaboration 렌더링에 필요한 필드
                case_type: m.case_type ?? null,
                message_kind: (m.message_kind as any) ?? undefined,
                source_message_id: m.source_message_id ?? null,
                references: (m.reference_data as Reference[]) ?? undefined,
                original_question: originalQuestion,
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
              if (msg.role === 'assistant' && storedMessages[idx]?.reference_data) {
                const refs = storedMessages[idx].reference_data as Reference[]
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
            // 답변을 못 받은 학생 발화(실패 턴)를 걷어낸 뒤 렌더한다 — 아래 인덱스 접근도 이 배열 기준.
            const storedMessages = dropUnansweredUserTurns(data.messages)
            const loadedMessages: Array<ChatMessage & { summary_keywords?: string | null; follow_up_question?: string | null }> = storedMessages.map((m: StoredMessage, idx, arr) => {
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

              // v1.0: DB 로드 시 assistant 메시지의 original_question 복원
              let originalQuestion: string | undefined = undefined
              if (m.role === 'assistant') {
                for (let i = idx - 1; i >= 0; i--) {
                  if (arr[i].role === 'user') {
                    originalQuestion = arr[i].content
                    break
                  }
                }
              }

              // 사진 첨부(2026-08-22): user 메시지 reference_data 의 저장된 사진 URL 복원
              let attachedImageUrl: string | undefined = undefined
              if (m.role === 'user' && Array.isArray(m.reference_data)) {
                const att = (m.reference_data as any[]).find(
                  (r) => r && typeof r === 'object' && r.type === 'attached_image' && typeof r.url === 'string',
                )
                if (att) attachedImageUrl = att.url
              }

              return {
                role: m.role,
                content: m.content,
                summary_keywords: m.summary_keywords || null,
                follow_up_question: followUpQuestion,
                attachedImageUrl,
                id: m.id,
                // v1.0
                case_type: m.case_type ?? null,
                message_kind: (m.message_kind as any) ?? undefined,
                source_message_id: m.source_message_id ?? null,
                references: (m.reference_data as Reference[]) ?? undefined,
                original_question: originalQuestion,
              }
            })
            
            // 현재 에러 메시지가 있는지 확인 (에러 메시지는 DB에 저장되지 않으므로 유지해야 함)
            const currentErrorMessages = messages.filter(m => (m as any).isError)
            
            // 메시지가 추가되었거나 변경되었으면 업데이트
            // 단, 에러 메시지가 있으면 리로드하지 않음 (사용자가 재시도하거나 새 질문을 입력할 때까지 유지)
            if (currentErrorMessages.length > 0) {
              // 에러 메시지가 있으면 리로드 건너뛰기
              return
            }
            
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
                if (msg.role === 'assistant' && storedMessages[idx]?.reference_data) {
                  const refs = storedMessages[idx].reference_data as Reference[]
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
            // 메시지 로드 (summary_keywords, follow_up_question, v1.0 필드 포함)
            // 답변을 못 받은 학생 발화(실패 턴)를 걷어낸 뒤 렌더한다 — 아래 인덱스 접근도 이 배열 기준.
            const storedMessages = dropUnansweredUserTurns(data.messages)
            const loadedMessages: Array<ChatMessage & { summary_keywords?: string | null; follow_up_question?: string | null }> = storedMessages.map((m: StoredMessage, idx, arr) => {
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

              // v1.0: DB 로드 시 assistant 메시지의 original_question 복원
              // 직전 user 메시지를 원 질문으로 간주 (elaboration도 SIMPLE의 직전 user 질문 공유)
              let originalQuestion: string | undefined = undefined
              if (m.role === 'assistant') {
                for (let i = idx - 1; i >= 0; i--) {
                  if (arr[i].role === 'user') {
                    originalQuestion = arr[i].content
                    break
                  }
                }
              }

              // 사진 첨부(2026-08-22): user 메시지 reference_data 의 저장된 사진 URL 복원
              let attachedImageUrl: string | undefined = undefined
              if (m.role === 'user' && Array.isArray(m.reference_data)) {
                const att = (m.reference_data as any[]).find(
                  (r) => r && typeof r === 'object' && r.type === 'attached_image' && typeof r.url === 'string',
                )
                if (att) attachedImageUrl = att.url
              }

              return {
                role: m.role,
                content: m.content,
                summary_keywords: m.summary_keywords || null,
                follow_up_question: followUpQuestion,
                attachedImageUrl,
                id: m.id,
                feedback: m.feedback || null,
                // v1.0: Case A/B/C 및 elaboration 메시지 렌더에 필요
                case_type: m.case_type ?? null,
                message_kind: (m.message_kind as any) ?? undefined,
                source_message_id: m.source_message_id ?? null,
                references: (m.reference_data as Reference[]) ?? undefined,
                original_question: originalQuestion,
              }
            })
            setMessages(loadedMessages)
            setCurrentSessionId(sessionId)

            // v2.0: 히스토리 소크라 세션 복원 — 첫 메시지(또는 첫 assistant)의 chat_mode 로 판별.
            // 후속 메시지는 chat_mode 가 null 일 수 있어 첫 메시지 기준으로 세션 전체 모드를 판단한다.
            // (useAITutorSession.handleSelectSession 이 chatKey 를 증가시켜 이 컴포넌트를 remount 하며,
            // 그 핸들러 안에서 useSocraticStore.reset() 이 동기적으로 먼저 실행되므로 아래 복원은 항상 reset 이후에 실행됨)
            const firstMessage = storedMessages[0]
            const firstAssistantMessage = storedMessages.find((m: StoredMessage) => m.role === 'assistant')
            const sessionChatMode = firstMessage?.chat_mode ?? firstAssistantMessage?.chat_mode
            if (sessionChatMode === 'socratic') {
              setChatMode('socratic')
              socraticService.fetchState(sessionId).then(({ data: stateData, error: stateError }) => {
                if (stateError || !stateData || !stateData.topic) return
                setSocraticActiveTopic(stateData.topic)
                // setActiveTopic이 진행 상태를 0으로 초기화하므로 그 뒤에 서버 값으로 덮어쓴다.
                // 점수·단계·유형 개요에 더해 checkpoint_results/aha_count 까지 한 번에 복원한다 —
                // 예전에는 총점만 복원하고 체크포인트 결과를 비워둬서, 복원된 세션의 인쇄 요약표가
                // "전 단계 0점·방식 미상"인데 총점만 80으로 찍히는 모순이 있었다.
                useSocraticStore.getState().restoreProgress(stateData)
                if (selectedCourseId) {
                  socraticService.fetchLeaderboard(selectedCourseId).then(({ data: lbData }) => {
                    if (lbData) useSocraticStore.getState().setLeaderboard(lbData.entries)
                  })
                }
              })
            } else {
              // 소크라 세션이 아니면 전역 소크라 store 잔존분을 비운다.
              // 주제만 고르고(세션 생성됨) 메시지 없이 이탈하면 currentSessionId 가 전역 store 에
              // 남아, 재진입 시 isInitialMount 의 else(reset) 분기가 아닌 loadSession 으로 들어온다.
              // 그 세션은 메시지 0개라 chat_mode 판별이 안 되어 소크라 복원도 reset 도 없이
              // 이전 방문의 주제·패널이 빈 새 채팅 화면에 살아남는 경로가 있었다.
              useSocraticStore.getState().reset()
            }

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
                const originalMessage = storedMessages[index]
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
            useSocraticStore.getState().reset() // 사라진 세션의 소크라 패널 잔존 방지
            onSessionCreated?.(undefined) // 부모에게 세션 초기화 알림
          }
        } catch (err: any) {
          console.error('Failed to load session:', err)
          // 404 에러인 경우 세션 ID 초기화
          if (err?.status === 404 || err?.response?.status === 404) {
            console.warn('Session not found (404), clearing session ID:', sessionId)
            setCurrentSessionId(undefined)
            setMessages([])
            useSocraticStore.getState().reset() // 사라진 세션의 소크라 패널 잔존 방지
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
      } else {
        // 세션 없이 새로 마운트된 경우(사이드바로 대화형 학습 재진입 등)에는 loadSession 이
        // 아예 호출되지 않는다. 메시지/모드는 컴포넌트가 새로 뜨며 초기화되지만,
        // 소크라 store 는 모듈 전역이라 이전 세션의 점수·주제가 그대로 남아
        // 빈 새 채팅 화면에 점수 패널이 살아있는 문제가 있었다. 여기서 명시적으로 비운다.
        useSocraticStore.getState().reset()
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

  const appendErrorMessage = useCallback((errorMessage: string, retryQuestion?: string) => {
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: errorMessage,
      isError: true,
      retryQuestion: retryQuestion,
    }
    setMessages(prev => {
      const updated = [...prev, assistantMessage]
      const messageIndex = updated.length - 1
      setTypingProgress(prevMap => {
        const newMap = new Map(prevMap)
        newMap.set(messageIndex, 0)
        return newMap
      })
      setTypingComplete(prevMap => {
        const newMap = new Map(prevMap)
        newMap.set(messageIndex, false)
        return newMap
      })
      return updated
    })
  }, [])

  // 모드 토글 핸들러 — simple ↔ detailed ↔ socratic 전환 (analytics 기록 + socratic 이탈 시 소크라 상태 초기화)
  const handleChatModeChange = useCallback((mode: ChatMode) => {
    if (mode === 'socratic' && selectedLectureIds.length !== 1) {
      setError(t('socraticSingleLectureOnly'))
      return
    }
    setChatMode(mode)
    chatAnalytics.modeSwitch({ mode })
    if (mode !== 'socratic') {
      setSocraticTopics([])
      useSocraticStore.getState().reset()
    }
  }, [selectedLectureIds, t])

  // ── 대화 기록 PDF 저장 (브라우저 인쇄) ─────────────────────────────────
  // 소크라 문답 테스트 기록 보관이 주 용도라, 반복 저장해도 파일이 구분되도록 파일명에
  // 모드·주제·저장시각을 넣는다. 세 모드 모두 동작하고 소크라일 때만 요약표가 덧붙는다.
  const { printData, requestPrint } = useTranscriptPrint()
  const modeLabel =
    chatMode === 'socratic' ? t('socraticLabel')
      : chatMode === 'detailed' ? t('detailedLabel')
        : t('simpleLabel')

  const handleSaveTranscript = useCallback(() => {
    const printableTurns: TranscriptPrintTurn[] = messages
      // 에러 안내 말풍선은 대화 기록이 아니라 UI 상태라 인쇄물에서 제외
      .filter((m) => !m.isError && !!m.content?.trim())
      .map((m) => ({
        role: m.role,
        content: m.content,
        aha: m.role === 'user' && !!m.id && ahaMessageIds.includes(m.id),
      }))
    if (printableTurns.length === 0) return

    const tutorState = useAITutorStore.getState()
    const course = (tutorState.coursesByLocale[locale] ?? [])
      .find((c) => c.course_id === tutorState.selectedCourseId)
    const lecture = course?.lectures.find((l) => l.lecture_id === selectedLectureIds[0])
    const lectureLabel = lecture
      ? (lecture.title?.trim() || tSidebar('lectureLabel', { no: lecture.lecture_no }))
      : null

    // 소크라 요약은 우측 패널이 화면에 이미 노출하는 값만 사용한다 (내부 판정값은 넣지 않는다).
    const socraticState = useSocraticStore.getState()
    const topic = chatMode === 'socratic' ? socraticState.activeTopic : null
    // 총점·아하 횟수는 store 값을 따로 읽지 않고 요약표 행에서 파생시킨다(단일 출처) —
    // 표의 단계별 점수 합과 총점이 구조적으로 항상 일치한다.
    const socratic = topic
      ? {
        topicTitle: topic.title,
        currentStage: socraticState.currentStage,
        stageTotal: socraticState.stageTotal,
        ...buildSocraticSummary(
          socraticState.stageOutline,
          socraticState.stageTotal,
          socraticState.currentStage,
          socraticState.checkpointResults,
          socraticState.penalty,
        ),
      }
      : null

    const savedAt = new Date()
    const data: TranscriptPrintData = {
      filename: buildTranscriptFilename({
        modeLabel,
        subject: topic?.title ?? lectureLabel ?? course?.title ?? null,
        fallbackSubject: t('transcript.docTitle'),
        at: savedAt,
      }),
      courseTitle: course?.title ?? null,
      lectureLabel,
      modeLabel,
      savedAtLabel: new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'ko-KR', {
        dateStyle: 'long',
        timeStyle: 'short',
      }).format(savedAt),
      turns: printableTurns,
      socratic,
    }
    requestPrint(data)
  }, [messages, ahaMessageIds, locale, selectedLectureIds, chatMode, modeLabel, requestPrint, t, tSidebar])

  // 소크라 문답 모드 진입 시 (활성 주제 없음) 회차의 주제 목록 조회
  useEffect(() => {
    if (chatMode !== 'socratic' || socraticActiveTopic || selectedLectureIds.length !== 1) return
    let cancelled = false
    socraticService.fetchTopics(selectedLectureIds[0]).then(({ data, error }) => {
      if (cancelled) return
      if (!error && data) setSocraticTopics(data)
    })
    return () => {
      cancelled = true
    }
  }, [chatMode, socraticActiveTopic, selectedLectureIds])

  // 소크라 문답 주제 선택 → 세션 확보(없으면 생성) → startSession → seed_question 표시
  const handleSocraticTopicSelect = useCallback(async (topic: SocraticTopic) => {
    let sessionIdToUse = currentSessionId

    if (!sessionIdToUse) {
      const sessionResult = await chatService.createSession(selectedLectureIds)
      if (sessionResult.error || !sessionResult.data) {
        setError(sessionResult.error?.message || t('sessionCreateFailed'))
        return
      }
      sessionIdToUse = sessionResult.data.id
      selfCreatedSessionId.current = sessionIdToUse
      setCurrentSessionId(sessionIdToUse)
      onSessionCreated?.(sessionIdToUse)
      chatAnalytics.sessionCreate(selectedLectureIds[0], { trigger: 'direct_question', session_id: sessionIdToUse })
    }

    const { data, error } = await socraticService.startSession(sessionIdToUse, topic.id)
    if (error || !data) {
      // 세션/테이블 초기화 실패(503 등) — 소크라 진입 롤백. 모드는 유지하되 activeTopic은 설정하지 않는다.
      setError(error?.message || t('chatError'))
      return
    }

    setError(null)
    const seedMessage: ChatMessage = {
      role: 'assistant',
      content: data.seed_question,
      id: data.message_id,
      message_kind: 'simple',
    }
    setMessages(prev => [...prev, seedMessage])
    setSocraticActiveTopic(data.topic ?? topic)
  }, [currentSessionId, selectedLectureIds, onSessionCreated, setSocraticActiveTopic, t])

  // 메시지 전송 (SSE 스트리밍)
  const sendMessage = useCallback(async (
    question: string,
    options?: {
      question_type?: 'pqm' | 'direct' | 'followup'
      source_question_id?: string
      /** 첨부한 문제 사진 (JPEG data URL) */
      image_base64?: string
    }
  ) => {
    // 사진이 있으면 텍스트 없이도 전송 가능
    if ((!question.trim() && !options?.image_base64) || isLoading || selectedLectureIds.length === 0) return
    // 소크라 문답 모드에서 주제 미선택 시 전송 차단 (채점/패널 대상 없이 전송되는 것 방지)
    if (chatMode === 'socratic' && !socraticActiveTopic) return

    setIsLoading(true)
    setError(null)
    setLoadingStatusItems([])

    // 사용자 메시지 즉시 표시
    // 클라이언트 임시 id 부여: 소크라 문답 모드에서 이 턴의 "아하" 발화를 markAhaMessage로 식별하는 데 사용
    // (서버는 user 메시지에 별도 id를 내려주지 않으므로, 세션 재로드 전까지는 이 값이 유일한 식별자)
    const userMessageId = crypto.randomUUID()
    const userBubbleContent = options?.image_base64
      ? (question.trim() ? `${question}\n${t('attachedPhotoMarker')}` : t('attachedPhotoMarker'))
      : question
    const userMessage: ChatMessage = {
      role: 'user', content: userBubbleContent, id: userMessageId,
      attachedImageUrl: options?.image_base64,
    }
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
        chatAnalytics.sessionCreate(selectedLectureIds[0], { trigger: 'direct_question', session_id: sessionIdToUse })
      }

      // SSE 스트리밍으로 채팅 (question_type 전달: 직접 질문은 'direct', 후속질문은 'followup')
      await chatService.sessionChatStream(
        sessionIdToUse,
        question,
        // onProgress: 진행 상황 업데이트 (누적)
        (progressData) => {
          // 소크라 문답 채점 이벤트: 축 점수 반영 + 리더보드 갱신
          if (progressData.type === 'socratic_score') {
            useSocraticStore.getState().applyScoreEvent(progressData)
            if (selectedCourseId) {
              socraticService.fetchLeaderboard(selectedCourseId).then(({ data }) => {
                if (data) useSocraticStore.getState().setLeaderboard(data.entries)
              })
            }
            return
          }
          // 소크라 4단계 진행 이벤트: 정답 판정이면 다음 단계로 올라간 상태가 실려온다
          // (레거시 — v4 이후엔 socratic_progress가 대체하지만 하위 호환을 위해 계속 반영. 중복 적용돼도 무해)
          if (progressData.type === 'socratic_stage') {
            useSocraticStore.getState().applyStageEvent(progressData)
            return
          }
          // v4: 소크라 세부 진행 이벤트(root→scaffold→retry_root→fallback). socratic_stage를 대체하며
          // checkpoint_results/phase/scaffold_depth/aha 정보를 함께 담는다.
          // aha === true면 이 턴에 학생이 디딤돌(scaffold) 경유 후 스스로 원질문에 도달했다는 뜻이므로,
          // 이 턴의 학생 발화(user 말풍선)를 "아하" 발화로 하이라이트한다.
          if (progressData.type === 'socratic_progress') {
            useSocraticStore.getState().applyProgressEvent(progressData)
            if (progressData.aha === true) {
              useSocraticStore.getState().markAhaMessage(userMessageId)
            }
            return
          }
          // message_saved 이벤트: 마지막 assistant 메시지에 id 부여
          if (progressData.type === 'message_saved' && progressData.message_id) {
            const savedMessageId = progressData.message_id
            setMessages(prev => {
              const updated = [...prev]
              // 마지막 assistant 메시지 찾기
              for (let i = updated.length - 1; i >= 0; i--) {
                if (updated[i].role === 'assistant') {
                  updated[i] = { ...updated[i], id: savedMessageId }
                  break
                }
              }
              return updated
            })
            return
          }
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
          trackAiTutorQuestion({
            chat_session_id: sessionIdToUse,
            lecture_count: selectedLectureIds.length,
            question_length: question.length,
            chat_mode: chatMode,
            course_id: selectedCourseId ?? '',
          })
          chatAnalytics.message(selectedLectureIds[0] ?? '', { message_length: question.length, question_type: options?.question_type || 'direct' })

          const assistantMessage: ChatMessage & { summary_keywords?: string | null; follow_up_question?: string | null } = {
            role: 'assistant',
            content: result.answer,
            summary_keywords: result.summary_keywords || null,
            follow_up_question: result.follow_up_question || null,
            // v1.0 Sprint 3: case_type 저장 + 부연설명 요청 시 재사용할 원 질문/출처 보관
            case_type: (result as any).case_type ?? null,
            message_kind: 'simple',
            references: (result.references as Reference[]) || [],
            original_question: question,
            // 사진 첨부: 추출된 문제 원문 — "내 퀴즈로 저장" 버튼 노출 조건
            extracted_problem: (result as any).extracted_problem ?? null,
            similar_quizzes: (result as any).similar_quizzes ?? undefined,
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
          
          // 에러 메시지에 원본 질문 포함 (재시도용)
          appendErrorMessage(errorMessage, question)
          setLoadingStatusItems([])
          setIsLoading(false)
        },
        // options: question_type, source_question_id 전달
        {
          question_type: options?.question_type || 'direct',  // 기본값: 직접 질문
          source_question_id: options?.source_question_id,
          chat_mode: chatMode,
          socratic_topic_id: chatMode === 'socratic' ? socraticActiveTopic?.id : undefined,
          image_base64: options?.image_base64,
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
      
      // 에러 메시지에 원본 질문 포함 (재시도용)
      appendErrorMessage(errorMessage, question)
      setLoadingStatusItems([])
      setIsLoading(false)
    }
  }, [currentSessionId, selectedLectureIds, isLoading, onSessionCreated, onReferencesUpdate, chatMode, appendErrorMessage, selectedCourseId, socraticActiveTopic])

  // 사진 첨부 질문 (2026-08-22): 수학 문제를 찍어 질문하는 경로. data URL 상태로 보관.
  const [attachedImage, setAttachedImage] = useState<string | null>(null)

  // 사진 질문 문제 저장 상태 — 중복 저장 방지 (메시지 id 기준)
  const [savedPhotoQuizIds, setSavedPhotoQuizIds] = useState<Set<string>>(new Set())
  // 첨부 사진 확대 보기 (라이트박스) — 클릭한 사진 URL
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null)

  // 라이트박스 ESC 닫기
  useEffect(() => {
    if (!lightboxImageUrl) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxImageUrl(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxImageUrl])

  const handleSavePhotoQuiz = useCallback(async (message: ChatMessage, index: number) => {
    if (!message.extracted_problem || selectedLectureIds.length === 0 || !selectedCourseId) return
    const key = message.id ?? String(index)
    const { error } = await chatService.savePhotoQuiz({
      lecture_id: selectedLectureIds[0],
      course_id: selectedCourseId,
      question: message.extracted_problem,
      answer: message.content,
      session_id: currentSessionId,
    })
    if (!error) {
      setSavedPhotoQuizIds(prev => new Set(prev).add(key))
    } else {
      setError(error?.message || t('chatError'))
    }
  }, [selectedLectureIds, selectedCourseId, currentSessionId, t])

  const handleAttachFile = useCallback(async (file: File) => {
    const dataUrl = await resizeImageForChat(file)
    if (!dataUrl) {
      setError(t('attachImageTooLarge'))
      return
    }
    setError(null)
    setAttachedImage(dataUrl)
  }, [t])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // 사진만 첨부하고 텍스트가 없어도 전송 가능
    if (!input.trim() && !attachedImage) return

    const question = input
    const image = attachedImage
    setInput('')
    setAttachedImage(null)
    await sendMessage(question, image ? { image_base64: image } : undefined)
  }

  // 에러 발생 시 재시도 핸들러
  const handleRetry = useCallback((retryQuestion: string, errorMessageIndex: number) => {
    // 에러 메시지와 그 전의 사용자 메시지 제거
    setMessages(prev => {
      // 에러 메시지 바로 앞의 사용자 메시지도 함께 제거 (재시도 시 다시 추가됨)
      const newMessages = prev.filter((_, idx) => idx !== errorMessageIndex && idx !== errorMessageIndex - 1)
      return newMessages
    })
    // 재시도
    sendMessage(retryQuestion)
  }, [sendMessage])

  // PQM 질문 클릭 핸들러
  const handlePQMQuestionClick = async (pqmQuestion: PQMQuestion) => {
    // PQM 클릭 트래킹
    chatAnalytics.questionClick(selectedLectureIds[0] ?? '', { question_type: 'pqm', question_id: pqmQuestion.id })

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
    
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: pqmQuestion.answer,
      summary_keywords: summaryKeywords,
      follow_up_question: pqmQuestion.follow_up_question || null,
      // 부연설명 요청 핸들러가 original_question 없으면 바로 반환(가드)하므로 PQM 질문을 원 질문으로 세팅 + 출처 부착
      original_question: pqmQuestion.question,
      references,
    }
    setMessages(prev => {
      const updated = [...prev, assistantMessage]
      const messageIndex = updated.length - 1
      
      // 참고자료가 있으면 부모에게 즉시 전달 (타이핑 애니메이션 없으므로)
      if (references.length > 0 && onReferencesUpdate) {
        setTimeout(() => {
          onReferencesUpdate(messageIndex, references)
        }, 0)
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
        // summary_keywords를 title로 사용
        const titleSource = summaryKeywords || pqmQuestion.question
        const sessionTitle = titleSource.length > 50
          ? titleSource.substring(0, 50) + '...'
          : titleSource
        const sessionResult = await chatService.createSession(selectedLectureIds, sessionTitle)
        if (sessionResult.error) {
          console.error('[PQM 질문] 세션 생성 실패:', sessionResult.error)
          setError(t('sessionCreateError'))
          return
        }
        if (sessionResult.data && sessionResult.data.id) {
          const newSessionId = sessionResult.data.id
          selfCreatedSessionId.current = newSessionId
          setCurrentSessionId(newSessionId)
          onSessionCreated?.(newSessionId)
          chatAnalytics.sessionCreate(selectedLectureIds[0], { trigger: 'pqm', session_id: newSessionId })

          // 세션 생성 완료 후 메시지 저장 (await 사용)
          try {
            const saveResult = await chatService.savePQMMessage(newSessionId, {
              question: pqmQuestion.question,
              answer: pqmQuestion.answer,
              follow_up_question: pqmQuestion.follow_up_question || null,
              reference_data: references,
              summary_keywords: summaryKeywords,
              pqm_question_id: pqmQuestion.id,  // PQM 질문 ID (source_question_id로 저장)
            })
            if (saveResult.data?.assistant_message_id) {
              const asstMsgId = saveResult.data.assistant_message_id
              setMessages(prev => {
                const updated = [...prev]
                for (let i = updated.length - 1; i >= 0; i--) {
                  if (updated[i].role === 'assistant') {
                    updated[i] = { ...updated[i], id: asstMsgId }
                    break
                  }
                }
                return updated
              })
            }
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
        const saveResult = await chatService.savePQMMessage(currentSessionId, {
          question: pqmQuestion.question,
          answer: pqmQuestion.answer,
          follow_up_question: pqmQuestion.follow_up_question || null,
          reference_data: references,
          summary_keywords: summaryKeywords,
          pqm_question_id: pqmQuestion.id,  // PQM 질문 ID (source_question_id로 저장)
        })
        if (saveResult.data?.assistant_message_id) {
          const asstMsgId = saveResult.data.assistant_message_id
          setMessages(prev => {
            const updated = [...prev]
            for (let i = updated.length - 1; i >= 0; i--) {
              if (updated[i].role === 'assistant') {
                updated[i] = { ...updated[i], id: asstMsgId }
                break
              }
            }
            return updated
          })
        }
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

  const hasSuggestions =
    selectedLectureIds.length === 1 &&
    chatMode !== 'socratic' &&
    pqmQuestions.length > 0

  // v2.0 모드 잠금 규칙:
  // - 잠금은 **세션이 생성된 이후**에만 건다. 새 채팅 상태(세션 없음 + 발화 없음)에서는 주제를 골라둔
  //   상태여도 3모드를 자유롭게 오갈 수 있어야 한다(모드를 고른 순간 되돌아갈 수 없으면 안 됨).
  // - 소크라 세션이 시작된 뒤에는 simple/detailed 로 못 벗어남 (새 채팅으로만 이탈)
  // - 이미 대화가 시작된(messages.length > 0) 세션에서는 소크라로 중간 진입 불가 (새 채팅 + 첫 발화 전에만 진입 가능)
  const isSocraticSession = chatMode === 'socratic' && (messages.length > 0 || !!currentSessionId)
  const socraticEntryDisabled = selectedLectureIds.length !== 1 || messages.length > 0
  // 소크라 모드인데 주제를 아직 안 고른 상태 = 문답을 시작할 수 없는 상태.
  // 입력창을 잠가(포커스/타이핑 불가) 주제 카드를 먼저 고르도록 강제한다.
  const socraticTopicPending = chatMode === 'socratic' && !socraticActiveTopic
  // 4단계를 모두 통과한 상태 (단계 없는 옛 주제는 stageTotal 0 이라 완료로 보지 않는다)
  const socraticCompleted =
    chatMode === 'socratic' && !!socraticActiveTopic &&
    socraticStageTotal > 0 && socraticCurrentStage >= socraticStageTotal
  const composerDisabled = isLoading || socraticTopicPending
  const composerPlaceholder = socraticTopicPending
    ? t('socraticPickTopicPlaceholder')
    : t('askAnythingPlaceholder')

  // 대화가 시작되지 않은 초기 상태 (GPT 스타일)
  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        {/* 대화 기록 저장 — 대화가 비어 있으므로 비활성 */}
        <div className="flex shrink-0 items-center justify-end px-4 pt-2">
          <TranscriptSaveButton onClick={handleSaveTranscript} disabled label={t('transcriptSave')} />
        </div>
        {/*
          컨텐츠 정렬 — 데스크톱 웹은 GPT 스타일 세로 중앙.
          앱 WebView 는 화면이 좁고 길어 중앙 정렬 시 입력창 위아래로 300pt 씩 백지가 남고,
          모바일 채팅의 관습(입력창 하단 고정)과도 어긋나 하단 정렬로 둔다.
          col-reverse 를 쓰는 이유: 그냥 justify-end 로 내리면 DOM 순서상 뒤인 제안 질문 목록이
          입력창 아래(=키보드에 가려지는 자리)에 깔린다. 역방향 축이면 입력창이 바닥, 제안이 그 위다.
        */}
        <div
          className={`flex flex-1 items-center px-8 py-6 max-w-full ${
            isAppMode ? 'flex-col-reverse justify-start' : 'flex-col justify-center'
          }`}
        >

          {/* 중앙 입력창 */}
          <div className="w-full max-w-[680px] 2xl:max-w-[820px] mx-auto">
            <ChatComposer
              value={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              disabled={composerDisabled}
              placeholder={composerPlaceholder}
              chatMode={chatMode}
              onChatModeChange={handleChatModeChange}
              socraticDisabled={socraticEntryDisabled}
              simpleDetailedDisabled={isSocraticSession}
              compactModeToggle={isAppMode}
              topOverlay={socraticTopicPending ? (
                <SocraticTopicPicker topics={socraticTopics} onSelect={handleSocraticTopicSelect} />
              ) : socraticCompleted ? (
                <SocraticFinishBar onFinish={onSocraticFinish} />
              ) : undefined}
              sendLabel={t('sendLabel')}
              simpleLabel={t('simpleLabel')}
              deepLabel={t('deepLabel')}
              simpleHelpText={t('simpleHelpText')}
              deepHelpText={t('deepHelpText')}
              onAttachFile={handleAttachFile}
              attachedImagePreview={attachedImage}
              onRemoveAttachedImage={() => setAttachedImage(null)}
              attachImageLabel={t('attachImageLabel')}
              attachedImageAlt={t('attachedImageAlt')}
              removeAttachedImageLabel={t('removeAttachedImage')}
              onFocus={() => {
                // 포커스(=사용자 의도)면 패널을 연다. 아직 PQM 로딩 전이어도 열어두면, 로드 완료 시
                // hasSuggestions 가 true 가 되며 패널이 자동으로 나타난다. (포커스가 로딩보다 빨라도
                // '안 뜨고 다시 눌러야 뜨는' 문제 방지 — 노출 분석만 데이터가 준비됐을 때 보낸다.)
                if (!showSuggestionsPanel) {
                  setShowSuggestionsPanel(true)
                  if (hasSuggestions) {
                    const lectureId = selectedLectureIds[0]
                    if (pqmQuestions.length > 0) chatAnalytics.exposure(lectureId, { question_type: 'pqm', count: pqmQuestions.length })
                  }
                }
                chatAnalytics.inputFocus(selectedLectureIds[0])
              }}
            />
          </div>

          {/* 제안 질문 목록 — 안내 문구 클릭 또는 입력바 포커스 시 표시 */}
          {showSuggestionsPanel && hasSuggestions && (
          <div className="mt-6 w-full max-w-[680px] 2xl:max-w-[820px] space-y-2 animate-fade-in-up">
              {/* PQM 질문 */}
              {pqmQuestions.length > 0 && (
                <>
                  {pqmQuestions.map((pqmQuestion) => (
                    <button
                      key={pqmQuestion.id}
                      onClick={() => handlePQMQuestionClick(pqmQuestion)}
                      className="flex w-full items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-300 transition-all hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-md"
                    >
                      <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <MathText text={pqmQuestion.question} />
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
    <div className="flex min-h-0 flex-1 flex-col">
      {/* 대화 기록 저장 */}
      <div className="flex shrink-0 items-center justify-end px-4 pt-2">
        <TranscriptSaveButton
          onClick={handleSaveTranscript}
          disabled={isLoading || messages.length === 0}
          label={t('transcriptSave')}
        />
      </div>

      {/* 인쇄 전용 문서 — body 직계로 붙여 상위 overflow 클리핑을 피한다 (화면에서는 숨김) */}
      {printData && typeof document !== 'undefined' &&
        createPortal(<ChatTranscriptPrintView data={printData} />, document.body)}

      {/* 첨부 사진 확대 (라이트박스) — 바깥 클릭/X/ESC 로 닫기 */}
      {lightboxImageUrl && typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-6"
            onClick={() => setLightboxImageUrl(null)}
            role="dialog"
            aria-modal="true"
            aria-label={t('attachedImageAlt')}
          >
            <button
              type="button"
              onClick={() => setLightboxImageUrl(null)}
              aria-label={t('closeLightbox')}
              className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-2xl leading-none text-white hover:bg-white/25"
            >
              ×
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element -- 확대 보기 */}
            <img
              src={lightboxImageUrl}
              alt={t('attachedImageAlt')}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[88vh] max-w-[92vw] rounded-xl object-contain shadow-2xl"
            />
          </div>,
          document.body,
        )}

      {/* 메시지 영역 */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-8">
          {messages.map((message, index) => {
            if (message.role === 'user') {
              // 사용자 메시지: 말풍선으로 표시 (오른쪽 정렬)
              // 소크라 문답 모드: 디딤돌 경유 후 스스로 원질문에 도달한 "아하" 발화면 강조 표시
              const isAhaMessage = chatMode === 'socratic' && !!message.id && ahaMessageIds.includes(message.id)
              return (
                <div key={index} className="flex flex-col items-end gap-1">
                  {isAhaMessage && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 animate-fade-in-up">
                      ✨ {t('socraticAhaChip')}
                    </span>
                  )}
                  <div className="flex w-full justify-end">
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        isAhaMessage
                          ? 'border-2 border-amber-400 bg-amber-50'
                          : 'bg-gray-200'
                      }`}
                    >
                      {message.attachedImageUrl && (
                        <button
                          type="button"
                          onClick={() => setLightboxImageUrl(message.attachedImageUrl!)}
                          aria-label={t('attachedImageAlt')}
                          className="mb-2 block cursor-zoom-in"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element -- data URL/storage 미리보기 */}
                          <img
                            src={message.attachedImageUrl}
                            alt={t('attachedImageAlt')}
                            className="max-h-48 w-auto max-w-full rounded-lg border border-gray-300 object-contain transition-opacity hover:opacity-90"
                          />
                        </button>
                      )}
                      <p className="whitespace-pre-wrap text-sm text-gray-900">{message.content}</p>
                    </div>
                  </div>
                </div>
              )
            } else {
              // AI 답변: 타이핑 애니메이션 적용
              const typingLength = typingProgress.get(index) ?? message.content.length
              const isTypingComplete = typingComplete.get(index) ?? true
              const displayedText = message.content.slice(0, typingLength)
              const assistantMessage = message as ChatMessage & { follow_up_question?: string | null; isError?: boolean; retryQuestion?: string }
              const followUpQuestion = assistantMessage.follow_up_question
              const isErrorMessage = assistantMessage.isError
              const retryQuestion = assistantMessage.retryQuestion
              // 가장 마지막 assistant 메시지인지 확인
              const lastAssistantIndex = messages.map((m, i) => m.role === 'assistant' ? i : -1).filter(i => i >= 0).pop()
              const isLastAssistantMessage = index === lastAssistantIndex
              
              // 에러 메시지인 경우 별도 UI 표시
              if (isErrorMessage) {
                return (
                  <div key={index} className="flex justify-start">
                    <div className="w-full max-w-none">
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                              <span className="text-red-500 text-lg">⚠️</span>
                            </div>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-red-700 font-medium">{message.content}</p>
                            {retryQuestion && (
                              <button
                                onClick={() => handleRetry(retryQuestion, index)}
                                disabled={isLoading}
                                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm transition-all duration-200 hover:bg-red-50 hover:border-red-400 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span>{t('retryButton')}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }
              
              // 모바일 인라인 아코디언: 이 메시지에서 펼쳐진 출처 칩과 카드 (미펼침이면 null → memo 유지)
              const expandedCitation =
                inlineCitation && inlineCitation.messageIndex === index
                  ? { type: inlineCitation.type, no: inlineCitation.no }
                  : null
              const expandedCitationRef = expandedCitation
                ? findCitationReference(allReferencesFromStore.get(index) ?? [], expandedCitation.type, expandedCitation.no)
                : null
              const expandedCitationCard = expandedCitation && expandedCitationRef ? (
                <InlineCitationCard
                  reference={expandedCitationRef}
                  type={expandedCitation.type}
                  no={expandedCitation.no}
                />
              ) : null

              return (
                <div key={index} className="flex justify-start">
                  <div className="w-full max-w-none">
                    <div className="text-gray-900">
                      {typingLength < message.content.length ? (
                        <>
                          <MarkdownMessage markdown={displayedText} className="markdown-content" onCitationClick={handleCitationClick} citationMessageIndex={index} expandedCitation={expandedCitation} expandedCitationCard={expandedCitationCard} />
                          <span className="inline-block w-2 h-4 bg-gray-900 ml-1 animate-pulse" />
                        </>
                      ) : (
                        <MarkdownMessage markdown={message.content} className="markdown-content" onCitationClick={handleCitationClick} citationMessageIndex={index} expandedCitation={expandedCitation} expandedCitationCard={expandedCitationCard} />
                      )}
                    </div>
                    {/* 후속 질문 버튼 — 가장 마지막 답변에만 표시 */}
                    {(() => {
                      if (!isTypingComplete || typingLength < message.content.length) return null
                      if (!isLastAssistantMessage) return null

                      const hasFollowUp = Boolean(followUpQuestion)

                      if (!hasFollowUp) return null

                      return (
                        <div className="mt-4 flex flex-wrap items-center justify-start gap-2 animate-fade-in-up">
                          {hasFollowUp && followUpQuestion && (
                            <button
                              onClick={() => {
                                if (!isLoading) {
                                  chatAnalytics.followupClick(selectedLectureIds[0], { question_text: followUpQuestion.substring(0, 50) })
                                  sendMessage(followUpQuestion, { question_type: 'followup' })
                                }
                              }}
                              disabled={isLoading}
                              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-left text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-50 hover:border-gray-400 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span>💡</span>
                              <MathText text={followUpQuestion} />
                            </button>
                          )}
                        </div>
                      )
                    })()}
                    {/* 사진 질문 문제 → 내 퀴즈 저장 (2026-08-22) */}
                    {isTypingComplete && typingLength >= message.content.length && message.extracted_problem && (
                      <button
                        type="button"
                        disabled={savedPhotoQuizIds.has(message.id ?? String(index))}
                        onClick={() => handleSavePhotoQuiz(message, index)}
                        className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                          savedPhotoQuizIds.has(message.id ?? String(index))
                            ? 'border-green-200 bg-green-50 text-green-700 cursor-default'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {savedPhotoQuizIds.has(message.id ?? String(index))
                          ? `✓ ${t('photoQuizSaved')}`
                          : `📌 ${t('photoQuizSave')}`}
                      </button>
                    )}
                    {/* 사진 문제와 비슷한 회차 퀴즈 추천 — 칩 클릭 시 그 문제로 이어서 질문 */}
                    {isTypingComplete && typingLength >= message.content.length &&
                      Array.isArray(message.similar_quizzes) && message.similar_quizzes.length > 0 && (
                      <div className="mt-3 flex flex-col gap-1.5">
                        <span className="text-[11px] font-semibold text-gray-400">{t('similarQuizzesLabel')}</span>
                        {message.similar_quizzes.map((sq) => (
                          <button
                            key={sq.quiz_id}
                            type="button"
                            onClick={() => sendMessage(sq.question)}
                            className="flex items-start gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-xs text-gray-700 transition-colors hover:bg-gray-50"
                          >
                            <span aria-hidden="true">✏️</span>
                            <MathText text={sq.question} />
                          </button>
                        ))}
                      </div>
                    )}
                    {/* 피드백 버튼 - 타이핑 완료된 AI 메시지에만 표시 */}
                    {isTypingComplete && typingLength >= message.content.length && (
                      <FeedbackButtons
                        messageId={message.id}
                        sessionId={currentSessionId}
                        initialFeedback={message.feedback}
                        onFeedbackChange={(newFeedback) => {
                          setMessages(prev => {
                            const updated = [...prev]
                            updated[index] = { ...updated[index], feedback: newFeedback }
                            return updated
                          })
                        }}
                      />
                    )}
                    {/* 출처 확인 안내 멘트 - 타이핑 완료 후에만 표시 (simple/detailed 전용, 소크라는 회귀 방지로 숨김) */}
                    {isTypingComplete && typingLength >= message.content.length && chatMode !== 'socratic' && (
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
                    {/* 소크라 유도 문구 - 출처 안내 대신, 캐릭터 + 유도 문구 */}
                    {isTypingComplete && typingLength >= message.content.length && chatMode === 'socratic' && (
                      <div className="mt-6 flex justify-center animate-fade-in-up">
                        <div className="inline-flex items-center gap-2 rounded-lg border-2 border-dashed border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-sky-50 px-3 py-2 shadow-md">
                          <img
                            src="/topic_test/hero-female.png"
                            alt=""
                            width={26}
                            height={26}
                            className="shrink-0 rounded-full bg-pink-50 object-contain"
                          />
                          <span className="font-serif text-[10px] font-semibold text-gray-800 italic leading-relaxed tracking-wide whitespace-nowrap">
                            {t('socraticHint')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            }
          })}
          {isLoading && chatMode !== 'socratic' && (
            <AnswerLoadingReviewBanner
              answers={reviewKeyAnswers}
              fallbackText={locale === 'en' ? 'Loading answer...' : '핵심 단어 준비중...'}
              className="mb-6"
            />
          )}
          {isLoading && chatMode === 'socratic' && (
            <SocraticLoading />
          )}
          {isLoading && chatMode !== 'socratic' && loadingStatusItems.length > 0 && (
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
      <div
        className="border-t border-gray-200 dark:border-gray-700 px-8 pt-3 pb-0"
        style={{ transform: 'translateY(0px)' }}
      >
        <div className="mx-auto max-w-[680px] 2xl:max-w-[820px]">
          {/* v1.0: DEEP 모드 안내 말풍선 제거 (DEEP 모드가 없어짐) */}
          <ChatComposer
            value={input}
            onChange={(value) => {
              setInput(value)
              if (value.length > 0 && !hasTypedInSession) {
                setHasTypedInSession(true)
              }
            }}
            onSubmit={handleSubmit}
            disabled={composerDisabled}
            placeholder={composerPlaceholder}
            chatMode={chatMode}
            onChatModeChange={handleChatModeChange}
            socraticDisabled={socraticEntryDisabled}
            simpleDetailedDisabled={isSocraticSession}
            compactModeToggle={isAppMode}
            topOverlay={socraticTopicPending ? (
              <SocraticTopicPicker topics={socraticTopics} onSelect={handleSocraticTopicSelect} />
            ) : socraticCompleted ? (
              <SocraticFinishBar onFinish={onSocraticFinish} />
            ) : undefined}
            sendLabel={t('sendLabel')}
            simpleLabel={t('simpleLabel')}
            deepLabel={t('deepLabel')}
            simpleHelpText={t('simpleHelpText')}
            deepHelpText={t('deepHelpText')}
            onAttachFile={handleAttachFile}
            attachedImagePreview={attachedImage}
            onRemoveAttachedImage={() => setAttachedImage(null)}
            attachImageLabel={t('attachImageLabel')}
            attachedImageAlt={t('attachedImageAlt')}
            removeAttachedImageLabel={t('removeAttachedImage')}
          />
        </div>
      </div>
    </div>
  )
}

