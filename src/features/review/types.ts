/**
 * Review domain public types
 * - Keep API response contracts and domain types here (feature boundary).
 */

export interface LectureReviewItem {
  id: string
  lecture_id: string
  keyword: string
  description: string
  created_at?: string | null
  updated_at?: string | null
}

export interface LectureReviewListResponse {
  lecture_id: string
  items: LectureReviewItem[]
  total_count: number
}

export interface CreateLectureReviewItemRequest {
  keyword: string
  description: string
}

export interface CreateLectureReviewItemResponse {
  success: boolean
  item_id: string
}

export interface DeleteLectureReviewItemResponse {
  success: boolean
}

export interface DeleteLectureReviewItemsResponse {
  success: boolean
  deleted_count: number
}

export interface UpdateLectureReviewItemRequest {
  keyword: string
  description: string
}

export interface UpdateLectureReviewItemResponse {
  success: boolean
  item_id: string
}

export interface ImportLectureKeywordsResponse {
  success: boolean
  inserted_count: number
  skipped_count: number
}

export interface DefinitionBuilderBlank {
  index: number
  token: string
}

export interface DefinitionBuilderQuestion {
  review_item_id: string
  keyword: string
  definition: string
  tokens: string[]
  blank_indices: number[]
  blanks: DefinitionBuilderBlank[]
  choices: string[]
}

export interface DefinitionBuilderGameResponse {
  lecture_id: string
  questions: DefinitionBuilderQuestion[]
  total_count: number
}

export interface RecordingLectureKeywordItem {
  keyword: string
  description: string
  keyword_eng?: string | null
  description_eng?: string | null
  keyword_index: number
}

export interface RecordingLectureKeywordsResponse {
  lecture_id: string
  keywords: RecordingLectureKeywordItem[]
  total_count: number
}

export type GuessTheTermSecretTerm = {
  keyword: string
  description: string
}

export interface GuessTheTermChatRequest {
  question: string
  secret_term: GuessTheTermSecretTerm
  locale: 'ko' | 'en'
}

export interface GuessTheTermChatResponse {
  answer: string
}

// ── Game Submission & Ranking Types ──

export interface GameSubmissionResponse {
  id: string
  rank: number
}

export interface ScoreRankingEntry {
  rank: number
  is_mine: boolean
  display_name: string | null
  /** 게임 닉네임 (백엔드가 제공하면 우선 표시, 없으면 display_name 폴백) */
  nickname?: string | null
  score: number
  elapsed_ms?: number | null
  achieved_at: string
}

export interface MatchingRankingEntry {
  rank: number
  is_mine: boolean
  display_name: string | null
  /** 게임 닉네임 (백엔드가 제공하면 우선 표시, 없으면 display_name 폴백) */
  nickname?: string | null
  elapsed_ms: number
  pair_count: number
  achieved_at: string
}

export interface ScoreMyBest {
  rank: number
  score: number
  elapsed_ms?: number | null
  achieved_at: string
}

export interface MatchingMyBest {
  rank: number
  elapsed_ms: number
  pair_count: number
  achieved_at: string
}

export interface ScoreRankingResponse {
  rankings: ScoreRankingEntry[]
  my_best: ScoreMyBest | null
}

export interface MatchingRankingResponse {
  rankings: MatchingRankingEntry[]
  my_best: MatchingMyBest | null
}


