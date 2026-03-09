import { API_BASE_URL, TOKEN_KEY } from './utils'
import { refreshSupabaseToken, handleJWTExpiration } from './supabase'

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
  auth?: boolean // 인증 토큰 포함 여부
}

type ApiResponse<T> = {
  data: T | null
  error: {
    error_code: string
    message: string
    actions?: Array<{
      type: string
      label: string
      description?: string
      endpoint?: string
      email?: string
    }>
  } | null
  status: number
}

/**
 * API 요청 유틸리티
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, headers = {}, auth = false } = options

  // 언어 설정 읽기 (Accept-Language 헤더용)
  const locale = typeof window !== 'undefined'
    ? localStorage.getItem('classduo_locale') || 'ko'
    : 'ko'

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept-Language': locale,
    ...headers,
  }

  // 인증 토큰 추가
  if (auth) {
    const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null
    if (!token) {
      // 토큰 없으면 불필요한 401 요청을 보내지 않고 즉시 반환
      return {
        data: null,
        error: { error_code: 'NO_TOKEN', message: '인증 토큰이 없습니다. 로그인이 필요합니다.' },
        status: 401,
      }
    }
    requestHeaders['Authorization'] = `Bearer ${token}`
  }

  try {
    let response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    })

    // 401 에러 발생 시 싱글턴 토큰 갱신 시도
    if (response.status === 401 && auth) {
      const refreshSuccess = await refreshSupabaseToken()

      if (refreshSuccess) {
        // 새 토큰으로 원래 요청 재시도
        const newToken = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null
        if (newToken) {
          requestHeaders['Authorization'] = `Bearer ${newToken}`
        }

        response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : undefined,
        })
      } else {
        // 갱신 실패 → 통합 logout (useAuthStore.logout() 포함)
        await handleJWTExpiration()
      }
    }

    // 204 No Content 등 body가 없는 응답은 json 파싱을 하지 않는다.
    if (response.status === 204) {
      return {
        data: null,
        error: null,
        status: response.status,
      }
    }

    const data = await response.json()

    if (!response.ok) {
      return {
        data: null,
        error: data.detail || { error_code: 'UNKNOWN_ERROR', message: '알 수 없는 오류가 발생했습니다' },
        status: response.status,
      }
    }

    return {
      data,
      error: null,
      status: response.status,
    }
  } catch (error) {
    // CORS 에러 또는 네트워크 에러
    const errorMessage = error instanceof TypeError
      ? 'CORS 오류: 백엔드 서버에 접근할 수 없습니다. 서버가 실행 중인지 확인해주세요.'
      : '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.'

    console.error('API Request Error:', error)

    return {
      data: null,
      error: {
        error_code: 'NETWORK_ERROR',
        message: errorMessage,
      },
      status: 0,
    }
  }
}
