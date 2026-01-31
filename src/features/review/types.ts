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


