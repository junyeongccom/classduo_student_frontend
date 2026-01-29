/**
 * 복습 콘텐츠 API
 */
import { apiRequest } from '@/shared/lib/api'
import { API_ENDPOINTS } from '@/shared/constants/api'
import type {
  CreateLectureReviewItemRequest,
  CreateLectureReviewItemResponse,
  DefinitionBuilderGameResponse,
  DeleteLectureReviewItemResponse,
  ImportLectureKeywordsResponse,
  LectureReviewListResponse,
  UpdateLectureReviewItemRequest,
  UpdateLectureReviewItemResponse,
} from '@/features/review/types'

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
  review_answer_id?: string | null // 복습 완료 API에 필요한 ID (백엔드에서 제공, 정답이 없으면 null)
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
  is_recording_source_disabled?: boolean
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
}

export interface ReviewCarouselResponse {
  page_1: ReviewCarouselPage1
  pages_2_6: ReviewCarouselPage2_6[]
}

export interface ReviewKeyAnswersByLecture {
  lecture_id: string
  key_answers: string[]
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
  getLectureListByCourse: (courseId: string, locale?: string) =>
    apiRequest<LectureListResponse>(API_ENDPOINTS.REVIEW.GET_LECTURE_LIST(courseId), {
      method: 'GET',
      auth: true,
      headers: locale ? { 'Accept-Language': locale } : undefined,
    }),

  /**
   * 복습 캐러셀 전체 데이터 조회
   */
  getReviewCarousel: (lectureId: string, locale?: string) =>
    apiRequest<ReviewCarouselResponse>(`/reviews/lectures/${lectureId}/carousel`, {
      method: 'GET',
      auth: true,
      headers: locale ? { 'Accept-Language': locale } : undefined,
    }),

  /**
   * lecture_id 리스트로 핵심정답 조회
   */
  getKeyAnswersByLectures: (lectureIds: string[], locale?: string) => {
    const lectureParam = encodeURIComponent(lectureIds.join(','))
    return apiRequest<ReviewKeyAnswersByLecture[]>(`/reviews/answers?lecture_ids=${lectureParam}`, {
      method: 'GET',
      auth: true,
      headers: locale ? { 'Accept-Language': locale } : undefined,
    })
  },

  /**
   * 복습 빈칸 클릭 완료 API 호출
   */
  completeReview: (lectureId: string, request: CompleteReviewRequest) =>
    apiRequest<CompleteReviewResponse>(API_ENDPOINTS.REVIEW.COMPLETE(lectureId), {
      method: 'POST',
      body: request,
      auth: true,
    }),

  /**
   * 사용자 강의 회차별 복습 어휘(lecture_review) 목록 조회
   */
  getLectureReviewItems: (lectureId: string) =>
    apiRequest<LectureReviewListResponse>(API_ENDPOINTS.REVIEW.GET_REVIEW_ITEMS(lectureId), {
      method: 'GET',
      auth: true,
    }),

  getDefinitionBuilderGame: (lectureId: string) =>
    apiRequest<DefinitionBuilderGameResponse>(API_ENDPOINTS.REVIEW.GET_DEFINITION_BUILDER(lectureId), {
      method: 'GET',
      auth: true,
    }),

  createLectureReviewItem: (lectureId: string, request: CreateLectureReviewItemRequest) =>
    apiRequest<CreateLectureReviewItemResponse>(API_ENDPOINTS.REVIEW.CREATE_REVIEW_ITEM(lectureId), {
      method: 'POST',
      auth: true,
      body: request,
    }),

  importLectureKeywordsToReview: (lectureId: string) =>
    apiRequest<ImportLectureKeywordsResponse>(API_ENDPOINTS.REVIEW.IMPORT_KEYWORDS(lectureId), {
      method: 'POST',
      auth: true,
    }),

  updateLectureReviewItem: (reviewItemId: string, request: UpdateLectureReviewItemRequest) =>
    apiRequest<UpdateLectureReviewItemResponse>(API_ENDPOINTS.REVIEW.UPDATE_REVIEW_ITEM(reviewItemId), {
      method: 'PATCH',
      auth: true,
      body: request,
    }),

  deleteLectureReviewItem: (reviewItemId: string) =>
    apiRequest<DeleteLectureReviewItemResponse>(API_ENDPOINTS.REVIEW.DELETE_REVIEW_ITEM(reviewItemId), {
      method: 'DELETE',
      auth: true,
    }),
}

