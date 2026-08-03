export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  summary_keywords?: string | null
  follow_up_question?: string | null
  isError?: boolean  // 에러 메시지 여부
  retryQuestion?: string  // 재시도할 원본 질문
  id?: string  // DB 메시지 ID (피드백용)
  feedback?: 'like' | 'dislike' | null  // 피드백 상태
  // v1.0: Case A/B/C 판정 (assistant 메시지만)
  case_type?: 'A' | 'B' | 'C' | null
  // v1.0: message_kind ('simple' | 'elaboration' | 'followup')
  message_kind?: 'simple' | 'elaboration' | 'followup'
  // v1.0: 부연설명이 참조하는 원 SIMPLE 메시지 ID
  source_message_id?: string | null
  // v1.0: 답변 렌더링에 사용할 references (각 메시지가 자기 자신의 출처 유지)
  references?: Reference[]
  // v1.0: 원 질문 (부연설명 엔드포인트 호출용)
  original_question?: string
}

// v2.0: 대화 모드 3종 — simple(간결한 설명) / detailed(자세한 설명, 초등학생 수준 쉬운 설명) / socratic(소크라 문답)
export type ChatMode = 'simple' | 'detailed' | 'socratic'

// 답변 본문의 출처 버튼([녹음본 N]/[페이지 N]) 클릭 시 출처 패널이 스크롤·펼침할 대상.
// sourceNo: 녹음본은 1-based 표시 번호(chunk_index+1), 강의자료는 실제 페이지 번호.
// nonce: 같은 버튼을 다시 눌러도 패널이 재반응하도록 클릭마다 증가.
export interface SourceFocusTarget {
  type: 'recording' | 'material'
  messageIndex: number
  sourceNo: number
  nonce: number
}

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
    // 다중 회차 출처 표기 (단일 회차면 없음/None)
    lecture_label?: string | null
    lecture_no?: number | null
    lecture_title?: string | null
  }
  citations: Array<{
    text: string
    start_index: number
    end_index: number
    // v1.0: answer 측 위치 (선택적; 없으면 undefined)
    answer_quote?: string
    answer_start?: number
    answer_end?: number
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
  // v1.0
  case_type?: 'A' | 'B' | 'C' | null
  removed_orphan_tags?: string[]
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
  feedback?: 'like' | 'dislike' | null
  created_at: string
  // v1.0 (chat_messages 확장 필드)
  tutor_version?: string | null
  case_type?: 'A' | 'B' | 'C' | null
  message_kind?: 'simple' | 'elaboration' | 'followup' | null
  source_message_id?: string | null
  // v2.0: 메시지가 생성된 채팅 모드 (simple/detailed/socratic). 후속 메시지는 null일 수 있어
  // 세션의 소크라 여부 판별은 첫 메시지(또는 첫 assistant)의 값을 사용해야 함.
  chat_mode?: ChatMode
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

export interface ChatStreamProgressData {
  type: 'status' | 'source' | 'result' | 'error' | 'message_saved'
  step: 'searching' | 'selecting' | 'generating' | 'extracting' | 'summarizing' | 'recording_disabled' | 'complete'
  message?: string
  message_id?: string  // message_saved 이벤트에서 사용
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

// 소크라 문답 모드: chat_mode='socratic'으로 스트리밍 시 SSE로 함께 전달되는 채점 이벤트
// (기존 SSE 파싱의 else 분기가 onProgress로 그대로 전달)
export type StreamProgressData = ChatStreamProgressData | SocraticScoreEvent | SocraticStageEvent | SocraticProgressEvent

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

// ─────────────────────────────────────────────────────────────────────────
// 소크라 문답 모드 (Socratic dialogue mode)
// ─────────────────────────────────────────────────────────────────────────

// v5: 유형별 문항 개요 — 백엔드가 stage_questions를 유형 블록으로 접어 내려준다.
// 정답 요지·힌트 정답 위치는 절대 포함되지 않는다(type/label/count/start_index 4개뿐).
// 구 백엔드 응답에는 없으므로 프론트는 항상 결측을 견뎌야 한다.
export interface SocraticStageOutlineItem {
  // 'TERM_MEMORY' | 'CONCEPT' | 'ANALYSIS_APPLY' | 'JUDGE_DESIGN' — 데이터 오염 시 null.
  type: string | null
  // 백엔드가 주제 데이터에 저장해 둔 한국어 라벨. 없으면 프론트 i18n 라벨로 대체한다.
  label?: string | null
  // 이 유형에 속한 문항 수 (1~3)
  count: number
  // 이 유형의 첫 문항이 stage_questions 배열에서 갖는 인덱스
  start_index: number
}

export interface SocraticTopic {
  id: string
  title: string
  description: string
  seed_question: string
  position: number
  // 요청 유저가 이 주제를 100점(마스터)까지 끝냈는지. 조회 실패 시 백엔드가 false로 폴백.
  mastered?: boolean
  // 파이프라인이 미리 만들어 둔 단계 질문 수.
  // v4까지는 항상 4, v5부터 4~8 가변(유형 4개 × 유형당 1~3문항).
  // 마이그레이션 이전에 생성된 옛 주제는 0 → 단계 표시를 감춘다.
  stage_total?: number
  // v5: 패널 초기 렌더용 유형별 개요. 구 백엔드에는 없다(→ 4노드 폴백).
  stage_outline?: SocraticStageOutlineItem[]
}

export interface SocraticAxisScores {
  clarity: number
  accuracy: number
  relevance: number
  depth: number
  reflection: number
}

// GET /ai-tutor/sessions/{sessionId}/socratic/start 응답
export interface SocraticStartResponse {
  topic: SocraticTopic
  message_id: string
  seed_question: string
  // 시작 직후 진행 단계 (항상 0 = 용어암기)
  current_stage?: number
}

// GET /ai-tutor/sessions/{sessionId}/socratic/state 응답
export interface SocraticStateResponse {
  axis_scores: SocraticAxisScores
  total_score: number
  penalty: number
  mastered_at: string | null
  // v2.0: 세션에서 진행 중인 소크라 주제 (히스토리 복원용). 없으면 null.
  topic?: SocraticTopic | null
  // 진행 상태 복원용. current_stage === stage_total 이면 전 단계 통과.
  current_stage?: number
  stage_total?: number
  // v5: 유형별 개요 — SSE 이벤트를 놓쳐도 패널이 유형별 진행 표시를 복구할 수 있다.
  stage_outline?: SocraticStageOutlineItem[]
  // v4: 체크포인트별 판정 결과·아하 횟수·세부 단계.
  // 총점(total_score)은 서버에서 checkpoint_results 합 − penalty 로 산출되므로,
  // 복원 시 이 배열을 함께 반영하지 않으면 패널·인쇄 요약표의 단계별 점수가 총점과 갈라진다.
  checkpoint_results?: SocraticCheckpointResult[]
  aha_count?: number
  phase?: 'root' | 'scaffold' | 'retry_root' | 'fallback'
  scaffold_depth?: number
}

// GET /ai-tutor/socratic/courses/{courseId}/leaderboard 응답 항목
export interface SocraticLeaderboardEntry {
  student_id: string
  name: string
  total_score: number
  mastered_topics: number
}

export interface SocraticLeaderboardResponse {
  course_id: string
  entries: SocraticLeaderboardEntry[]
}

// SSE 이벤트: chat_mode='socratic' 스트리밍 시 채팅 스트림에 함께 실려오는 채점 결과
// v4: axis_scores/applied_deltas는 백엔드가 더 이상 보내지 않음(레거시 호환을 위해 optional로 유지).
export interface SocraticScoreEvent {
  type: 'socratic_score'
  axis_scores?: SocraticAxisScores
  applied_deltas?: SocraticAxisScores
  total_score: number
  penalty?: number
  abuse: boolean
  praise: string
  suggestion: string
  mastered: boolean
}

// SSE 이벤트: 튜터가 학생 답변을 정답/오답/무관으로 판정한 뒤의 4단계 진행 상태.
// 정답(correct)일 때만 current_stage가 한 칸 올라간다.
// v4 이전 레거시 이벤트 — socratic_progress로 대체되지만 하위 호환을 위해 유지.
export interface SocraticStageEvent {
  type: 'socratic_stage'
  verdict: 'correct' | 'incorrect' | 'irrelevant' | null
  current_stage: number
  stage_total: number
}

// v4: 소크라 문답 진행 단계별 판정 결과 (어느 방식으로 통과했는지)
// v5: 디딤돌이 유형별 3회까지 가능해지면서 'scaffold3' 추가.
export interface SocraticCheckpointResult {
  index: number
  method: 'self' | 'scaffold1' | 'scaffold2' | 'scaffold3' | 'fallback'
  aha: boolean
  score: number
}

// SSE 이벤트: v4 소크라 문답 진행 상태 (root→scaffold→retry_root→fallback 단계 전이 포함).
// socratic_stage를 대체하며 checkpoint_results/phase/scaffold_depth/aha 정보를 추가로 담는다.
export interface SocraticProgressEvent {
  type: 'socratic_progress'
  verdict: 'correct' | 'incorrect' | 'irrelevant' | null
  checkpoint_index: number
  checkpoint_total: number
  phase: 'root' | 'scaffold' | 'retry_root' | 'fallback'
  scaffold_depth: number
  move: 'advance' | 'finish' | 'to_scaffold' | 'to_retry_root' | 'to_fallback' | 'hold'
  aha: boolean
  aha_count: number
  checkpoint_results: SocraticCheckpointResult[]
  total_score: number
  mastered: boolean
  // ── v5 추가 (전부 additive — 구 백엔드에는 없다) ──
  // 이제 답해야 할 문항의 유형과 유형 내 위치. "개념이해 2/3" 표시용.
  // 문답이 끝난 상태(checkpoint_index === checkpoint_total)에서는 null/0으로 내려온다.
  checkpoint_type?: string | null
  checkpoint_label?: string | null
  type_index?: number
  type_total?: number
  // 이 유형의 디딤돌 깊이 한계 (2 또는 3). 종료 상태에서는 0.
  max_scaffold_depth?: number
}

