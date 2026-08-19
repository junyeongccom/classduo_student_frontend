/**
 * 복습 콘텐츠 API
 */
import { apiRequest } from '@/shared/lib/api'
import { API_ENDPOINTS } from '@/shared/constants/api'
import { isUUID } from '@/shared/lib/validation'
import type {
  CreateLectureReviewItemRequest,
  CreateLectureReviewItemResponse,
  DefinitionBuilderGameResponse,
  DeleteLectureReviewItemResponse,
  DeleteLectureReviewItemsResponse,
  GameSubmissionResponse,
  ImportLectureKeywordsResponse,
  LectureReviewListResponse,
  LectureWordCategoriesResponse,
  MatchingRankingResponse,
  RecordingLectureKeywordsResponse,
  ScoreRankingResponse,
  UpdateLectureReviewItemRequest,
  UpdateLectureReviewItemResponse,
} from '@/features/review/types'

export const reviewService = {
  /**
   * 사용자 강의 회차별 복습 어휘(lecture_review) 목록 조회
   */
  getLectureReviewItems: (lectureId: string) =>
    apiRequest<LectureReviewListResponse>(API_ENDPOINTS.REVIEW.GET_REVIEW_ITEMS(lectureId), {
      method: 'GET',
      auth: true,
    }),

  getDefinitionBuilderGame: (lectureId: string) => {
    if (!isUUID(lectureId)) {
      return Promise.resolve({ data: null, error: { message: 'Invalid ID', code: 'INVALID_ID' } })
    }
    return apiRequest<DefinitionBuilderGameResponse>(API_ENDPOINTS.REVIEW.GET_DEFINITION_BUILDER(lectureId), {
      method: 'GET',
      auth: true,
    })
  },

  /**
   * 단어 솔리테어 회차 콘텐츠. 비활성 회차도 200(`is_active=false`)이라 에러로 다루지 않는다.
   */
  getLectureWordCategories: (lectureId: string) => {
    if (!isUUID(lectureId)) {
      return Promise.resolve({ data: null, error: { message: 'Invalid ID', code: 'INVALID_ID' } })
    }
    return apiRequest<LectureWordCategoriesResponse>(API_ENDPOINTS.LEARNING.GET_WORD_CATEGORIES(lectureId), {
      method: 'GET',
      auth: true,
    })
  },

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

  deleteLectureReviewItems: (lectureId: string) =>
    apiRequest<DeleteLectureReviewItemsResponse>(API_ENDPOINTS.REVIEW.DELETE_REVIEW_ITEMS(lectureId), {
      method: 'DELETE',
      auth: true,
    }),

  /**
   * 강의 회차별 추천 키워드(lecture_keywords) 조회 (미리보기용)
   * - recording 도메인의 조회 API를 사용합니다.
   */
  getLectureKeywordsPreview: (lectureId: string) => {
    if (!isUUID(lectureId)) {
      return Promise.resolve({ data: null, error: { message: 'Invalid ID', code: 'INVALID_ID' } })
    }
    return apiRequest<RecordingLectureKeywordsResponse>(API_ENDPOINTS.RECORDING.GET_LECTURE_KEYWORDS(lectureId), {
      method: 'GET',
      auth: true,
    })
  },

  // ── Game Submission & Ranking ──

  submitDefinitionBuilderScore: (lectureId: string, score: number, totalQuestions: number, elapsedMs?: number) =>
    apiRequest<GameSubmissionResponse>(API_ENDPOINTS.GAME.SUBMIT_DEFINITION_BUILDER(lectureId), {
      method: 'POST',
      auth: true,
      body: { score, total_questions: totalQuestions, ...(elapsedMs != null && elapsedMs > 0 ? { elapsed_ms: elapsedMs } : {}) },
    }),

  submitMatchingGameScore: (lectureId: string, elapsedMs: number, pairCount: number) =>
    apiRequest<GameSubmissionResponse>(API_ENDPOINTS.GAME.SUBMIT_MATCHING(lectureId), {
      method: 'POST',
      auth: true,
      body: { elapsed_ms: elapsedMs, pair_count: pairCount },
    }),

  getDefinitionBuilderRankings: (lectureId: string, limit: number = 10) =>
    apiRequest<ScoreRankingResponse>(`${API_ENDPOINTS.GAME.RANKINGS_DEFINITION_BUILDER(lectureId)}?limit=${limit}`, {
      method: 'GET',
      auth: true,
    }),

  getMatchingGameRankings: (lectureId: string, pairCount: number, limit: number = 10) =>
    apiRequest<MatchingRankingResponse>(`${API_ENDPOINTS.GAME.RANKINGS_MATCHING(lectureId)}?pair_count=${pairCount}&limit=${limit}`, {
      method: 'GET',
      auth: true,
    }),
}

