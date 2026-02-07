'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '../services/authService'
import { useAuthStore } from '../store/authStore'
import { SignUpRequest, AuthError, SignupStep, SendSignupCodeRequest } from '../types'
import { TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/shared/lib/utils'

export function useSignup() {
  const router = useRouter()
  const { setError, login } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)

  // New step-based state for verification code flow
  const [step, setStep] = useState<SignupStep>('form')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [expiresIn, setExpiresIn] = useState(600)
  const [verificationCode, setVerificationCode] = useState<string[]>(['', '', '', '', '', ''])
  const [formData, setFormData] = useState<SendSignupCodeRequest | null>(null)

  // Legacy signup flow (link-based)
  const handleSignup = async (data: SignUpRequest) => {
    setIsLoading(true)
    setError(null)
    setSignupSuccess(false)

    try {
      const result = await authService.signup(data)

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

  // New verification code-based signup flow
  const handleSendSignupCode = useCallback(async (data: SendSignupCodeRequest) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await authService.sendSignupCode(data)

      if (result.error) {
        // 4xx: 사용자 에러 (이미 가입된 이메일 등) → 실제 메시지 표시
        // 5xx: 서버 에러 → 일반 메시지 표시
        const authError: AuthError = result.status >= 400 && result.status < 500
          ? { error_code: result.error.error_code, message: result.error.message }
          : { error_code: 'API_ERROR', message: '오류가 발생했습니다.' }
        setError(authError)
        return { success: false, error: authError }
      }

      if (result.data) {
        setFormData(data)
        setRegisteredEmail(data.email)
        setMaskedEmail(result.data.email_masked)
        setExpiresIn(result.data.expires_in)
        setStep('verification')
        return { success: true, data: result.data }
      }

      return { success: false, error: { error_code: 'UNKNOWN', message: '오류가 발생했습니다.' } }
    } catch (error) {
      const authError: AuthError = {
        error_code: 'UNEXPECTED_ERROR',
        message: '오류가 발생했습니다.',
      }
      setError(authError)
      return { success: false, error: authError }
    } finally {
      setIsLoading(false)
    }
  }, [setError])

  const handleVerifySignupCode = useCallback(async () => {
    if (!registeredEmail) {
      setError({ error_code: 'NO_EMAIL', message: '이메일 정보가 없습니다.' })
      return { success: false }
    }

    const code = verificationCode.join('')
    if (code.length !== 6) {
      setError({ error_code: 'INVALID_CODE', message: '6자리 인증 코드를 입력해주세요.' })
      return { success: false }
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await authService.verifySignupCode({
        email: registeredEmail,
        code,
      })

      if (result.error) {
        // 4xx: 사용자 에러 (잘못된 인증 코드 등) → 실제 메시지 표시
        // 5xx: 서버 에러 → 일반 메시지 표시
        const authError: AuthError = result.status >= 400 && result.status < 500
          ? { error_code: result.error.error_code, message: result.error.message }
          : { error_code: 'API_ERROR', message: '오류가 발생했습니다.' }
        setError(authError)
        return { success: false, error: authError }
      }

      if (result.data) {
        // Auto login with tokens
        if (result.data.access_token) {
          localStorage.setItem(TOKEN_KEY, result.data.access_token)
          if (result.data.refresh_token) {
            localStorage.setItem(REFRESH_TOKEN_KEY, result.data.refresh_token)
          }
          login({
            access_token: result.data.access_token,
            refresh_token: result.data.refresh_token || '',
            expires_in: result.data.expires_in,
            token_type: result.data.token_type,
          })
        }

        setStep('success')
        setSignupSuccess(true)
        return { success: true, data: result.data }
      }

      return { success: false, error: { error_code: 'UNKNOWN', message: '오류가 발생했습니다.' } }
    } catch (error) {
      const authError: AuthError = {
        error_code: 'UNEXPECTED_ERROR',
        message: '오류가 발생했습니다.',
      }
      setError(authError)
      return { success: false, error: authError }
    } finally {
      setIsLoading(false)
    }
  }, [registeredEmail, verificationCode, setError, login])

  const handleVerificationCodeChange = useCallback((index: number, value: string) => {
    setVerificationCode(prev => {
      const newCode = [...prev]
      newCode[index] = value
      return newCode
    })
  }, [])

  const handleResendCode = useCallback(async () => {
    if (!formData) return { success: false }
    return handleSendSignupCode(formData)
  }, [formData, handleSendSignupCode])

  const resetSignupFlow = useCallback(() => {
    setStep('form')
    setVerificationCode(['', '', '', '', '', ''])
    setFormData(null)
    setRegisteredEmail(null)
    setMaskedEmail('')
    setExpiresIn(600)
    setSignupSuccess(false)
    setError(null)
  }, [setError])

  const handleResendVerification = async (email: string) => {
    setIsLoading(true)

    try {
      const result = await authService.resendVerification({ email })

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

  const goToHome = () => {
    router.push('/')
  }

  return {
    // Legacy
    handleSignup,
    handleResendVerification,
    goToLogin,
    isLoading,
    signupSuccess,
    registeredEmail,

    // New verification code flow
    step,
    maskedEmail,
    expiresIn,
    verificationCode,
    handleSendSignupCode,
    handleVerifySignupCode,
    handleVerificationCodeChange,
    handleResendCode,
    resetSignupFlow,
    goToHome,
  }
}


