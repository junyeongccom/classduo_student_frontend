'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button, Input } from '@/shared/components/ui'
import { useSignup } from '../hooks/useSignup'
import { useAuthStore } from '../store/authStore'
import { VerificationCodeInput } from './ui/VerificationCodeInput'
import { Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react'

export function SignupForm() {
  const t = useTranslations('auth.signup')
  const tv = useTranslations('auth.validation')
  const tErr = useTranslations('errors')
  const {
    handleSendSignupCode,
    handleVerifySignupCode,
    handleVerificationCodeChange,
    handleResendCode,
    handleRequestAdminApproval,
    handleResendVerification,
    goToLogin,
    goToHome,
    isLoading,
    step,
    maskedEmail,
    expiresIn,
    verificationCode,
    registeredEmail,
    formData,
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
      .regex(/[0-9]/, tv('passwordNumber'))
      .regex(/[^A-Za-z0-9]/, tv('passwordSymbol')),
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
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupFormData) => {
    clearError()
    await handleSendSignupCode(data)
  }

  const formatExpiresIn = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    return `${minutes}분`
  }

  const isCodeComplete = verificationCode.every(digit => digit !== '')

  // Step: Admin approval pending — API 호출 완료 후 안내 화면
  if (step === 'admin_approval_pending') {
    const studentEmail = formData?.email || ''

    return (
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-blue-100 p-4">
            <Mail className="h-12 w-12 text-blue-600" />
          </div>
        </div>

        <h2 className="mb-2 text-xl font-bold text-gray-900">{t('adminApprovalTitle')}</h2>
        <p className="mb-4 text-sm text-gray-500 leading-relaxed">
          {t('adminApprovalMessage')}
        </p>

        {/* 학교 메일로 관리자에게 직접 메일 보내기 안내 */}
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-left">
          <p className="text-sm text-amber-800 leading-relaxed">
            {t('adminApprovalEmailGuide', { email: studentEmail })}
          </p>
          <p className="mt-2 text-sm font-semibold text-amber-900">admin@aplus.io.kr</p>
        </div>

        <Button
          onClick={goToLogin}
          className="w-full"
          size="lg"
        >
          {t('goToLoginButton')}
        </Button>
      </div>
    )
  }

  // Step 3: Success - show completion message
  if (step === 'success') {
    return (
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-green-100 p-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
        </div>

        <h2 className="mb-2 text-xl font-bold text-gray-900">{t('signupCompleteTitle')}</h2>
        <p className="mb-6 text-sm text-gray-500">
          {t('signupCompleteMessage')}
        </p>

        <Button
          onClick={goToHome}
          className="w-full"
          size="lg"
        >
          {t('goToHomeButton')}
        </Button>
      </div>
    )
  }

  // Step 2: Verification code input
  if (step === 'verification') {
    return (
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">CLASSDUO</h1>
          <p className="mt-2 text-sm text-gray-500">{t('verificationTitle')}</p>
        </div>

        {/* Error message */}
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
            <label className="block text-sm font-medium text-gray-900 mb-3 text-center">
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

        <div className="mt-6 text-center text-sm text-gray-500">
          <span>{t('hasAccount')}</span>
          <Link href="/login" className="font-medium text-gray-900 hover:underline">
            {t('loginLink')}
          </Link>
        </div>
      </div>
    )
  }

  // Step 1: Form - email, name, password
  return (
    <div className="w-full max-w-md">
      {/* 로고 */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900">CLASSDUO</h1>
        <p className="mt-2 text-sm text-gray-500">{t('title')}</p>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-600">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium">{error.message}</p>
            {error.actions && error.actions.length > 0 && (
              <div className="mt-3 space-y-2">
                {error.actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      if (action.type === 'login') {
                        goToLogin()
                      } else if (action.type === 'resend_verification' && action.email) {
                        handleResendVerification(action.email)
                      } else if (action.type === 'request_admin_approval') {
                        handleRequestAdminApproval()
                      }
                    }}
                    className={action.type === 'request_admin_approval'
                      ? "w-full px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                      : "text-red-700 underline hover:no-underline"
                    }
                  >
                    {action.type === 'request_admin_approval' ? tErr('adminApprovalButton') : action.label}
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
            placeholder={t('emailPlaceholder')}
            className="pl-12"
            error={errors.email?.message}
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-4 top-[21px] h-5 w-5 -translate-y-1/2 text-gray-400" />
          <Input
            {...register('password')}
            type="password"
            placeholder={t('passwordPlaceholder')}
            className="pl-12"
            error={errors.password?.message}
          />
        </div>

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
          className="w-full"
          size="lg"
          isLoading={isLoading}
        >
          {t('button')}
        </Button>
      </form>

      {/* 하단 링크 */}
      <div className="mt-6 text-center text-sm text-gray-500">
        <span>{t('hasAccount')}</span>
        <Link href="/login" className="font-medium text-gray-900 hover:underline">
          {t('loginLink')}
        </Link>
      </div>
    </div>
  )
}


