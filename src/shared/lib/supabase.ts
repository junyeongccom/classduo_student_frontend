/**
 * Supabase 클라이언트 설정
 * RLS를 사용하므로 현재 사용자의 Bearer Token을 세션으로 설정합니다.
 */
'use client'

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { TOKEN_KEY, REFRESH_TOKEN_KEY } from './utils'
import { authService } from '@/features/auth/services/authService'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('⚠️ Supabase 환경 변수가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 확인하세요.')
}

/**
 * Supabase 클라이언트 인스턴스 (싱글톤)
 * 번들 중복 로딩으로 인한 다중 생성 방지를 위해 globalThis에 보관
 */
let supabaseClient: SupabaseClient | null = null
const getGlobalClient = (): SupabaseClient | null => {
  if (typeof window === 'undefined') {
    return null
  }
  const globalWithClient = globalThis as typeof globalThis & { __classduoSupabaseClient?: SupabaseClient }
  return globalWithClient.__classduoSupabaseClient ?? null
}

const setGlobalClient = (client: SupabaseClient) => {
  if (typeof window === 'undefined') {
    return
  }
  const globalWithClient = globalThis as typeof globalThis & { __classduoSupabaseClient?: SupabaseClient }
  globalWithClient.__classduoSupabaseClient = client
}

const applyRealtimeAuth = (client: SupabaseClient) => {
  const token = getAuthToken()
  if (!token) {
    console.warn('[supabase] applyRealtimeAuth: 토큰 없음, setAuth 스킵')
    return
  }
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    console.log('[supabase] applyRealtimeAuth: setAuth 호출, sub=', payload.sub, ', exp=', new Date(payload.exp * 1000).toISOString())
  } catch { /* ignore */ }
  client.realtime.setAuth(token)
}

/**
 * Supabase SDK 내부 세션 등록 (Realtime RLS auth.uid() 동작에 필수)
 * 교수자 프론트엔드의 syncSupabaseSession과 동일한 역할
 */
const applyAuthSession = (client: SupabaseClient) => {
  const token = getAuthToken()
  const refreshToken = typeof window !== 'undefined' ? localStorage.getItem(REFRESH_TOKEN_KEY) : null
  if (!token || !refreshToken) {
    console.warn('[supabase] applyAuthSession: 토큰/리프레시 없음, 스킵')
    return
  }

  console.log('[supabase] applyAuthSession: auth.setSession 호출 시작')
  client.auth.setSession({
    access_token: token,
    refresh_token: refreshToken,
  }).then(({ data, error }) => {
    if (error) {
      console.error('[supabase] auth.setSession 실패:', error.message)
    } else {
      console.log('[supabase] auth.setSession 성공, user_id=', data.user?.id)
    }
  }).catch((error) => {
    console.error('[supabase] auth.setSession 예외:', error)
  })
}

const applyRestHeaders = (client: SupabaseClient) => {
  const headers = getSupabaseHeaders()
  if (Object.keys(headers).length === 0) return
  const restClient = (client as unknown as { rest?: { headers?: Headers | Record<string, string> } }).rest
  const currentHeaders = restClient?.headers
  const nextHeaders =
    currentHeaders instanceof Headers
      ? new Headers(currentHeaders)
      : new Headers(currentHeaders ?? {})
  Object.entries(headers).forEach(([key, value]) => {
    nextHeaders.set(key, value)
  })
  if (restClient) {
    restClient.headers = nextHeaders
  }
}

/**
 * 토큰 갱신 타이머 (예방적 갱신용)
 */
let tokenRefreshTimer: NodeJS.Timeout | null = null

/**
 * 토큰 갱신 이벤트 리스너들 (realtimeService에서 사용)
 */
type TokenRefreshListener = () => void
const tokenRefreshListeners: Set<TokenRefreshListener> = new Set()

/**
 * 토큰 갱신 이벤트 리스너 등록
 */
export function onTokenRefresh(listener: TokenRefreshListener): () => void {
  tokenRefreshListeners.add(listener)
  return () => {
    tokenRefreshListeners.delete(listener)
  }
}

/**
 * JWT 토큰의 만료 시간 파싱
 */
function getTokenExpirationTime(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp ? payload.exp * 1000 : null // 초를 밀리초로 변환
  } catch (error) {
    console.error('[supabase] 토큰 만료 시간 파싱 실패:', error)
    return null
  }
}

/**
 * 토큰 만료까지 남은 시간 계산 (밀리초)
 */
function getTimeUntilExpiration(token: string | null): number | null {
  if (!token) return null
  
  const expTime = getTokenExpirationTime(token)
  if (!expTime) return null
  
  const now = Date.now()
  const timeUntilExpiration = expTime - now
  
  return timeUntilExpiration > 0 ? timeUntilExpiration : 0
}

/**
 * Supabase 클라이언트 가져오기
 * 백엔드 JWT 토큰은 쿼리 시 직접 헤더로 전달됩니다.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase 환경 변수가 설정되지 않았습니다.')
  }

  // 클라이언트가 이미 생성되어 있으면 재사용 (세션은 건드리지 않음)
  if (supabaseClient) {
    applyRestHeaders(supabaseClient)
    applyRealtimeAuth(supabaseClient)
    return supabaseClient
  }
  const globalClient = getGlobalClient()
  if (globalClient) {
    supabaseClient = globalClient
    applyRestHeaders(supabaseClient)
    applyRealtimeAuth(supabaseClient)
    return supabaseClient
  }

  // Supabase 클라이언트 생성
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false, // 세션은 수동으로 관리
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: getSupabaseHeaders(),
    },
  })
  applyRealtimeAuth(supabaseClient)
  applyAuthSession(supabaseClient)
  setGlobalClient(supabaseClient)

  return supabaseClient
}

/**
 * 현재 Bearer Token을 가져옵니다.
 * Supabase RLS를 위해 쿼리 시 이 토큰을 Authorization 헤더로 전달합니다.
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null
  }
  return localStorage.getItem(TOKEN_KEY)
}

/**
 * Supabase 쿼리에 Authorization 헤더를 추가합니다.
 * 백엔드에서 발급한 JWT 토큰을 사용하여 RLS를 활성화합니다.
 */
export function getSupabaseHeaders(): Record<string, string> {
  const token = getAuthToken()
  if (token) {
    return {
      'Authorization': `Bearer ${token}`,
    }
  }
  return {}
}

/**
 * Supabase 클라이언트 초기화 (토큰 변경 시 호출)
 * 채널 연결을 유지하기 위해 헤더만 업데이트하도록 개선
 */
export function resetSupabaseClient(): void {
  if (supabaseClient) {
    // 기존 클라이언트를 재생성하지 않고 헤더/Realtime 인증/SDK 세션 갱신
    applyRestHeaders(supabaseClient)
    applyRealtimeAuth(supabaseClient)
    applyAuthSession(supabaseClient)
    return
  }
  supabaseClient = getSupabaseClient()
}

/**
 * 에러 메시지 추출 (error.message가 없을 때 대체 메시지 사용)
 */
export function getErrorMessage(error: any): string {
  return error?.message || 
         error?.code || 
         '알 수 없는 오류가 발생했습니다'
}

/**
 * JWT 만료 에러인지 확인
 * PGRST303 에러 코드 또는 "JWT expired" 메시지 확인
 */
export function isJWTExpiredError(error: any): boolean {
  if (!error) return false
  
  const code = error.code || error.error_code
  const message = error.message || ''
  
  return code === 'PGRST303' || 
         message.includes('JWT expired') ||
         message.includes('JWT') ||
         message.includes('expired')
}

/**
 * 토큰 갱신 싱글턴 Promise
 * 동시에 여러 호출이 와도 실제 /auth/refresh는 1회만 실행
 */
let refreshPromise: Promise<boolean> | null = null

/**
 * Refresh token으로 새 access token 발급 및 Supabase 클라이언트 재생성
 * 싱글턴 패턴: 동시 호출 시 기존 Promise를 공유
 */
export async function refreshSupabaseToken(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = _doRefreshToken()
  try {
    return await refreshPromise
  } finally {
    refreshPromise = null
  }
}

async function _doRefreshToken(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false
  }

  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
  if (!refreshToken) {
    console.warn('[supabase] Refresh token이 없습니다.')
    return false
  }

  try {
    const refreshResult = await authService.refreshToken(refreshToken)

    if (refreshResult.data && !refreshResult.error) {
      // 새 토큰 저장
      localStorage.setItem(TOKEN_KEY, refreshResult.data.access_token)
      if (refreshResult.data.refresh_token) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshResult.data.refresh_token)
      }

      // Supabase 클라이언트 재생성 (새 토큰으로 헤더 업데이트)
      resetSupabaseClient()

      // 토큰 갱신 성공 시 이벤트 발생
      tokenRefreshListeners.forEach(listener => {
        try {
          listener()
        } catch (error) {
          console.error('[supabase] 토큰 갱신 리스너 실행 중 오류:', error)
        }
      })

      // 예방적 갱신 타이머 재설정
      startTokenRefreshTimer()

      return true
    } else {
      console.error('[supabase] 토큰 갱신 실패:', refreshResult.error)
      return false
    }
  } catch (error) {
    console.error('[supabase] 토큰 갱신 중 예외 발생:', error)
    return false
  }
}

/**
 * 토큰 유효성 사전 확인
 * 만료되었거나 60초 이내 만료 예정이면 갱신 시도 (Clock Skew 대응)
 */
export async function ensureValidToken(): Promise<boolean> {
  const token = getAuthToken()
  if (!token) return false

  const timeUntilExpiration = getTimeUntilExpiration(token)
  // 만료되었거나 60초 이내 만료 예정이면 갱신
  if (timeUntilExpiration === null || timeUntilExpiration < 60_000) {
    return await refreshSupabaseToken()
  }
  return true
}

/**
 * 토큰 만료 5분 전에 자동 갱신하는 타이머 시작
 */
export function startTokenRefreshTimer(): void {
  if (typeof window === 'undefined') {
    return
  }

  // 기존 타이머 정리
  if (tokenRefreshTimer) {
    clearTimeout(tokenRefreshTimer)
    tokenRefreshTimer = null
  }

  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) {
    return
  }

  const timeUntilExpiration = getTimeUntilExpiration(token)
  if (!timeUntilExpiration || timeUntilExpiration <= 0) {
    // 이미 만료된 토큰이면 즉시 갱신 시도
    refreshSupabaseToken().catch(error => {
      console.error('[supabase] 만료된 토큰 갱신 실패:', error)
    })
    return
  }

  // 만료 5분 전에 갱신 (5분 = 5 * 60 * 1000 밀리초)
  const REFRESH_BEFORE_EXPIRATION = 5 * 60 * 1000
  const timeUntilRefresh = Math.max(0, timeUntilExpiration - REFRESH_BEFORE_EXPIRATION)

  // 이미 5분 이내라면 즉시 갱신
  if (timeUntilRefresh <= 0) {
    refreshSupabaseToken().catch(error => {
      console.error('[supabase] 예방적 토큰 갱신 실패:', error)
    })
    return
  }

  // 타이머 설정
  tokenRefreshTimer = setTimeout(() => {
    console.log('[supabase] 예방적 토큰 갱신 시작 (만료 5분 전)')
    refreshSupabaseToken().catch(error => {
      console.error('[supabase] 예방적 토큰 갱신 실패:', error)
    })
  }, timeUntilRefresh)

  console.log(`[supabase] 토큰 갱신 타이머 설정: ${Math.round(timeUntilRefresh / 1000 / 60)}분 후 갱신 예정`)
}

/**
 * 토큰 갱신 타이머 정리
 */
export function stopTokenRefreshTimer(): void {
  if (tokenRefreshTimer) {
    clearTimeout(tokenRefreshTimer)
    tokenRefreshTimer = null
  }
}

/**
 * JWT 만료 에러 처리: 토큰 갱신 시도 및 실패 시 재로그인 유도
 */
export async function handleJWTExpiration(): Promise<boolean> {
  const refreshSuccess = await refreshSupabaseToken()
  
  if (!refreshSuccess) {
    // 토큰 갱신 실패 시 재로그인 유도
    // authStore를 동적 import하여 순환 참조 방지
    const { useAuthStore } = await import('@/features/auth/store/authStore')
    const logout = useAuthStore.getState().logout
    logout()
    
    console.warn('[supabase] 토큰 갱신 실패로 인해 로그아웃 처리되었습니다. 다시 로그인해주세요.')
  }
  
  return refreshSuccess
}
