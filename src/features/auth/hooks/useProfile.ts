'use client'

import { useState } from 'react'
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

      return { success: true, message: '프로필이 수정되었습니다.' }
    } catch (error) {
      const authError: AuthError = {
        error_code: 'UNEXPECTED_ERROR',
        message: '프로필 수정 중 오류가 발생했습니다.',
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

      return { success: true, message: '비밀번호가 변경되었습니다.' }
    } catch (error) {
      const authError: AuthError = {
        error_code: 'UNEXPECTED_ERROR',
        message: '비밀번호 변경 중 오류가 발생했습니다.',
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

      return { success: true, message: '회원 탈퇴가 완료되었습니다.' }
    } catch (error) {
      const authError: AuthError = {
        error_code: 'UNEXPECTED_ERROR',
        message: '회원 탈퇴 중 오류가 발생했습니다.',
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


