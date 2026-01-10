/**
 * OX 퀴즈 서비스
 */
import { getSupabaseClient, resetSupabaseClient } from '@/shared/lib/supabase'
import { apiRequest } from '@/shared/lib/api'
import { API_ENDPOINTS } from '@/shared/constants/api'

export interface OXQuizQuestion {
  id: string // Supabase 테이블의 기본 키
  lecture_id: string
  question_no: number
  question_text: string
  correct_answer: boolean
  explanation?: string // 퀴즈 해설
}

/**
 * 특정 회차의 OX 퀴즈 문항 조회
 * ox_quiz_questions 테이블에서 lecture_id 기준으로 조회하고 question_no 순서로 정렬합니다.
 */
export async function getOXQuizQuestions(lectureId: string): Promise<{
  data: OXQuizQuestion[] | null
  error: Error | null
}> {
  try {
    // 토큰이 변경되었을 수 있으므로 클라이언트 재생성
    resetSupabaseClient()
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('ox_quiz_questions')
      .select('*')
      .eq('lecture_id', lectureId)
      .order('question_no', { ascending: true })

    if (error) {
      console.error('[oxQuizService] OX 퀴즈 조회 실패:', error)
      return { data: null, error: new Error(error.message) }
    }

    return { data: data as OXQuizQuestion[], error: null }
  } catch (error) {
    console.error('[oxQuizService] OX 퀴즈 조회 예외:', error)
    return {
      data: null,
      error: error instanceof Error ? error : new Error('알 수 없는 오류가 발생했습니다'),
    }
  }
}

/**
 * OX 퀴즈 제출 API 호출
 */
export interface SubmitOXQuizRequest {
  ox_quiz_question_id: string
  submitted_answer: boolean
}

export interface SubmitOXQuizResponse {
  success: boolean
  is_already_completed: boolean
}

export async function submitOXQuiz(
  lectureId: string,
  request: SubmitOXQuizRequest
): Promise<{
  data: SubmitOXQuizResponse | null
  error: { error_code: string; message: string } | null
}> {
  try {
    const result = await apiRequest<SubmitOXQuizResponse>(
      API_ENDPOINTS.OX_QUIZ.SUBMIT(lectureId),
      {
        method: 'POST',
        body: request,
        auth: true,
      }
    )

    if (result.error) {
      return { data: null, error: result.error }
    }

    return { data: result.data, error: null }
  } catch (error) {
    console.error('[oxQuizService] OX 퀴즈 제출 실패:', error)
    return {
      data: null,
      error: {
        error_code: 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
      },
    }
  }
}
