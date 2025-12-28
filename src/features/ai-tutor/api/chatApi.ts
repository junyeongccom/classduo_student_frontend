/**
 * AI 튜터 채팅 API
 */
import { apiRequest } from '@/shared/lib/api'
import { API_BASE_URL, TOKEN_KEY } from '@/shared/lib/utils'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface Reference {
  type: 'recording' | 'material'
  source_id: string
  content: string
  metadata: {
    chunk_index?: number
    start_time?: number
    end_time?: number
    material_id?: string
    original_filename?: string
    page_number?: number
    image_path?: string
    image_width?: number
    image_height?: number
    score: number
  }
  citations: Array<{
    text: string
    start_index: number
    end_index: number
  }>
  keywords?: string[]
}

export interface ChatRequest {
  question: string
  lecture_ids: string[]
  chat_history: ChatMessage[]
}

export interface ChatResponse {
  answer: string
  references: Reference[]
  chat_history: ChatMessage[]
}

export interface HookingResponse {
  job_id: string
  topic: string
  question: string
  answer: string
  reference_data?: Reference[] | null  // 참고자료 (선택적)
}

// 채팅 세션 관련 타입
export interface ChatSession {
  id: string
  user_id: string
  title: string | null
  lecture_ids: string[]
  created_at: string
  updated_at: string
}

export interface StoredMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  reference_data: Reference[] | null
  summary_keywords: string | null
  created_at: string
}

export interface SessionWithMessages {
  session: ChatSession
  messages: StoredMessage[]
  lecture_ids?: string[] // 편의용 (session.lecture_ids와 동일)
}

export interface SearchResult {
  session_id: string
  session_title: string | null
  message_id: string
  message_content: string
  message_role: string
  message_created_at: string
  rank: number
}

export interface StreamProgressData {
  type: 'status' | 'source' | 'result' | 'error'
  step: 'searching' | 'selecting' | 'generating' | 'extracting' | 'complete'
  message?: string
  source_type?: 'recording' | 'material'
  data?: {
    title?: string
    preview?: string
    score?: number
    sources_count?: number
    answer?: string
    references?: Reference[]
    chat_history?: ChatMessage[]
    summary_keywords?: string
  }
}

export const chatApi = {
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
  async getHookingByLecture(lectureId: string): Promise<{ data: HookingResponse | null; error: any }> {
    return apiRequest<HookingResponse>(`/ai-tutor/hooking/lecture/${lectureId}`)
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
    onError: (error: Error) => void
  ): Promise<void> {
    const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null

    try {
      const response = await fetch(`${API_BASE_URL}/ai-tutor/sessions/${sessionId}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ question }),
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
              
              if (data.type === 'result') {
                onComplete(data.data)
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
   * 채팅 검색
   */
  async searchMessages(query: string): Promise<{ data: SearchResult[] | null; error: any }> {
    return apiRequest<SearchResult[]>(`/ai-tutor/search?q=${encodeURIComponent(query)}`, {
      auth: true,
    })
  },
}

