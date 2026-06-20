'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { authService } from '../services/authService'
import { useAuthStore } from '../store/authStore'
import { SignUpRequest, AuthError, SignupStep, SendSignupCodeRequest } from '../types'
import { TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/shared/lib/utils'

export function useSignup() {
  const router = useRouter()
  const { setError, login, setUser } = useAuthStore()
  const t = useTranslations('errors')
  const tMsg = useTranslations('auth.messages')
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
        const err = result.error as AuthError
        const localizedMessage = err.error_code && t.has(err.error_code) ? t(err.error_code) : err.message
        const localizedError: AuthError = { ...err, message: localizedMessage }
        setError(localizedError)
        return { success: false, error: localizedError }
      }

      // 회원가입 성공 - 이메일 인증 안내 페이지로 이동하거나 상태 업데이트
      setSignupSuccess(true)
      setRegisteredEmail(data.email)

      return { success: true, data: result.data }
    } catch (error) {
      const authError: AuthError = {
        error_code: 'UNEXPECTED_ERROR',
        message: t('signup'),
      }
      setError(authError)
      return { success: false, error: authError }
    } finally {
      setIsLoading(false)
    }
  }

  // 더블 서브밋 방지 (React 상태 업데이트 지연 대응)
  const sendingRef = useRef(false)

  // 회원가입 처리 (모달 폼 제출 핸들러)
  // 인증코드 단계 제거: send-code/verify-code 대신 directSignup 으로 바로 계정 생성 +
  // 자동 로그인. (기존 인증코드 플로우 handleVerifySignupCode/verification UI 는 보존하되 미사용)
  const handleSendSignupCode = useCallback(async (data: SendSignupCodeRequest) => {
    if (sendingRef.current) return { success: false }
    sendingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      const result = await authService.directSignup(data)

      if (result.error) {
        const code = result.error.error_code
        const message = result.status >= 400 && result.status < 500
          ? (code && t.has(code) ? t(code) : result.error.message)
          : t('general')

        const authError: AuthError = {
          error_code: code || 'API_ERROR',
          message,
          actions: result.error.actions || [],
        }
        setError(authError)
        return { success: false, error: authError }
      }

      if (result.data) {
        // 가입 즉시 자동 로그인 (directSignup 이 토큰 반환)
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
          // 프로필(user) 로드 — 우측 상단 프로필 영역(이름/이메일) 표시용. (정상 로그인과 동일 흐름)
          const meResult = await authService.getMe()
          if (!meResult.error && meResult.data) {
            setUser(meResult.data)
          }
        }
        setRegisteredEmail(data.email)
        setStep('success')
        setSignupSuccess(true)
        return { success: true, data: result.data }
      }

      return { success: false, error: { error_code: 'UNKNOWN', message: t('general') } }
    } catch (error) {
      const authError: AuthError = {
        error_code: 'UNEXPECTED_ERROR',
        message: t('general'),
      }
      setError(authError)
      return { success: false, error: authError }
    } finally {
      setIsLoading(false)
      sendingRef.current = false
    }
  }, [setError, login, setUser, t])

  const handleVerifySignupCode = useCallback(async () => {
    if (!registeredEmail) {
      setError({ error_code: 'NO_EMAIL', message: t('emailNotFound') })
      return { success: false }
    }

    const code = verificationCode.join('')
    if (code.length !== 6) {
      setError({ error_code: 'INVALID_CODE', message: t('codeInvalid') })
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
        const code = result.error.error_code
        const message = result.status >= 400 && result.status < 500
          ? (code && t.has(code) ? t(code) : result.error.message)
          : t('general')
        const authError: AuthError = {
          error_code: code || 'API_ERROR',
          message,
          actions: result.error.actions,
        }
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

      return { success: false, error: { error_code: 'UNKNOWN', message: t('general') } }
    } catch (error) {
      const authError: AuthError = {
        error_code: 'UNEXPECTED_ERROR',
        message: t('general'),
      }
      setError(authError)
      return { success: false, error: authError }
    } finally {
      setIsLoading(false)
    }
  }, [registeredEmail, verificationCode, setError, login, t])

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

  // 관리자 승인 회원가입 요청 — 바로 API 호출 후 안내 화면 전환
  const handleRequestAdminApproval = useCallback(async () => {
    if (!formData) return { success: false }

    setIsLoading(true)
    setError(null)

    try {
      const result = await authService.requestAdminApproval(formData)

      if (result.error) {
        const code = result.error.error_code
        const message = result.status >= 400 && result.status < 500
          ? (code && t.has(code) ? t(code) : result.error.message)
          : t('general')
        const authError: AuthError = {
          error_code: code || 'API_ERROR',
          message,
          actions: result.error.actions,
        }
        setError(authError)
        return { success: false, error: authError }
      }

      setStep('admin_approval_pending')
      return { success: true }
    } catch (error) {
      const authError: AuthError = {
        error_code: 'UNEXPECTED_ERROR',
        message: t('general'),
      }
      setError(authError)
      return { success: false, error: authError }
    } finally {
      setIsLoading(false)
    }
  }, [formData, setError, t])

  const handleResendVerification = async (email: string) => {
    setIsLoading(true)

    try {
      const result = await authService.resendVerification({ email })

      if (result.error) {
        return { success: false, error: result.error }
      }

      return { success: true, message: tMsg('emailResent') }
    } catch (error) {
      return {
        success: false,
        error: { error_code: 'UNEXPECTED_ERROR', message: t('emailResendError') }
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
    handleRequestAdminApproval,
    formData,
    resetSignupFlow,
    goToHome,
  }
}
