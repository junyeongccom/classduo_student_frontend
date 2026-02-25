'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { authService } from '../services/authService'
import { useAuthStore } from '../store/authStore'
import {
  ChangePasswordRequest,
  UpdateProfileRequest,
  DeleteAccountRequest,
  AuthError
} from '../types'

export function useProfile() {
  const { user, setUser, logout } = useAuthStore()
  const t = useTranslations('errors')
  const tMsg = useTranslations('auth.messages')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<AuthError | null>(null)

  /**
   * 프로필 수정
   */
  const updateProfile = async (data: UpdateProfileRequest) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await authService.updateProfile(data)

      if (result.error) {
        setError(result.error as AuthError)
        return { success: false, error: result.error }
      }

      // 로컬 상태 업데이트
      if (user) {
        setUser({ ...user, full_name: data.full_name })
      }

      return { success: true, message: tMsg('profileUpdated') }
    } catch (error) {
      const authError: AuthError = {
        error_code: 'UNEXPECTED_ERROR',
        message: t('profileUpdate'),
      }
      setError(authError)
      return { success: false, error: authError }
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * 비밀번호 변경
   */
  const changePassword = async (data: ChangePasswordRequest) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await authService.changePassword(data)

      if (result.error) {
        setError(result.error as AuthError)
        return { success: false, error: result.error }
      }

      return { success: true, message: tMsg('passwordChanged') }
    } catch (error) {
      const authError: AuthError = {
        error_code: 'UNEXPECTED_ERROR',
        message: t('passwordChange'),
      }
      setError(authError)
      return { success: false, error: authError }
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * 회원 탈퇴
   */
  const deleteAccount = async (data: DeleteAccountRequest) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await authService.deleteAccount(data)

      if (result.error) {
        setError(result.error as AuthError)
        return { success: false, error: result.error }
      }

      // 로그아웃 처리
      logout()

      return { success: true, message: tMsg('accountDeleted') }
    } catch (error) {
      const authError: AuthError = {
        error_code: 'UNEXPECTED_ERROR',
        message: t('deleteAccount'),
      }
      setError(authError)
      return { success: false, error: authError }
    } finally {
      setIsLoading(false)
    }
  }

  return {
    user,
    isLoading,
    error,
    updateProfile,
    changePassword,
    deleteAccount,
    clearError: () => setError(null),
  }
}
