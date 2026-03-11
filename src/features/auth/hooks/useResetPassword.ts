'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { authService } from '../services/authService'
import { ResetPasswordStep, AuthError } from '../types'

export function useResetPassword() {
  const t = useTranslations('errors')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [step, setStep] = useState<ResetPasswordStep>('email')
  const [email, setEmail] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [expiresIn, setExpiresIn] = useState(600)
  const [verificationCode, setVerificationCode] = useState<string[]>(['', '', '', '', '', ''])

  const clearError = () => setError(null)

  const handleSendCode = useCallback(async (inputEmail: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await authService.sendResetPasswordCode({ email: inputEmail })

      if (result.error) {
        const msg = result.status >= 400 && result.status < 500
          ? result.error.message
          : t('general')
        setError(msg)
        return { success: false }
      }

      if (result.data) {
        setEmail(inputEmail)
        setMaskedEmail(result.data.email_masked)
        setExpiresIn(result.data.expires_in)
        setStep('verify')
        return { success: true }
      }

      return { success: false }
    } catch {
      setError(t('general'))
      return { success: false }
    } finally {
      setIsLoading(false)
    }
  }, [t])

  const handleVerifyCode = useCallback(async (newPassword: string) => {
    const code = verificationCode.join('')
    if (code.length !== 6) {
      setError(t('codeInvalid'))
      return { success: false }
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await authService.verifyResetPasswordCode({
        email,
        code,
        new_password: newPassword,
        new_password_confirm: newPassword,
      })

      if (result.error) {
        const msg = result.status >= 400 && result.status < 500
          ? result.error.message
          : t('general')
        setError(msg)
        return { success: false }
      }

      setStep('success')
      return { success: true }
    } catch {
      setError(t('general'))
      return { success: false }
    } finally {
      setIsLoading(false)
    }
  }, [email, verificationCode, t])

  const handleResendCode = useCallback(async () => {
    if (!email) return { success: false }
    return handleSendCode(email)
  }, [email, handleSendCode])

  const handleCodeChange = useCallback((index: number, value: string) => {
    setVerificationCode(prev => {
      const newCode = [...prev]
      newCode[index] = value
      return newCode
    })
  }, [])

  const resetFlow = useCallback(() => {
    setStep('email')
    setEmail('')
    setMaskedEmail('')
    setExpiresIn(600)
    setVerificationCode(['', '', '', '', '', ''])
    setError(null)
  }, [])

  return {
    isLoading,
    error,
    step,
    email,
    maskedEmail,
    expiresIn,
    verificationCode,
    handleSendCode,
    handleVerifyCode,
    handleResendCode,
    handleCodeChange,
    resetFlow,
    clearError,
  }
}
