/**
 * 진척도 및 보상 상태 서비스
 */
import { 
  getSupabaseClient, 
  resetSupabaseClient,
  isJWTExpiredError,
  handleJWTExpiration,
  getErrorMessage
} from '@/shared/lib/supabase'
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
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('v_my_lecture_progress_status_all')
      .select('*')

    if (error) {
      // 에러 객체 전체를 로깅하여 디버깅 용이하게
      console.error('[progressService] 진척도 조회 실패:', {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })

      // JWT 만료 에러 감지 및 처리
      if (isJWTExpiredError(error)) {
        console.warn('[progressService] JWT 만료 감지, 토큰 갱신 시도 중...')
        const refreshSuccess = await handleJWTExpiration()
        
        if (!refreshSuccess) {
          return { 
            data: null, 
            error: new Error('세션이 만료되었습니다. 다시 로그인해주세요.') 
          }
        }
        
        // 토큰 갱신 성공 시에도 원래 쿼리는 실패로 반환 (사용자가 수동으로 재시도하도록)
        return { 
          data: null, 
          error: new Error('세션이 만료되어 갱신되었습니다. 다시 시도해주세요.') 
        }
      }

      // 에러 메시지 추출 개선 (error.message가 없을 때 대체 메시지 사용)
      const errorMessage = getErrorMessage(error)
      return { data: null, error: new Error(errorMessage) }
    }

    return { data: data as LectureProgressStatus[], error: null }
  } catch (error) {
    // 에러 객체 전체를 로깅하여 디버깅 용이하게
    console.error('[progressService] 진척도 조회 예외:', {
      error,
      type: typeof error,
      isError: error instanceof Error,
    })
    
    // JWT 만료 에러 감지 및 처리
    if (isJWTExpiredError(error)) {
      console.warn('[progressService] JWT 만료 감지 (예외), 토큰 갱신 시도 중...')
      const refreshSuccess = await handleJWTExpiration()
      
      if (!refreshSuccess) {
        return {
          data: null,
          error: new Error('세션이 만료되었습니다. 다시 로그인해주세요.'),
        }
      }
      
      return {
        data: null,
        error: new Error('세션이 만료되어 갱신되었습니다. 다시 시도해주세요.'),
      }
    }
    
    return {
      data: null,
      error: error instanceof Error ? error : new Error(getErrorMessage(error)),
    }
  }
}

/**
 * course_id별 보상 개수 조회
 * v_my_course_reward_counts 뷰에서 데이터를 가져옵니다.
 */
export interface CourseRewardCount {
  course_id: string
  total_amount: number
}

export async function getCourseRewardCounts(): Promise<{
  data: CourseRewardCount[] | null
  error: Error | null
}> {
  try {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('v_my_course_reward_counts')
      .select('course_id, total_amount')

    if (error) {
      // 에러 객체 전체를 로깅하여 디버깅 용이하게
      console.error('[progressService] 보상 개수 조회 실패:', {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        viewName: 'v_my_course_reward_counts',
        query: 'SELECT course_id, total_amount FROM v_my_course_reward_counts',
      })
      
      // 뷰가 존재하지 않는 경우를 명시적으로 체크
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.error('[progressService] 뷰가 존재하지 않습니다. SQL 스키마를 확인하세요.')
      }

      // JWT 만료 에러 감지 및 처리
      if (isJWTExpiredError(error)) {
        console.warn('[progressService] JWT 만료 감지, 토큰 갱신 시도 중...')
        const refreshSuccess = await handleJWTExpiration()
        
        if (!refreshSuccess) {
          return { 
            data: null, 
            error: new Error('세션이 만료되었습니다. 다시 로그인해주세요.') 
          }
        }
        
        // 토큰 갱신 성공 시에도 원래 쿼리는 실패로 반환 (사용자가 수동으로 재시도하도록)
        return { 
          data: null, 
          error: new Error('세션이 만료되어 갱신되었습니다. 다시 시도해주세요.') 
        }
      }

      // 에러 메시지 추출 개선 (error.message가 없을 때 대체 메시지 사용)
      const errorMessage = getErrorMessage(error)
      return { data: null, error: new Error(errorMessage) }
    }

    // 뷰에서 이미 집계되어 있으므로 클라이언트 측 집계 불필요
    console.log('[progressService] 보상 개수 조회 성공:', data)
    return { data: data as CourseRewardCount[], error: null }
  } catch (error) {
    // 에러 객체 전체를 로깅하여 디버깅 용이하게
    console.error('[progressService] 보상 개수 조회 예외:', {
      error,
      type: typeof error,
      isError: error instanceof Error,
    })
    
    // JWT 만료 에러 감지 및 처리
    if (isJWTExpiredError(error)) {
      console.warn('[progressService] JWT 만료 감지 (예외), 토큰 갱신 시도 중...')
      const refreshSuccess = await handleJWTExpiration()
      
      if (!refreshSuccess) {
        return {
          data: null,
          error: new Error('세션이 만료되었습니다. 다시 로그인해주세요.'),
        }
      }
      
      return {
        data: null,
        error: new Error('세션이 만료되어 갱신되었습니다. 다시 시도해주세요.'),
      }
    }
    
    return {
      data: null,
      error: error instanceof Error ? error : new Error(getErrorMessage(error)),
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
