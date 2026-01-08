'use client'

import { useEffect } from 'react'
import { authService } from '../services/authService'
import { useAuthStore } from '../store/authStore'
import { TOKEN_KEY } from '@/shared/lib/utils'

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
      }
      setLoading(false)
    }

    initAuth()
  }, [])

  return <>{children}</>
}

