/**
 * 진척도 및 보상 상태 서비스
 */
import { getSupabaseClient, resetSupabaseClient } from '@/shared/lib/supabase'
import { apiRequest } from '@/shared/lib/api'
import { API_ENDPOINTS } from '@/shared/constants/api'

export interface LectureProgressStatus {
  lecture_id: string
  progress_count: number
  is_claimed: boolean
  is_claimable: boolean
}

/**
 * 모든 회차의 진척/보상 상태 조회
 * v_my_lecture_progress_status_all 뷰에서 데이터를 가져옵니다.
 */
export async function getLectureProgressStatusAll(): Promise<{
  data: LectureProgressStatus[] | null
  error: Error | null
}> {
  try {
    // 토큰이 변경되었을 수 있으므로 클라이언트 재생성
    resetSupabaseClient()
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('v_my_lecture_progress_status_all')
      .select('*')

    if (error) {
      console.error('[progressService] 진척도 조회 실패:', error)
      return { data: null, error: new Error(error.message) }
    }

    return { data: data as LectureProgressStatus[], error: null }
  } catch (error) {
    console.error('[progressService] 진척도 조회 예외:', error)
    return {
      data: null,
      error: error instanceof Error ? error : new Error('알 수 없는 오류가 발생했습니다'),
    }
  }
}

/**
 * 보상 클레임 API 호출
 */
export interface ClaimRewardResponse {
  success: boolean
  reward_type: string
  amount: number
}

export async function claimReward(lectureId: string): Promise<{
  data: ClaimRewardResponse | null
  error: { error_code: string; message: string } | null
}> {
  try {
    const result = await apiRequest<ClaimRewardResponse>(
      API_ENDPOINTS.REWARD.CLAIM(lectureId),
      {
        method: 'POST',
        auth: true,
      }
    )

    if (result.error) {
      return { data: null, error: result.error }
    }

    return { data: result.data, error: null }
  } catch (error) {
    console.error('[progressService] 보상 클레임 실패:', error)
    return {
      data: null,
      error: {
        error_code: 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
      },
    }
  }
}

/**
 * course_id별 불꽃 개수 조회
 * user_lecture_rewards 테이블에서 user_id와 course_id로 필터링하여 course_id별 개수 집계
 */
export async function getFlameCountByCourse(): Promise<{
  data: { [courseId: string]: number } | null
  error: Error | null
}> {
  try {
    // 토큰이 변경되었을 수 있으므로 클라이언트 재생성
    resetSupabaseClient()
    const supabase = getSupabaseClient()

    // user_lecture_rewards에서 현재 사용자의 모든 보상 조회
    // RLS로 인해 자동으로 user_id 필터링됨
    const { data, error } = await supabase
      .from('user_lecture_rewards')
      .select('course_id')

    if (error) {
      console.error('[progressService] 불꽃 개수 조회 실패:', error)
      return { data: null, error: new Error(error.message) }
    }

    // course_id별 개수 집계
    const flameCount: { [courseId: string]: number } = {}
    if (data) {
      data.forEach((reward) => {
        if (reward.course_id) {
          flameCount[reward.course_id] = (flameCount[reward.course_id] || 0) + 1
        }
      })
    }

    return { data: flameCount, error: null }
  } catch (error) {
    console.error('[progressService] 불꽃 개수 조회 예외:', error)
    return {
      data: null,
      error: error instanceof Error ? error : new Error('알 수 없는 오류가 발생했습니다'),
    }
  }
}
