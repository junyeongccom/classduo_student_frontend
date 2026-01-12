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
 */
let supabaseClient: SupabaseClient | null = null

/**
 * Supabase 클라이언트 가져오기
 * 백엔드 JWT 토큰은 쿼리 시 직접 헤더로 전달됩니다.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase 환경 변수가 설정되지 않았습니다.')
  }

  // 클라이언트가 이미 생성되어 있으면 재사용
  if (supabaseClient) {
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
 */
export function resetSupabaseClient(): void {
  if (supabaseClient) {
    // 기존 클라이언트의 모든 연결 정리
    supabaseClient.removeAllChannels()
    // GoTrueClient 인스턴스도 정리
    if (supabaseClient.auth) {
      supabaseClient.auth.signOut()
    }
  }
  supabaseClient = null
  getSupabaseClient()
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
 * Refresh token으로 새 access token 발급 및 Supabase 클라이언트 재생성
 */
export async function refreshSupabaseToken(): Promise<boolean> {
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
