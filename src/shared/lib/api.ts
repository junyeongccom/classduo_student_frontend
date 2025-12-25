import { API_BASE_URL, TOKEN_KEY } from './utils'

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

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  }

  // 인증 토큰 추가
  if (auth) {
    const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    })

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


