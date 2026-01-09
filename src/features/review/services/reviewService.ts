/**
 * 복습 콘텐츠 API
 */
import { apiRequest } from '@/shared/lib/api'

// API 응답 타입
export interface LectureListItem {
  lecture_id: string
  lecture_date: string
  essence_7words: string | null
}

export interface LectureListResponse {
  course_id: string
  course_title: string
  section: string | null
  lectures: LectureListItem[]
}

export interface ReviewQuestion {
  question_order: number
  question_name: string
  description: string | null
  mece_category: string | null
}

export interface ReviewBlank {
  blank_text: string
  answer_text: string
  position: number
  blank_type: string
}

export interface ReviewAnswer {
  key_answer: string
  supplementary_explanation: string
  blanks: ReviewBlank[]
}

export interface ReviewSource {
  recording_chunks: Array<{
    id: string
    recording_id: string
    chunk_index: number
    text_content: string
    start_time: number
    end_time: number
    summary?: {
      title: string
      content: string
    } | null
  }>
  material_pages: Array<{
    id: string
    material_id: string
    page_number: number
    text_content: string
    image_path: string | null
    image_url: string | null
    image_width: number | null
    image_height: number | null
  }>
}

export interface ReviewCarouselPage1 {
  lecture_id: string
  course_title: string
  section: string | null
  essence_one_line: string | null
  essence_7words: string | null
  questions: ReviewQuestion[]
  thumbnail_image_url: string | null
}

export interface ReviewCarouselPage2_6 {
  lecture_id: string
  page_number: number
  course_title: string
  question: ReviewQuestion
  answer: ReviewAnswer
  sources: ReviewSource
  review_answer_id?: string // 복습 완료 API에 필요한 ID (백엔드에서 제공)
}

export interface ReviewCarouselResponse {
  page_1: ReviewCarouselPage1
  pages_2_6: ReviewCarouselPage2_6[]
}

export interface CompleteReviewRequest {
  review_answer_id: string
}

export interface CompleteReviewResponse {
  success: boolean
  is_already_completed: boolean
}

export const reviewService = {
  /**
   * 특정 강의의 회차 리스트 조회
   */
  getLectureListByCourse: (courseId: string) =>
    apiRequest<LectureListResponse>(`/reviews/courses/${courseId}/lectures`, {
      method: 'GET',
      auth: true,
    }),

  /**
   * 복습 캐러셀 전체 데이터 조회
   */
  getReviewCarousel: (lectureId: string) =>
    apiRequest<ReviewCarouselResponse>(`/reviews/lectures/${lectureId}/carousel`, {
      method: 'GET',
      auth: true,
    }),

  /**
   * 복습 빈칸 클릭 완료 API 호출
   */
  completeReview: (lectureId: string, request: CompleteReviewRequest) =>
    apiRequest<CompleteReviewResponse>(API_ENDPOINTS.REVIEW.COMPLETE(lectureId), {
      method: 'POST',
      body: request,
      auth: true,
    }),
}

