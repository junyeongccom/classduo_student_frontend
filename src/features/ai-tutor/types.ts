export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  summary_keywords?: string | null
  follow_up_question?: string | null
  isError?: boolean  // 에러 메시지 여부
  retryQuestion?: string  // 재시도할 원본 질문
}

export type ChatMode = 'simple' | 'deep'

export interface Reference {
  type: 'recording' | 'material'
  source_id: string
  content: string
  reference_index?: number
  metadata: {
    chunk_index?: number
    start_time?: number
    end_time?: number
    material_id?: string
    original_filename?: string
    page_number?: number
    image_path?: string
    image_url?: string
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
  summary?: {
    title: string
    content: string
  }
  _meta?: {
    follow_up_question?: string
  }
}

export interface ChatRequest {
  question: string
  lecture_ids: string[]
  chat_history: ChatMessage[]
  chat_mode?: ChatMode
}

export interface ChatResponse {
  answer: string
  follow_up_question?: string | null
  references: Reference[]
  chat_history: ChatMessage[]
  summary_keywords?: string | null
}

export interface HookingResponse {
  id: string  // 후킹질문 고유 ID (source_question_id로 사용)
  job_id: string
  topic: string
  question: string
  answer: string
  follow_up_question?: string | null
  reference_data?: Reference[] | null  // 참고자료 (선택적)
  summary_keywords?: string | null  // 핵심 키워드 (한국어, 선택적)
  summary_keywords_eng?: string | null  // 핵심 키워드 (영어, 선택적)
}

export interface PQMQuestion {
  id: string
  question: string
  answer: string
  follow_up_question?: string | null
  reference_data: {
    recording_chunks: Array<{
      recording_id: string
      chunk_index: number
      text: string
      start_time: number
      end_time: number
      score: number
    }>
    material_pages: Array<{
      material_id: string
      page_number: number
      text_content: string
      image_url?: string
      image_path?: string
      score: number
    }>
  }
  question_order: number
  summary_keywords?: string | null  // 핵심 키워드 (한국어, 선택적)
  summary_keywords_eng?: string | null  // 핵심 키워드 (영어, 선택적)
}

export interface LectureKeywordItem {
  lecture_id: string
  keyword: string
  keyword_eng?: string | null
  description: string
  description_eng?: string | null
  keyword_index: number
}

export interface LectureKeywordsResponse {
  lecture_id: string
  keywords: LectureKeywordItem[]
  total_count: number
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

// Search result types (chat_search feature)
export type SearchResultMatchType = 'session_title' | 'message_content'

export interface SessionTitleSearchResult {
  match_type: 'session_title'
  session_id: string
  title: string | null
  updated_at: string // ISO 8601
  rank: number
}

export interface MessageContentSearchResult {
  match_type: 'message_content'
  session_id: string
  title: string | null
  updated_at: string // Session updated_at, ISO 8601
  rank: number
  message_id: string
  content_preview: string // 최대 120자
  message_created_at: string // ISO 8601
}

export type SearchResult = SessionTitleSearchResult | MessageContentSearchResult

export interface StreamProgressData {
  type: 'status' | 'source' | 'result' | 'error'
  step: 'searching' | 'selecting' | 'generating' | 'extracting' | 'summarizing' | 'recording_disabled' | 'complete'
  message?: string
  source_type?: 'recording' | 'material'
  data?: {
    title?: string
    preview?: string
    score?: number
    sources_count?: number
    answer?: string
    follow_up_question?: string | null
    references?: Reference[]
    chat_history?: ChatMessage[]
    summary_keywords?: string
  }
}

export interface CardMatchPairSources {
  recording_chunk_ids?: string[]
  material_page_ids?: string[]
}

export interface CardMatchPair {
  pair_id: string
  term: string
  term_eng?: string | null
  description: string
  description_eng?: string | null
  sources?: CardMatchPairSources | null
}

export interface CardMatchSet {
  lecture_id: string
  status: 'PENDING' | 'READY' | 'FAILED' | string
  pair_count: number
  set_id?: string | null
  pairs: CardMatchPair[]
  updated_at?: string | null
}

