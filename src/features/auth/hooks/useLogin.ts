'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '../services/authService'
import { useAuthStore } from '../store/authStore'
import { LoginRequest, AuthError } from '../types'

export function useLogin() {
  const router = useRouter()
  const { login, setUser, setLoading, setError } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (data: LoginRequest) => {
    setIsLoading(true)
    setLoading(true)
    setError(null)

    try {
      console.log('[로그인] 요청 시작:', data.email)
      
      // 1. 로그인 요청
      const loginResult = await authService.login(data)
      console.log('[로그인] API 응답:', loginResult)

      if (loginResult.error) {
        console.log('[로그인] 실패 - 에러:', loginResult.error)
        setError(loginResult.error as AuthError)
        return { success: false, error: loginResult.error }
      }

      console.log('[로그인] 성공 - 토큰 저장')
      // 2. 토큰 저장
      login(loginResult.data!)

      // 3. 사용자 정보 조회
      const meResult = await authService.getMe()

      if (meResult.error) {
        // 토큰은 저장되었지만 사용자 정보 조회 실패
        console.error('[로그인] 사용자 정보 조회 실패:', meResult.error)
      } else {
        console.log('[로그인] 사용자 정보 조회 성공:', meResult.data)
        setUser(meResult.data)
      }

      // 4. 대시보드로 이동
      console.log('[로그인] 대시보드로 이동')
      router.push('/dashboard/ai-tutor')
      
      return { success: true, data: loginResult.data }
    } catch (error) {
      console.error('[로그인] 예외 발생:', error)
      const authError: AuthError = {
        error_code: 'UNEXPECTED_ERROR',
        message: '로그인 중 오류가 발생했습니다.',
      }
      setError(authError)
      return { success: false, error: authError }
    } finally {
      setIsLoading(false)
      setLoading(false)
    }
  }

  return {
    handleLogin,
    isLoading,
  }
}


