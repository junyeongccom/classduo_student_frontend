/**
 * 복습 빈칸 진행도 훅
 * 로컬 스토리지 대신 백엔드 API를 사용합니다.
 */
import { reviewService, type CompleteReviewRequest } from '../services/reviewService'

// 복습 빈칸 진행도 타입 (회차별 열어본 페이지 수)
interface ReviewBlankProgress {
  [lectureId: string]: {
    count: number // 열어본 페이지 수 (최대 5)
    revealedPages: number[] // 열어본 페이지 번호 목록 (2-6)
  }
}

// 복습 빈칸 진행도 로드 (더 이상 사용하지 않음, 하위 호환성 유지)
export const loadReviewBlankProgress = (): ReviewBlankProgress => {
  return {}
}

/**
 * 페이지 빈칸 열기 시 진행도 증가 (API 호출)
 * @param lectureId 회차 ID
 * @param pageNumber 페이지 번호 (2-6)
 * @param reviewAnswerId review_answer_id (API 호출에 필요)
 * @returns 성공 여부
 */
export const tryIncrementPageProgress = async (
  lectureId: string,
  pageNumber: number,
  reviewAnswerId: string
): Promise<boolean> => {
  if (typeof window === 'undefined') return false

  try {
    // API 호출
    const result = await reviewService.completeReview(lectureId, {
      review_answer_id: reviewAnswerId,
    })

    if (result.error) {
      console.error('[useReviewProgress] 복습 완료 API 호출 실패:', result.error)
      return false
    }

    // 성공 또는 이미 완료된 경우 모두 true 반환
    return true
  } catch (error) {
    console.error('[useReviewProgress] 복습 완료 API 호출 예외:', error)
    return false
  }
}
