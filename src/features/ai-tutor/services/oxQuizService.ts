/**
 * OX 퀴즈 서비스
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

export interface OXQuizQuestion {
  id: string // Supabase 테이블의 기본 키
  lecture_id: string
  question_no: number
  question_text: string
  question_text_eng?: string // 영어 질문 (선택적)
  correct_answer: boolean
  explanation?: string // 퀴즈 해설
  explanation_eng?: string // 영어 해설 (선택적)
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
    const supabase = getSupabaseClient()

    // 언어 설정 읽기
    const locale = typeof window !== 'undefined' 
      ? localStorage.getItem('classduo_locale') || 'ko'
      : 'ko'

    // 모든 필드 조회 (한국어 + 영어)
    const { data, error } = await supabase
      .from('ox_quiz_questions')
      .select('*')
      .eq('lecture_id', lectureId)
      .order('question_no', { ascending: true })

    if (error) {
      // 에러 객체 전체를 로깅하여 디버깅 용이하게
      console.error('[oxQuizService] OX 퀴즈 조회 실패:', {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })

      // JWT 만료 에러 감지 및 처리
      if (isJWTExpiredError(error)) {
        console.warn('[oxQuizService] JWT 만료 감지, 토큰 갱신 시도 중...')
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

    // 언어에 따라 필드 선택 (영어 필드가 없으면 한국어로 폴백)
    const localizedData: OXQuizQuestion[] = (data || []).map((item: any) => ({
      id: item.id,
      lecture_id: item.lecture_id,
      question_no: item.question_no,
      question_text: locale === 'en' 
        ? (item.question_text_eng || item.question_text)
        : item.question_text,
      question_text_eng: item.question_text_eng,
      correct_answer: item.correct_answer,
      explanation: locale === 'en'
        ? (item.explanation_eng || item.explanation)
        : item.explanation,
      explanation_eng: item.explanation_eng,
    }))

    return { data: localizedData, error: null }
  } catch (error) {
    // 에러 객체 전체를 로깅하여 디버깅 용이하게
    console.error('[oxQuizService] OX 퀴즈 조회 예외:', {
      error,
      type: typeof error,
      isError: error instanceof Error,
    })
    
    // JWT 만료 에러 감지 및 처리
    if (isJWTExpiredError(error)) {
      console.warn('[oxQuizService] JWT 만료 감지 (예외), 토큰 갱신 시도 중...')
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
