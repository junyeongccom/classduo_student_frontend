'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button, Input } from '@/shared/components/ui'
import { useLogin } from '@/features/auth/hooks/useLogin'
import { useResetPassword } from '@/features/auth/hooks/useResetPassword'
import { useAuthStore } from '@/features/auth/store/authStore'
import { VerificationCodeInput } from '@/features/auth/components/ui/VerificationCodeInput'
import { Mail, Lock, AlertCircle, X, ArrowLeft, CheckCircle } from 'lucide-react'

const SAVED_ACCOUNTS_KEY = 'classduo_saved_accounts'

interface SavedAccount {
  email: string
  name?: string
  lastLoginAt: string
}

function createLoginSchema(tv: ReturnType<typeof useTranslations<'auth.validation'>>) {
  return z.object({
    email: z
      .string()
      .min(1, tv('emailRequired'))
      .email(tv('emailInvalid')),
    password: z
      .string()
      .min(1, tv('passwordRequired')),
  })
}

function createResetPasswordSchema(tv: ReturnType<typeof useTranslations<'auth.validation'>>) {
  return z.object({
    email: z
      .string()
      .min(1, tv('emailRequired'))
      .email(tv('emailInvalid')),
  })
}

type LoginFormData = z.infer<ReturnType<typeof createLoginSchema>>
type ResetPasswordFormData = z.infer<ReturnType<typeof createResetPasswordSchema>>

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  canClose?: boolean // 닫기 가능 여부 (기본값: true)
  onSwitchToSignup?: () => void // 회원가입 모달로 전환
  embedded?: boolean // AuthGuard 탭 내부 렌더링 시 true
}

export function LoginModal({ isOpen, onClose, canClose = true, onSwitchToSignup, embedded = false }: LoginModalProps) {
  const t = useTranslations('loginModal')
  const tv = useTranslations('auth.validation')
  const { handleLogin, isLoading } = useLogin()
  const { error, clearError, user } = useAuthStore()
  const resetPassword = useResetPassword()
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)

  // 비밀번호 재설정 verify step용 로컬 state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const loginSchema = createLoginSchema(tv)
  const resetPasswordSchema = createResetPasswordSchema(tv)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const {
    register: registerReset,
    handleSubmit: handleSubmitReset,
    formState: { errors: resetErrors },
    reset: resetResetForm,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  // 저장된 계정 불러오기
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      const saved = localStorage.getItem(SAVED_ACCOUNTS_KEY)
      if (saved) {
        try {
          const accounts = JSON.parse(saved) as SavedAccount[]
          // 최근 로그인 순으로 정렬
          accounts.sort((a, b) => new Date(b.lastLoginAt).getTime() - new Date(a.lastLoginAt).getTime())
          setSavedAccounts(accounts.slice(0, 1)) // 최대 1개만 표시
        } catch (e) {
          console.error('Failed to parse saved accounts:', e)
        }
      }
    }
  }, [isOpen])

  // 모달이 닫힐 때 폼 초기화
  useEffect(() => {
    if (!isOpen) {
      reset()
      resetResetForm()
      clearError()
      resetPassword.clearError()
      resetPassword.resetFlow()
      setShowForm(false)
      setShowResetPassword(false)
      setNewPassword('')
      setConfirmPassword('')
      setPasswordError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // 로그인 성공 시 계정 저장
  const saveAccount = (email: string) => {
    if (typeof window === 'undefined') return

    const saved = localStorage.getItem(SAVED_ACCOUNTS_KEY)
    let accounts: SavedAccount[] = []

    if (saved) {
      try {
        accounts = JSON.parse(saved)
      } catch (e) {
        console.error('Failed to parse saved accounts:', e)
      }
    }

    // 기존 계정 제거 (중복 방지)
    accounts = accounts.filter(acc => acc.email !== email)

    // 새 계정 추가 (최대 1개만 저장)
    accounts = [{
      email,
      name: user?.full_name,
      lastLoginAt: new Date().toISOString(),
    }]

    localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(accounts))
  }

  const onSubmit = async (data: LoginFormData) => {
    clearError()
    const result = await handleLogin(data)
    if (result.success) {
      saveAccount(data.email)
      onClose()
    } else {
      // 로그인 실패 시 폼 표시 상태 유지
      setShowForm(true)
    }
  }

  // 저장된 계정으로 로그인
  const handleSavedAccountClick = (email: string) => {
    clearError() // 이전 에러 초기화
    setValue('email', email)
    setShowForm(true)
  }

  // 비밀번호 재설정: 이메일 입력 후 코드 전송
  const onSubmitResetEmail = async (data: ResetPasswordFormData) => {
    resetPassword.clearError()
    await resetPassword.handleSendCode(data.email)
  }

  // 비밀번호 재설정: 코드 검증 + 비밀번호 변경
  const onSubmitResetVerify = async () => {
    setPasswordError(null)
    resetPassword.clearError()

    if (!newPassword) {
      setPasswordError(tv('passwordRequired'))
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t('passwordMismatch'))
      return
    }

    await resetPassword.handleVerifyCode(newPassword)
  }

  // 비밀번호 찾기 화면으로 전환
  const handleShowResetPassword = () => {
    clearError()
    resetPassword.clearError()
    resetPassword.resetFlow()
    setShowResetPassword(true)
    setShowForm(false)
    setNewPassword('')
    setConfirmPassword('')
    setPasswordError(null)
  }

  // 로그인 화면으로 돌아가기
  const handleBackToLogin = () => {
    resetPassword.clearError()
    resetPassword.resetFlow()
    setShowResetPassword(false)
    setShowForm(false)
    setNewPassword('')
    setConfirmPassword('')
    setPasswordError(null)
  }

  if (!isOpen) return null

  // embedded 모드: 내부 콘텐츠만 렌더링 (모달 래퍼 없음)
  const renderContent = () => (
    <>
      {showResetPassword ? (
        renderResetPasswordContent()
      ) : (
        <>
          {/* 로고 */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('loginTitle')}</h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('chooseAccount')}</p>
          </div>

          {/* 저장된 계정 목록 */}
          {!showForm && savedAccounts.length > 0 && (
            <div className="mb-6 space-y-3">
              {savedAccounts.map((account) => {
                const initial = account.email.charAt(0).toUpperCase()
                return (
                  <button
                    key={account.email}
                    onClick={() => handleSavedAccountClick(account.email)}
                    className="flex w-full items-center gap-3 rounded-xl border-2 border-gray-200 bg-white p-3 transition-colors hover:border-gray-900 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-400 dark:hover:bg-gray-700"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 dark:bg-gray-100">
                      <span className="text-sm font-bold text-white dark:text-gray-900">{initial}</span>
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm text-gray-900 dark:text-gray-100">{account.email}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* 로그인 폼 */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  {...register('email')}
                  type="email"
                  placeholder={t('emailPlaceholder')}
                  className={`pl-12 ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                />
              </div>
              {errors.email?.message && (
                <p className="mt-1.5 text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  {...register('password')}
                  type="password"
                  placeholder={t('passwordPlaceholder')}
                  className={`pl-12 ${errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                />
              </div>
              {errors.password?.message && (
                <p className="mt-1.5 text-xs text-red-500">{errors.password.message}</p>
              )}

              {/* 에러 메시지 - 비밀번호 입력 칸 아래 */}
              {error && (
                <div className="mt-2">
                  <p className="text-sm text-red-600">{error.message}</p>
                  {onSwitchToSignup && (
                    <button
                      type="button"
                      onClick={onSwitchToSignup}
                      className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100 hover:underline"
                    >
                      계정이 없으신가요? 회원가입하기
                    </button>
                  )}
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-gray-900"
              size="lg"
              isLoading={isLoading}
            >
              {t('loginTitle')}
            </Button>
          </form>

          {/* 비밀번호 찾기 링크 (embedded 모드에서는 회원가입 링크 불필요 — 탭이 대체) */}
          <div className="mt-6 flex items-center justify-center gap-4 text-center">
            <button
              onClick={handleShowResetPassword}
              className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {t('findPassword')}
            </button>
          </div>
        </>
      )}
    </>
  )

  if (embedded) {
    return renderContent()
  }

  // 비밀번호 재설정 섹션 렌더링
  const renderResetPasswordContent = () => {
    // Step: success
    if (resetPassword.step === 'success') {
      return (
        <>
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{t('successTitle')}</h1>
            <p className="mt-2 text-sm text-gray-500">{t('successMessage')}</p>
          </div>

          <Button
            type="button"
            className="w-full bg-gray-900"
            size="lg"
            onClick={handleBackToLogin}
          >
            {t('goToLogin')}
          </Button>
        </>
      )
    }

    // Step: verify
    if (resetPassword.step === 'verify') {
      return (
        <>
          {/* 뒤로가기 버튼 */}
          <button
            onClick={handleBackToLogin}
            className="mb-4 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('backToLogin')}
          </button>

          {/* 제목 */}
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900">{t('verifyStepTitle')}</h1>
            <p className="mt-2 text-sm text-gray-500">{t('verifyStepSubtitle')}</p>
          </div>

          {/* 마스킹된 이메일 + 유효 시간 */}
          <div className="mb-6 rounded-lg bg-gray-50 p-3 text-center text-sm text-gray-700">
            <span className="font-medium">{resetPassword.maskedEmail}</span>
            {t('codeSentTo')}
            <br />
            <span className="text-xs text-gray-500">
              {t('validFor')}: {Math.floor(resetPassword.expiresIn / 60)}{t('minutesUnit')}
            </span>
          </div>

          {/* 인증 코드 입력 */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              {t('enterCode')}
            </label>
            <VerificationCodeInput
              value={resetPassword.verificationCode}
              onChange={resetPassword.handleCodeChange}
              disabled={resetPassword.isLoading}
            />
          </div>

          {/* 새 비밀번호 */}
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('newPasswordLabel')}
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <Input
                type="password"
                placeholder={t('newPasswordPlaceholder')}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pl-12"
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">{t('passwordRequirements')}</p>
          </div>

          {/* 비밀번호 확인 */}
          <div className="mb-6">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('confirmPasswordLabel')}
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <Input
                type="password"
                placeholder={t('confirmPasswordPlaceholder')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-12"
              />
            </div>
          </div>

          {/* 에러 메시지 */}
          {(resetPassword.error || passwordError) && (
            <p className="mb-4 text-sm text-red-600">
              {resetPassword.error || passwordError}
            </p>
          )}

          {/* 비밀번호 재설정 버튼 */}
          <Button
            type="button"
            className="w-full bg-gray-900"
            size="lg"
            isLoading={resetPassword.isLoading}
            onClick={onSubmitResetVerify}
          >
            {resetPassword.isLoading ? t('resettingPassword') : t('resetPasswordButton')}
          </Button>

          {/* 인증 코드 재전송 */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={resetPassword.handleResendCode}
              disabled={resetPassword.isLoading}
              className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              {t('resendCode')}
            </button>
          </div>
        </>
      )
    }

    // Step: email (기본)
    return (
      <>
        {/* 뒤로가기 버튼 */}
        <button
          onClick={handleBackToLogin}
          className="mb-4 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('backToLogin')}
        </button>

        {/* 제목 */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">{t('resetPasswordTitle')}</h1>
          <p className="mt-2 text-sm text-gray-500">{t('resetPasswordSubtitle')}</p>
        </div>

        {/* 비밀번호 재설정 폼 */}
        <form onSubmit={handleSubmitReset(onSubmitResetEmail)} className="space-y-5">
          <div>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <Input
                {...registerReset('email')}
                type="email"
                placeholder={t('emailPlaceholder')}
                className={`pl-12 ${resetErrors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
              />
            </div>
            {resetErrors.email?.message && (
              <p className="mt-1.5 text-xs text-red-500">{resetErrors.email.message}</p>
            )}
          </div>

          {/* 에러 메시지 */}
          {resetPassword.error && (
            <p className="text-sm text-red-600">{resetPassword.error}</p>
          )}

          <Button
            type="submit"
            className="w-full bg-gray-900"
            size="lg"
            isLoading={resetPassword.isLoading}
          >
            {resetPassword.isLoading ? t('sendingCode') : t('sendResetCode')}
          </Button>
        </form>
      </>
    )
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={canClose ? onClose : undefined}
      />

      {/* 모달 컨텐츠 */}
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-8 shadow-xl">
        {/* 닫기 버튼 - canClose가 true일 때만 표시 */}
        {canClose && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* 비밀번호 찾기 화면 */}
        {showResetPassword ? (
          renderResetPasswordContent()
        ) : (
          <>
            {/* 로고 */}
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('loginTitle')}</h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('chooseAccount')}</p>
            </div>

            {/* 저장된 계정 목록 */}
            {!showForm && savedAccounts.length > 0 && (
              <div className="mb-6 space-y-3">
                {savedAccounts.map((account) => {
                  // 이니셜 생성 (이메일 첫 글자)
                  const initial = account.email.charAt(0).toUpperCase()

                  return (
                    <button
                      key={account.email}
                      onClick={() => handleSavedAccountClick(account.email)}
                      className="flex w-full items-center gap-3 rounded-xl border-2 border-gray-200 bg-white p-3 transition-colors hover:border-gray-900 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-400 dark:hover:bg-gray-700"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 dark:bg-gray-100">
                        <span className="text-sm font-bold text-white dark:text-gray-900">{initial}</span>
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm text-gray-900 dark:text-gray-100">{account.email}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {/* 로그인 폼 */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <Input
                    {...register('email')}
                    type="email"
                    placeholder={t('emailPlaceholder')}
                    className={`pl-12 ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                  />
                </div>
                {errors.email?.message && (
                  <p className="mt-1.5 text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <Input
                    {...register('password')}
                    type="password"
                    placeholder={t('passwordPlaceholder')}
                    className={`pl-12 ${errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                  />
                </div>
                {errors.password?.message && (
                  <p className="mt-1.5 text-xs text-red-500">{errors.password.message}</p>
                )}

                {/* 에러 메시지 - 비밀번호 입력 칸 아래 */}
                {error && (
                  <div className="mt-2">
                    <p className="text-sm text-red-600">{error.message}</p>
                    {onSwitchToSignup && (
                      <button
                        type="button"
                        onClick={onSwitchToSignup}
                        className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100 hover:underline"
                      >
                        계정이 없으신가요? 회원가입하기
                      </button>
                    )}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-gray-900"
                size="lg"
                isLoading={isLoading}
              >
                {t('loginTitle')}
              </Button>
            </form>

            {/* 회원가입 / 비밀번호 찾기 링크 */}
            <div className="mt-6 flex items-center justify-center gap-4 text-center">
              {onSwitchToSignup ? (
                <button
                  onClick={onSwitchToSignup}
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {t('signup')}
                </button>
              ) : (
                <Link
                  href="/signup"
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {t('signup')}
                </Link>
              )}

              <span className="text-gray-300 dark:text-gray-600">|</span>

              <button
                onClick={handleShowResetPassword}
                className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {t('findPassword')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
