'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@/features/auth'
import { Sidebar, LoginModal, SignupModal } from '@/shared/components/common'
import { LanguageToggle } from '@/shared/components/common/LanguageToggle'
import { Info, X } from 'lucide-react'

// 긴급 점검 공지 토글 — 점검 종료 후 false 로 변경하면 즉시 비표시.
const SHOW_MAINTENANCE_NOTICE = true

export function AuthGuard({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated, isLoading, clearError } = useAuthStore()
  const t = useTranslations('auth.guard')
  const [activeTab, setActiveTab] = useState<'signup' | 'login'>('signup')
  // 인증코드 제거(directSignup 직가입)로 '인증 메일/관리자 승인' 공지 비표시. JSX 보존(롤백=true).
  const [showNotice, setShowNotice] = useState(false)

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

        {/* 공지 모달 (왼쪽 고정) */}
        {showNotice && (
          <div className="fixed z-20 top-1/2 -translate-y-1/2 left-4 lg:left-[calc(50%-280px-380px)] w-[340px] max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 shadow-xl p-6 hidden lg:block">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-blue-100 dark:bg-blue-900/40 p-2">
                  <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                  {t('noticeTitle')}
                </h3>
              </div>
              <button
                onClick={() => setShowNotice(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {t('noticeLine1') && <p>{t('noticeLine1')}</p>}
              {t('noticeLine2') && <p>{t('noticeLine2')}</p>}
              {t('noticeLine3') && (
                <p className="text-gray-900 dark:text-gray-100 font-medium">
                  {t('noticeLine3')}
                </p>
              )}
              {t('noticeLine4') && <p>{t('noticeLine4')}</p>}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <LanguageToggle size="sm" />
              <button
                onClick={() => setShowNotice(false)}
                className="rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-6 py-2 text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
              >
                {t('noticeClose')}
              </button>
            </div>
          </div>
        )}

        {/* 모바일: 공지를 인증 모달 위에 표시 */}
        {showNotice && (
          <div className="fixed z-20 top-2 left-4 right-4 rounded-2xl bg-white dark:bg-gray-900 shadow-xl p-4 lg:hidden">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-xs">
                  {t('noticeTitle')}
                </h3>
              </div>
              <button
                onClick={() => setShowNotice(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              {t('noticeLine1') && <p>{t('noticeLine1')}</p>}
              {t('noticeLine2') && <p>{t('noticeLine2')}</p>}
              {t('noticeLine3') && (
                <p className="text-gray-900 dark:text-gray-100 font-medium">{t('noticeLine3')}</p>
              )}
              {t('noticeLine4') && <p>{t('noticeLine4')}</p>}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <LanguageToggle size="sm" />
              <button
                onClick={() => setShowNotice(false)}
                className="rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-1.5 text-xs font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
              >
                {t('noticeClose')}
              </button>
            </div>
          </div>
        )}

        {/* 기존 회원가입/로그인 모달 (정중앙) */}
        <div className="relative z-10 w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-xl">
          {/* 긴급 서버 점검 공지 (카드 최상단, 두 탭 공통) */}
          {SHOW_MAINTENANCE_NOTICE && (
            <div className="rounded-t-2xl bg-red-50 border-b border-red-200 px-6 py-4 text-center dark:bg-red-900/30 dark:border-red-800">
              <p className="text-sm font-bold text-red-800 dark:text-red-300">서버 점검 안내</p>
              <p className="mt-1.5 text-xs leading-relaxed text-red-700 dark:text-red-400">
                기말 접속 폭주로 서버 오류가 발생해 긴급 점검 중입니다. 불편을 드려 진심으로
                죄송합니다.
                <br />
                <span className="font-bold">오후 10시 30분</span>에 정상 오픈 예정입니다.
              </p>
            </div>
          )}

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
