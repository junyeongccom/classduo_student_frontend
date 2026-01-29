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


