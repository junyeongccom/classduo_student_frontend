/**
 * Supabase 클라이언트 설정
 * RLS를 사용하므로 현재 사용자의 Bearer Token을 세션으로 설정합니다.
 */
'use client'

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { TOKEN_KEY } from './utils'

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
 * 현재 사용자의 Bearer Token을 세션으로 설정합니다.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase 환경 변수가 설정되지 않았습니다.')
  }

  // 클라이언트가 이미 생성되어 있고 토큰이 변경되지 않았다면 재사용
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
  })

  // 현재 Bearer Token을 Supabase 세션으로 설정
  updateSupabaseSession()

  return supabaseClient
}

/**
 * 현재 Bearer Token을 Supabase 세션으로 업데이트
 * RLS를 위해 인증 토큰을 설정합니다.
 */
export function updateSupabaseSession(): void {
  if (typeof window === 'undefined' || !supabaseClient) {
    return
  }

  const token = localStorage.getItem(TOKEN_KEY)
  
  if (token) {
    // Bearer Token을 Supabase 세션으로 설정
    // Supabase는 JWT 토큰을 기대하므로, 백엔드에서 발급한 토큰을 그대로 사용
    supabaseClient.auth.setSession({
      access_token: token,
      refresh_token: '', // 필요시 추가
    } as any).catch((error) => {
      console.warn('[Supabase] 세션 설정 실패:', error)
    })
  }
}

/**
 * Supabase 클라이언트 초기화 (토큰 변경 시 호출)
 */
export function resetSupabaseClient(): void {
  supabaseClient = null
  getSupabaseClient()
}
