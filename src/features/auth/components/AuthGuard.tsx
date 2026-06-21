'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@/features/auth'
import { Sidebar, LoginModal, SignupModal } from '@/shared/components/common'
import { LanguageToggle } from '@/shared/components/common/LanguageToggle'
import { MaintenanceNoticeBody } from '@/shared/components/common/MaintenanceNoticeBody'
import { X } from 'lucide-react'

export function AuthGuard({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated, isLoading, clearError } = useAuthStore()
  const t = useTranslations('auth.guard')
  const [activeTab, setActiveTab] = useState<'signup' | 'login'>('signup')
  // 서비스 장애 사과 공지 — 인증화면 좌측 별도 카드로 노출. 종료 시 false.
  const [showNotice, setShowNotice] = useState(true)

  const handleTabChange = (tab: 'signup' | 'login') => {
    clearError()
    setActiveTab(tab)
  }

  // 인증 초기화 중에는 로딩 표시
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  // 미인증 상태에서는 children을 렌더링하지 않고 인증 모달만 표시
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center">
        {/* 배경 오버레이 */}
        <div className="absolute inset-0 bg-black/30" />

        {/* 사과 공지 (인증 모달 좌측 별도 카드, 데스크탑 — 위치 안 겹침) */}
        {showNotice && (
          <div className="fixed z-20 top-1/2 -translate-y-1/2 left-4 lg:left-[calc(50%-280px-380px)] w-[360px] max-h-[88vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 shadow-xl p-6 hidden lg:block">
            <div className="flex justify-end -mt-2 -mr-2 mb-1">
              <button
                onClick={() => setShowNotice(false)}
                aria-label="닫기"
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <MaintenanceNoticeBody />
          </div>
        )}

        {/* 사과 공지 (모바일, 상단 — 스크롤) */}
        {showNotice && (
          <div className="fixed z-20 top-2 left-3 right-3 max-h-[45vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 shadow-xl p-4 lg:hidden">
            <div className="flex justify-end -mt-1 -mr-1 mb-1">
              <button
                onClick={() => setShowNotice(false)}
                aria-label="닫기"
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <MaintenanceNoticeBody />
          </div>
        )}

        {/* 기존 회원가입/로그인 모달 (정중앙) */}
        <div className="relative z-10 w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-xl">
          {/* 탭 네비게이션 */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => handleTabChange('signup')}
              className={`flex-1 px-6 py-3 text-center font-medium transition-colors ${
                activeTab === 'signup'
                  ? 'text-gray-900 border-b-2 border-gray-900 dark:text-gray-100 dark:border-gray-100'
                  : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
              }`}
            >
              {t('signupTab')}
            </button>
            <button
              onClick={() => handleTabChange('login')}
              className={`flex-1 px-6 py-3 text-center font-medium transition-colors ${
                activeTab === 'login'
                  ? 'text-gray-900 border-b-2 border-gray-900 dark:text-gray-100 dark:border-gray-100'
                  : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
              }`}
            >
              {t('loginTab')}
            </button>
          </div>

          {/* 안내 문구 — 로그인 탭에서만 표시 */}
          {activeTab === 'login' && (
            <div className="mx-6 mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 text-center dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300">
              {t('loginNoticeLine1')}<br />
              {t('loginNoticeLine2')}
            </div>
          )}

          {/* 콘텐츠 */}
          <div className="p-8">
            {activeTab === 'login' ? (
              <LoginModal
                isOpen={true}
                canClose={false}
                embedded={true}
                onClose={() => {}}
                onSwitchToSignup={() => handleTabChange('signup')}
              />
            ) : (
              <SignupModal
                isOpen={true}
                embedded={true}
                onClose={() => {}}
                onSwitchToLogin={() => handleTabChange('login')}
              />
            )}
          </div>

          {/* 언어 전환 */}
          <div className="flex justify-center pb-4">
            <LanguageToggle size="sm" />
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
