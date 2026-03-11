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
  const { setError, login } = useAuthStore()
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

  // Direct signup (인증 메일 없이 바로 가입)
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
          actions: result.error.actions,
        }
        setError(authError)
        return { success: false, error: authError }
      }

      if (result.data) {
        // 바로 토큰 저장 + 자동 로그인
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
  }, [setError, login, t])

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
    resetSignupFlow,
    goToHome,
  }
}
