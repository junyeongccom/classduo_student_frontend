import { API_BASE_URL, TOKEN_KEY } from './utils'
import { refreshSupabaseToken, handleJWTExpiration } from './supabase'
import { isAppWebView, requestTokenFromApp } from './appBridge'

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
 * UI 가 error.message 를 그대로 그리는 화면이 있어, message 에는 절대 에러 코드를 넣지 않는다.
 * 코드는 error_code 로만 전달하고(i18n 매핑용), message 는 사람이 읽을 문장으로 채운다.
 */
const FALLBACK_MESSAGE: Record<string, string> = {
  NO_TOKEN: '로그인이 필요합니다. 다시 로그인해 주세요.',
  CORS_ERROR: '서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  NETWORK_ERROR: '네트워크 연결을 확인해 주세요.',
}
const DEFAULT_MESSAGE = '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'

/** 코드처럼 보이는 문자열(LOAD_LECTURES_FAILED 등)은 학생에게 그대로 보여주지 않는다. */
function looksLikeErrorCode(value: unknown): boolean {
  return typeof value === 'string' && /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)+$/.test(value.trim())
}

/** 백엔드 detail 을 화면에 안전한 { error_code, message } 로 정규화한다. */
function normalizeError(detail: unknown, fallbackCode: string) {
  if (detail && typeof detail === 'object') {
    const d = detail as { error_code?: string; message?: string }
    const message = !d.message || looksLikeErrorCode(d.message)
      ? (FALLBACK_MESSAGE[d.error_code ?? ''] ?? DEFAULT_MESSAGE)
      : d.message
    return { ...d, error_code: d.error_code ?? fallbackCode, message }
  }
  // detail 이 문자열인 경우(FastAPI 기본 {"detail": "Not Found"}) — 원문은 코드 자리로 보낸다.
  const raw = typeof detail === 'string' ? detail : ''
  return {
    error_code: raw && looksLikeErrorCode(raw) ? raw : fallbackCode,
    message: !raw || looksLikeErrorCode(raw) ? (FALLBACK_MESSAGE[fallbackCode] ?? DEFAULT_MESSAGE) : raw,
  }
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
        error: { error_code: 'NO_TOKEN', message: FALLBACK_MESSAGE.NO_TOKEN },
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
      if (isAppWebView()) {
        // 앱 WebView 모드 — 자체 refresh 금지(refresh token 미주입).
        // 앱에 새 토큰을 요청(1회)하고 기존 실패 흐름(401 에러 반환)으로 진행 — 무한 대기 금지
        requestTokenFromApp()
      } else {
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
        error: normalizeError(data.detail, 'UNKNOWN_ERROR'),
        status: response.status,
      }
    }

    return {
      data,
      error: null,
      status: response.status,
    }
  } catch (error) {
    // CORS 에러 또는 네트워크 에러 — error_code로 전달, i18n 번역은 UI 레이어에서 처리
    const errorCode = error instanceof TypeError ? 'CORS_ERROR' : 'NETWORK_ERROR'

    console.error('API Request Error:', error)

    return {
      data: null,
      error: {
        error_code: errorCode,
        message: FALLBACK_MESSAGE[errorCode] ?? DEFAULT_MESSAGE,
      },
      status: 0,
    }
  }
}
