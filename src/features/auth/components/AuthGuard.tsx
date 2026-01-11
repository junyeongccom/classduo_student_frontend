'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/features/auth'
import { Sidebar, LoginModal, SignupModal } from '@/shared/components/common'

export function AuthGuard({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated, isLoading } = useAuthStore()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showSignupModal, setShowSignupModal] = useState(false)

  // 로그인 상태 확인
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setShowLoginModal(true)
    } else {
      setShowLoginModal(false)
      setShowSignupModal(false)
    }
  }, [isAuthenticated, isLoading])

  return (
    <>
      {children}

      {/* 로그인 모달 - 로그인 안 되어 있으면 표시 */}
      <LoginModal 
        isOpen={showLoginModal}
        canClose={false}
        onClose={() => {
          // 로그인 필수이므로 닫기 불가
        }}
        onSwitchToSignup={() => {
          setShowLoginModal(false)
          setShowSignupModal(true)
        }}
      />

      {/* 회원가입 모달 */}
      <SignupModal
        isOpen={showSignupModal}
        onClose={() => {
          setShowSignupModal(false)
          setShowLoginModal(true)
        }}
        onSwitchToLogin={() => {
          setShowSignupModal(false)
          setShowLoginModal(true)
        }}
      />
    </>
  )
}
