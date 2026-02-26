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
        
        // 토큰 갱신 성공 시 원래 쿼리 자동 재시도
        console.log('[progressService] 토큰 갱신 성공, 쿼리 재시도 중...')
        const retrySupabase = getSupabaseClient()
        const retryResult = await retrySupabase
          .from('v_my_lecture_progress_status_all')
          .select('*')
        
        if (retryResult.error) {
          console.error('[progressService] 재시도 실패:', retryResult.error)
          return { 
            data: null, 
            error: new Error('세션이 갱신되었지만 쿼리 재시도에 실패했습니다. 다시 시도해주세요.') 
          }
        }
        
        return { data: retryResult.data as LectureProgressStatus[], error: null }
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
      
      // 토큰 갱신 성공 시 원래 쿼리 자동 재시도
      console.log('[progressService] 토큰 갱신 성공, 쿼리 재시도 중...')
      try {
        const retrySupabase = getSupabaseClient()
        const retryResult = await retrySupabase
          .from('v_my_lecture_progress_status_all')
          .select('*')
        
        if (retryResult.error) {
          console.error('[progressService] 재시도 실패:', retryResult.error)
          return {
            data: null,
            error: new Error('세션이 갱신되었지만 쿼리 재시도에 실패했습니다. 다시 시도해주세요.'),
          }
        }
        
        return { data: retryResult.data as LectureProgressStatus[], error: null }
      } catch (retryError) {
        console.error('[progressService] 재시도 중 예외 발생:', retryError)
        return {
          data: null,
          error: new Error('세션이 갱신되었지만 쿼리 재시도 중 오류가 발생했습니다.'),
        }
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
 * student_quiz_rewards 테이블에서 user_id 기준으로 해당 course_id의 보상 개수를 파악합니다.
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

    // lecture_id로 조회 후 lectures JOIN으로 course_id 도출
    const { data, error } = await supabase
      .from('student_quiz_rewards')
      .select('lecture_id, lectures!inner(course_id)')

    if (error) {
      console.error('[progressService] 보상 개수 조회 실패:', {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })

      if (isJWTExpiredError(error)) {
        console.warn('[progressService] JWT 만료 감지, 토큰 갱신 시도 중...')
        const refreshSuccess = await handleJWTExpiration()

        if (!refreshSuccess) {
          return {
            data: null,
            error: new Error('세션이 만료되었습니다. 다시 로그인해주세요.')
          }
        }

        console.log('[progressService] 토큰 갱신 성공, 쿼리 재시도 중...')
        const retrySupabase = getSupabaseClient()
        const retryResult = await retrySupabase
          .from('student_quiz_rewards')
          .select('lecture_id, lectures!inner(course_id)')

        if (retryResult.error) {
          console.error('[progressService] 재시도 실패:', retryResult.error)
          return {
            data: null,
            error: new Error('세션이 갱신되었지만 쿼리 재시도에 실패했습니다. 다시 시도해주세요.')
          }
        }

        return { data: aggregateRewardCounts(retryResult.data), error: null }
      }

      const errorMessage = getErrorMessage(error)
      return { data: null, error: new Error(errorMessage) }
    }

    return { data: aggregateRewardCounts(data), error: null }
  } catch (error) {
    console.error('[progressService] 보상 개수 조회 예외:', {
      error,
      type: typeof error,
      isError: error instanceof Error,
    })

    if (isJWTExpiredError(error)) {
      console.warn('[progressService] JWT 만료 감지 (예외), 토큰 갱신 시도 중...')
      const refreshSuccess = await handleJWTExpiration()

      if (!refreshSuccess) {
        return {
          data: null,
          error: new Error('세션이 만료되었습니다. 다시 로그인해주세요.'),
        }
      }

      console.log('[progressService] 토큰 갱신 성공, 쿼리 재시도 중...')
      try {
        const retrySupabase = getSupabaseClient()
        const retryResult = await retrySupabase
          .from('student_quiz_rewards')
          .select('lecture_id, lectures!inner(course_id)')

        if (retryResult.error) {
          console.error('[progressService] 재시도 실패:', retryResult.error)
          return {
            data: null,
            error: new Error('세션이 갱신되었지만 쿼리 재시도에 실패했습니다. 다시 시도해주세요.'),
          }
        }

        return { data: aggregateRewardCounts(retryResult.data), error: null }
      } catch (retryError) {
        console.error('[progressService] 재시도 중 예외 발생:', retryError)
        return {
          data: null,
          error: new Error('세션이 갱신되었지만 쿼리 재시도 중 오류가 발생했습니다.'),
        }
      }
    }

    return {
      data: null,
      error: error instanceof Error ? error : new Error(getErrorMessage(error)),
    }
  }
}

/** lecture JOIN 결과에서 course_id별 보상 개수 집계 */
function aggregateRewardCounts(data: unknown[] | null): CourseRewardCount[] {
  const rewardCountsMap = new Map<string, number>()

  if (data) {
    data.forEach((reward: any) => {
      const courseId = reward.lectures?.course_id
      if (courseId) {
        const current = rewardCountsMap.get(courseId) || 0
        rewardCountsMap.set(courseId, current + 1)
      }
    })
  }

  return Array.from(rewardCountsMap.entries()).map(([course_id, total_amount]) => ({
    course_id,
    total_amount,
  }))
}

/**
 * 보상 클레임 API 호출 (student_quiz_rewards 기반 엔드포인트)
 */
export interface ClaimRewardResponse {
  success: boolean
  lecture_id: string
  rewarded: boolean
  already_exists: boolean
  message: string
}

export async function claimReward(lectureId: string): Promise<{
  data: ClaimRewardResponse | null
  error: { error_code: string; message: string } | null
}> {
  try {
    const result = await apiRequest<{ lecture_id: string; rewarded: boolean; already_exists: boolean; message: string }>(
      `/quiz-status/lectures/${lectureId}/reward`,
      {
        method: 'POST',
        auth: true,
      }
    )

    if (result.error) {
      return { data: null, error: result.error }
    }

    return {
      data: {
        success: result.data?.rewarded === true || result.data?.already_exists === true,
        lecture_id: result.data?.lecture_id ?? lectureId,
        rewarded: result.data?.rewarded ?? false,
        already_exists: result.data?.already_exists ?? false,
        message: result.data?.message ?? '',
      },
      error: null,
    }
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
