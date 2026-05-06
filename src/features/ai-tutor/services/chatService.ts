/**
 * AI 튜터 채팅 API
 */
import { apiRequest } from '@/shared/lib/api'
import { API_BASE_URL, TOKEN_KEY } from '@/shared/lib/utils'
import {
  ChatMessage,
  ChatRequest,
  ChatResponse,
  HookingResponse,
  PQMQuestion,
  ChatSession,
  SessionWithMessages,
  SearchResult,
  StreamProgressData,
  Reference,
  ChatMode,
  LectureKeywordsResponse,
  ElaborationRequest,
  ElaborationResponse,
} from '../types'

// Re-export types for backward compatibility (optional but good for refactoring safety)
export type {
  ChatMessage,
  Reference,
  ChatRequest,
  ChatResponse,
  HookingResponse,
  PQMQuestion,
  ChatSession,
  StoredMessage,
  SessionWithMessages,
  SearchResult,
  StreamProgressData
} from '../types'

export const chatService = {
  /**
   * AI 튜터 채팅 (세션 없이)
   */
  async chat(request: ChatRequest): Promise<{ data: ChatResponse | null; error: any }> {
    return apiRequest<ChatResponse>('/ai-tutor/chat', {
      method: 'POST',
      body: request,
    })
  },

  /**
   * 후킹 질문/답변 조회 (lecture_id 기반)
   */
  async getHookingByLecture(lectureId: string, locale?: string): Promise<{ data: HookingResponse | null; error: any }> {
    return apiRequest<HookingResponse>(`/ai-tutor/hooking/lecture/${lectureId}`, {
      headers: locale ? { 'Accept-Language': locale } : undefined,
    })
  },

  /**
   * PQM 질문 4개 조회 (lecture_id 기반)
   */
  async getPQMQuestionsByLecture(lectureId: string, locale?: string): Promise<{ data: PQMQuestion[] | null; error: any }> {
    return apiRequest<PQMQuestion[]>(`/ai-tutor/pqm/lectures/${lectureId}`, {
      auth: true,
      headers: locale ? { 'Accept-Language': locale } : undefined,
    })
  },

  /**
   * 강의 회차 핵심 단어 목록 조회 (lecture_keywords)
   */
  async getLectureKeywords(lectureId: string, locale?: string): Promise<{ data: LectureKeywordsResponse | null; error: any }> {
    return apiRequest<LectureKeywordsResponse>(`/recordings/audio/lectures/${lectureId}/keywords`, {
      auth: true,
      headers: locale ? { 'Accept-Language': locale } : undefined,
    })
  },

  /**
   * 후킹 질문/답변 조회 (job_id 기반 - 레거시)
   */
  async getHooking(jobId: string): Promise<{ data: HookingResponse | null; error: any }> {
    return apiRequest<HookingResponse>(`/ai-tutor/hooking/${jobId}`)
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 채팅 세션 관련 API
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 새 채팅 세션 생성
   */
  async createSession(lectureIds: string[], title?: string): Promise<{ data: ChatSession | null; error: any }> {
    return apiRequest<ChatSession>('/ai-tutor/sessions', {
      method: 'POST',
      body: { lecture_ids: lectureIds, title },
      auth: true,
    })
  },

  /**
   * 채팅 세션 목록 조회
   */
  async getSessions(): Promise<{ data: ChatSession[] | null; error: any }> {
    return apiRequest<ChatSession[]>('/ai-tutor/sessions', {
      auth: true,
    })
  },

  /**
   * 특정 세션과 메시지 조회
   */
  async getSession(sessionId: string): Promise<{ data: SessionWithMessages | null; error: any }> {
    return apiRequest<SessionWithMessages>(`/ai-tutor/sessions/${sessionId}`, {
      auth: true,
    })
  },

  /**
   * 채팅 세션 삭제
   */
  async deleteSession(sessionId: string): Promise<{ data: any; error: any }> {
    return apiRequest(`/ai-tutor/sessions/${sessionId}`, {
      method: 'DELETE',
      auth: true,
    })
  },

  /**
   * 세션 내 채팅 (DB 저장)
   */
  async sessionChat(sessionId: string, question: string): Promise<{ data: ChatResponse | null; error: any }> {
    return apiRequest<ChatResponse>(`/ai-tutor/sessions/${sessionId}/chat`, {
      method: 'POST',
      body: { question },
      auth: true,
    })
  },

  /**
   * 세션 내 채팅 (SSE 스트리밍, DB 저장)
   */
  async sessionChatStream(
    sessionId: string,
    question: string,
    onProgress: (data: StreamProgressData) => void,
    onComplete: (result: ChatResponse) => void,
    onError: (error: Error) => void,
    options?: {
      question_type?: 'hooking' | 'pqm' | 'direct' | 'followup'
      source_question_id?: string
      chat_mode?: ChatMode
    }
  ): Promise<void> {
    const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null

    try {
      const response = await fetch(`${API_BASE_URL}/ai-tutor/sessions/${sessionId}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ 
          question,
          question_type: options?.question_type,
          source_question_id: options?.source_question_id,
          chat_mode: options?.chat_mode,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.type === 'error') {
                const message = data.message || '답변 생성 중 오류가 발생했습니다.'
                onError(new Error(message))
                await reader.cancel()
                return
              }
              if (data.type === 'result') {
                onComplete(data.data)
              } else if (data.type === 'message_saved') {
                onProgress(data)
              } else {
                onProgress(data)
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e)
            }
          }
        }
      }
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Unknown error'))
    }
  },

  /**
   * 후킹 질문/답변을 세션에 저장 (미리 준비된 답변 사용)
   */
  async saveHookingMessage(
    sessionId: string,
    hooking: {
      question: string
      answer: string
      follow_up_question?: string | null
      reference_data?: Reference[] | null
      summary_keywords?: string | null
      hooking_question_id?: string  // 원본 후킹질문 ID (source_question_id로 저장됨)
    }
  ): Promise<{ data: { success: boolean; message: string; follow_up_question?: string | null; assistant_message_id?: string | null } | null; error: any }> {
    return apiRequest<{ success: boolean; message: string; follow_up_question?: string | null; assistant_message_id?: string | null }>(
      `/ai-tutor/sessions/${sessionId}/hooking`,
      {
        method: 'POST',
        body: hooking,
        auth: true,
      }
    )
  },

  /**
   * PQM 메시지 저장 (미리 준비된 답변 저장)
   */
  async savePQMMessage(
    sessionId: string,
    pqm: {
      question: string
      answer: string
      follow_up_question?: string | null
      reference_data?: Reference[] | null
      summary_keywords?: string | null
      pqm_question_id?: string  // 원본 PQM 질문 ID (source_question_id로 저장됨)
    }
  ): Promise<{ data: { success: boolean; message: string; follow_up_question?: string | null; assistant_message_id?: string | null } | null; error: any }> {
    return apiRequest<{ success: boolean; message: string; follow_up_question?: string | null; assistant_message_id?: string | null }>(
      `/ai-tutor/sessions/${sessionId}/pqm`,
      {
        method: 'POST',
        body: pqm,
        auth: true,
      }
    )
  },

  /**
   * v1.0 Sprint 3: 부연설명 요청
   *
   * SIMPLE 답변에 대한 [부연설명 요청] 버튼 클릭 시 호출.
   * 새 RAG 검색 없이 원 SIMPLE 답변이 인용한 참고자료만 재사용한다.
   * Case C 메시지에서는 호출하지 않아야 함 (UI 레벨에서 차단).
   */
  async requestElaboration(
    request: ElaborationRequest
  ): Promise<{ data: ElaborationResponse | null; error: any }> {
    return apiRequest<ElaborationResponse>('/ai-tutor/elaboration', {
      method: 'POST',
      body: request,
      auth: true,
    })
  },

  /**
   * 메시지 피드백 업데이트 (좋아요/싫어요)
   */
  async updateMessageFeedback(
    messageId: string,
    feedback: 'like' | 'dislike' | null
  ): Promise<{ data: { success: boolean; feedback: string | null } | null; error: any }> {
    return apiRequest<{ success: boolean; feedback: string | null }>(
      `/ai-tutor/messages/${messageId}/feedback`,
      {
        method: 'PATCH',
        body: { feedback },
        auth: true,
      }
    )
  },

  /**
   * 대화형 학습 세션 만족도 평가 저장 (별점 1~5).
   * 세션당 1회만 기록 — 이미 평가된 세션이면 updated=false.
   */
  async updateSessionSatisfaction(
    sessionId: string,
    rating: number
  ): Promise<{ data: { updated: boolean; session_id: string; rating?: number; reason?: string } | null; error: any }> {
    return apiRequest<{ updated: boolean; session_id: string; rating?: number; reason?: string }>(
      `/ai-tutor/sessions/${sessionId}/satisfaction`,
      {
        method: 'PATCH',
        body: { rating },
        auth: true,
      }
    )
  },

  /**
   * 채팅 세션 검색
   */
  async searchSessions(
    query: string,
    options?: { limit?: number; offset?: number; signal?: AbortSignal }
  ): Promise<{ data: SearchResult[] | null; error: any }> {
    const params = new URLSearchParams({
      q: query,
      limit: String(options?.limit ?? 50),
      offset: String(options?.offset ?? 0),
    })

    const locale = typeof window !== 'undefined'
      ? localStorage.getItem('classduo_locale') || 'ko'
      : 'ko'
    const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null

    const response = await fetch(`${API_BASE_URL}/ai-tutor/search?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': locale,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: options?.signal,
    })

    const data = await response.json()
    if (!response.ok) {
      return {
        data: null,
        error: data.detail || { error_code: 'UNKNOWN_ERROR', message: '알 수 없는 오류가 발생했습니다' },
      }
    }

    return { data, error: null }
  },
}
