'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '../api/authApi'
import { useAuthStore } from '../store/authStore'
import { SignUpRequest, AuthError } from '../types'

export function useSignup() {
  const router = useRouter()
  const { setError } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)

  const handleSignup = async (data: SignUpRequest) => {
    setIsLoading(true)
    setError(null)
    setSignupSuccess(false)

    try {
      const result = await authApi.signup(data)

      if (result.error) {
        setError(result.error as AuthError)
        return { success: false, error: result.error }
      }

      // 회원가입 성공 - 이메일 인증 안내 페이지로 이동하거나 상태 업데이트
      setSignupSuccess(true)
      setRegisteredEmail(data.email)
      
      return { success: true, data: result.data }
    } catch (error) {
      const authError: AuthError = {
        error_code: 'UNEXPECTED_ERROR',
        message: '회원가입 중 오류가 발생했습니다.',
      }
      setError(authError)
      return { success: false, error: authError }
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendVerification = async (email: string) => {
    setIsLoading(true)

    try {
      const result = await authApi.resendVerification({ email })

      if (result.error) {
        return { success: false, error: result.error }
      }

      return { success: true, message: '인증 이메일이 재전송되었습니다.' }
    } catch (error) {
      return { 
        success: false, 
        error: { error_code: 'UNEXPECTED_ERROR', message: '이메일 재전송 중 오류가 발생했습니다.' } 
      }
    } finally {
      setIsLoading(false)
    }
  }

  const goToLogin = () => {
    router.push('/login')
  }

  return {
    handleSignup,
    handleResendVerification,
    goToLogin,
    isLoading,
    signupSuccess,
    registeredEmail,
  }
}


