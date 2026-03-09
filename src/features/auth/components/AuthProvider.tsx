'use client'

import { useEffect } from 'react'
import { authService } from '../services/authService'
import { useAuthStore } from '../store/authStore'
import { TOKEN_KEY } from '@/shared/lib/utils'
import { startTokenRefreshTimer, stopTokenRefreshTimer } from '@/shared/lib/supabase'
import { setAnalyticsUser, setUserProperties } from '@/shared/hooks/useAnalytics'
import { initAnalytics } from '@/shared/lib/analytics'

/**
 * 앱 시작 시 인증 상태를 초기화하는 Provider
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading, logout, isAuthenticated } = useAuthStore()

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem(TOKEN_KEY)
      
      if (!token) {
        // 토큰이 없으면 로그아웃 상태로 설정
        logout()
        setLoading(false)
        return
      }

      // 토큰이 있으면 사용자 정보 조회
      setLoading(true)
      const result = await authService.getMe()
      
      if (result.error) {
        // 토큰이 유효하지 않음
        logout()
      } else {
        setUser(result.data)
        if (result.data?.user_id) setAnalyticsUser(result.data.user_id)
        if (result.data?.school) setUserProperties({ user_group: result.data.school })
        // 인증 성공 시 토큰 갱신 타이머 시작
        startTokenRefreshTimer()
      }
      setLoading(false)
    }

    initAuth()
    initAnalytics()

    // 컴포넌트 언마운트 시 타이머 정리
    return () => {
      stopTokenRefreshTimer()
    }
  }, [])

  return <>{children}</>
}

