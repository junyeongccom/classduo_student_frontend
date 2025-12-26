/**
 * AI 튜터 채팅 API
 */
import { apiRequest } from '@/shared/lib/api'

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
  created_at: string
}

export interface SessionWithMessages {
  session: ChatSession
  messages: StoredMessage[]
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
   * 채팅 검색
   */
  async searchMessages(query: string): Promise<{ data: SearchResult[] | null; error: any }> {
    return apiRequest<SearchResult[]>(`/ai-tutor/search?q=${encodeURIComponent(query)}`, {
      auth: true,
    })
  },
}

