'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { Button, Input } from '@/shared/components/ui'
import { useSignup } from '@/features/auth/hooks/useSignup'
import { useAuthStore } from '@/features/auth/store/authStore'
import { VerificationCodeInput } from '@/features/auth/components/ui/VerificationCodeInput'
import { Mail, Lock, User, AlertCircle, CheckCircle, X, Check } from 'lucide-react'

interface SignupModalProps {
  isOpen: boolean
  onClose: () => void
  onSwitchToLogin: () => void
  embedded?: boolean // AuthGuard 탭 내부 렌더링 시 true
}

export function SignupModal({ isOpen, onClose, onSwitchToLogin, embedded = false }: SignupModalProps) {
  const t = useTranslations('auth.signup')
  const tm = useTranslations('auth.signupModal')
  const tv = useTranslations('auth.validation')
  const {
    handleSendSignupCode,
    handleVerifySignupCode,
    handleVerificationCodeChange,
    handleResendCode,
    resetSignupFlow,
    isLoading,
    step,
    maskedEmail,
    expiresIn,
    verificationCode,
  } = useSignup()
  const { error, clearError } = useAuthStore()

  const signupSchema = z.object({
    email: z
      .string()
      .min(1, tv('emailRequired'))
      .email(tv('emailInvalid'))
      .refine(
        (email) => email.endsWith('@korea.ac.kr'),
        tv('emailSchoolOnly')
      ),
    full_name: z
      .string()
      .min(2, tv('nameMin'))
      .max(50, tv('nameMax')),
    password: z
      .string()
      .min(8, tv('passwordMin'))
      .regex(/[A-Za-z]/, tv('passwordLetter'))
      .regex(/[0-9]/, tv('passwordNumber')),
    password_confirm: z
      .string()
      .min(1, tv('passwordConfirmRequired')),
  }).refine((data) => data.password === data.password_confirm, {
    message: tv('passwordMismatch'),
    path: ['password_confirm'],
  })

  type SignupFormData = z.infer<typeof signupSchema>

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  })

  const watchedPassword = watch('password', '')

  // 모달이 닫힐 때 폼 초기화
  useEffect(() => {
    if (!isOpen) {
      reset()
      clearError()
      resetSignupFlow()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const onSubmit = async (data: SignupFormData) => {
    clearError()
    await handleSendSignupCode(data)
  }

  const formatExpiresIn = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    return `${minutes}분`
  }

  const isCodeComplete = verificationCode.every(digit => digit !== '')

  if (!isOpen) return null

  // embedded/standalone 공통 콘텐츠
  const renderInnerContent = () => (
    <>
      {/* Step 3: 회원가입 완료 */}
      {step === 'success' ? (
          <div className="text-center">
            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-green-100 p-4">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
            </div>

            <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-gray-100">{t('signupCompleteTitle')}</h2>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
              {t('signupCompleteMessage')}
            </p>

            <Button
              onClick={onClose}
              className="w-full"
              size="lg"
            >
              {t('goToHomeButton')}
            </Button>
          </div>

        /* Step 2: 인증 코드 입력 */
        ) : step === 'verification' ? (
          <div>
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{tm('title')}</h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('verificationTitle')}</p>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-600">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{error.message}</span>
              </div>
            )}

            <div className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm text-center">
                <strong>{maskedEmail}</strong>{t('codeSentToEmail')}
                <br />
                <span className="text-blue-600">{t('codeValidFor')}: {formatExpiresIn(expiresIn)}</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 text-center">
                  {t('enterCodeLabel')}
                </label>
                <VerificationCodeInput
                  value={verificationCode}
                  onChange={handleVerificationCodeChange}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleVerifySignupCode}
                  className="w-full"
                  size="lg"
                  isLoading={isLoading}
                  disabled={!isCodeComplete}
                >
                  {t('verifyCodeButton')}
                </Button>

                <Button
                  onClick={handleResendCode}
                  variant="outline"
                  className="w-full"
                  isLoading={isLoading}
                >
                  {t('resendCodeButton')}
                </Button>
              </div>

              <p className="text-center text-xs text-gray-400">
                {t('checkSpam')}
              </p>
            </div>

            {!embedded && (
              <div className="mt-6 text-center text-sm text-gray-500">
                <span>{t('hasAccount')}</span>
                <button
                  onClick={onSwitchToLogin}
                  className="font-medium text-gray-900 dark:text-gray-100 hover:underline"
                >
                  {t('loginLink')}
                </button>
              </div>
            )}
          </div>

        /* Step 1: 회원가입 폼 */
        ) : (
          <>
            {/* 로고 */}
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{tm('title')}</h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{tm('subtitle')}</p>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-600">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <div>
                  <p className="font-medium">{error.message}</p>
                  {error.actions && error.actions.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {error.actions.map((action, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            if (action.type === 'login') {
                              onSwitchToLogin()
                            }
                          }}
                          className="text-red-700 underline hover:no-underline"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 회원가입 폼 */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="relative">
                <User className="absolute left-4 top-[21px] h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  {...register('full_name')}
                  type="text"
                  placeholder={t('namePlaceholder')}
                  className="pl-12"
                  error={errors.full_name?.message}
                />
              </div>

              <div className="relative">
                <Mail className="absolute left-4 top-[21px] h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  {...register('email')}
                  type="email"
                  placeholder={t('emailPlaceholderModal')}
                  className="pl-12"
                  error={errors.email?.message}
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-[21px] h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  {...register('password')}
                  type="password"
                  placeholder={t('passwordPlaceholderModal')}
                  className="pl-12"
                  error={errors.password?.message}
                />
              </div>

              {/* 비밀번호 강도 표시 */}
              {watchedPassword && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs">
                  {[
                    { met: watchedPassword.length >= 8, label: tv('strengthMinLength') },
                    { met: /[A-Za-z]/.test(watchedPassword), label: tv('strengthLetters') },
                    { met: /[0-9]/.test(watchedPassword), label: tv('strengthNumbers') },
                    { met: /[^A-Za-z0-9]/.test(watchedPassword), label: tv('strengthSymbols') },
                  ].map(({ met, label }) => (
                    <span key={label} className={`flex items-center gap-1 ${met ? 'text-green-600' : 'text-gray-400'}`}>
                      <Check className={`h-3 w-3 ${met ? '' : 'opacity-40'}`} />
                      {label}
                    </span>
                  ))}
                </div>
              )}

              <div className="relative">
                <Lock className="absolute left-4 top-[21px] h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  {...register('password_confirm')}
                  type="password"
                  placeholder={t('passwordConfirmPlaceholder')}
                  className="pl-12"
                  error={errors.password_confirm?.message}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gray-900"
                size="lg"
                isLoading={isLoading}
              >
                {t('buttonModal')}
              </Button>
            </form>

            {/* 로그인 링크 — embedded 모드에서는 탭이 대체하므로 숨김 */}
            {!embedded && (
              <div className="mt-6 text-center text-sm text-gray-500">
                <span>{t('hasAccount')}</span>
                <button
                  onClick={onSwitchToLogin}
                  className="font-medium text-gray-900 dark:text-gray-100 hover:underline"
                >
                  {t('loginLink')}
                </button>
              </div>
            )}
          </>
        )}
    </>
  )

  // embedded 모드: 내부 콘텐츠만 렌더링
  if (embedded) {
    return renderInnerContent()
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />

      {/* 모달 컨텐츠 */}
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-8 shadow-xl">
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>

        {renderInnerContent()}
      </div>
    </div>
  )
}
