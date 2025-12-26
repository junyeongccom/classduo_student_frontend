'use client'

import { useState } from 'react'
import { apiRequest } from '@/shared/lib/api'
import { API_ENDPOINTS } from '@/shared/constants/api'

interface ResetPasswordRequestData {
  email: string
}

interface UpdatePasswordData {
  access_token: string
  new_password: string
  new_password_confirm: string
}

export function useResetPassword() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // 비밀번호 재설정 이메일 요청
  const requestResetPassword = async (data: ResetPasswordRequestData) => {
    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await apiRequest<{ message: string; email: string }>(
        API_ENDPOINTS.AUTH.RESET_PASSWORD,
        {
          method: 'POST',
          body: data,
        }
      )

      if (response.error) {
        setError(response.error.message)
        return { success: false }
      }

      setSuccessMessage(response.data?.message || '비밀번호 재설정 이메일이 발송되었습니다.')
      return { success: true, message: response.data?.message }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '오류가 발생했습니다'
      setError(errorMessage)
      return { success: false }
    } finally {
      setIsLoading(false)
    }
  }

  // 새 비밀번호로 업데이트
  const updatePassword = async (data: UpdatePasswordData) => {
    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await apiRequest<{ message: string }>(
        API_ENDPOINTS.AUTH.UPDATE_PASSWORD,
        {
          method: 'PUT',
          body: data,
        }
      )

      if (response.error) {
        setError(response.error.message)
        return { success: false }
      }

      setSuccessMessage(response.data?.message || '비밀번호가 변경되었습니다.')
      return { success: true, message: response.data?.message }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '오류가 발생했습니다'
      setError(errorMessage)
      return { success: false }
    } finally {
      setIsLoading(false)
    }
  }

  const clearError = () => setError(null)
  const clearSuccessMessage = () => setSuccessMessage(null)

  return {
    isLoading,
    error,
    successMessage,
    requestResetPassword,
    updatePassword,
    clearError,
    clearSuccessMessage,
  }
}

