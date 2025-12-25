'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '../api/authApi'
import { useAuthStore } from '../store/authStore'
import { TOKEN_KEY } from '@/shared/lib/utils'

/**
 * 인증 상태 체크 및 관리 훅
 */
export function useAuth() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return {
    user,
    isAuthenticated,
    isLoading,
    logout: handleLogout,
  }
}

/**
 * 인증이 필요한 페이지에서 사용
 * 로그인하지 않은 경우 로그인 페이지로 리다이렉트
 */
export function useRequireAuth() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuthStore()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  return { isAuthenticated, isLoading }
}

/**
 * 이미 로그인한 사용자가 접근하면 대시보드로 리다이렉트
 * (로그인/회원가입 페이지에서 사용)
 */
export function useRedirectIfAuthenticated() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuthStore()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard/ai-tutor')
    }
  }, [isAuthenticated, isLoading, router])

  return { isAuthenticated, isLoading }
}


