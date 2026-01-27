'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { Button, Input } from '@/shared/components/ui'
import { useSignup } from '@/features/auth/hooks/useSignup'
import { useAuthStore } from '@/features/auth/store/authStore'
import { Mail, Lock, User, AlertCircle, CheckCircle, X } from 'lucide-react'

interface SignupModalProps {
  isOpen: boolean
  onClose: () => void
  onSwitchToLogin: () => void
}

export function SignupModal({ isOpen, onClose, onSwitchToLogin }: SignupModalProps) {
  const t = useTranslations('auth.signup')
  const tm = useTranslations('auth.signupModal')
  const tv = useTranslations('auth.validation')
  const { handleSignup, handleResendVerification, isLoading, signupSuccess, registeredEmail } = useSignup()
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
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  })

  // 모달이 닫힐 때 폼 초기화
  useEffect(() => {
    if (!isOpen) {
      reset()
      clearError()
    }
  }, [isOpen, reset, clearError])

  const onSubmit = async (data: SignupFormData) => {
    clearError()
    await handleSignup(data)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div 
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      
      {/* 모달 컨텐츠 */}
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>

        {/* 회원가입 성공 시 이메일 인증 안내 */}
        {signupSuccess && registeredEmail ? (
          <div className="text-center">
            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-gray-100 p-4">
                <CheckCircle className="h-12 w-12 text-gray-900" />
              </div>
            </div>
            
            <h2 className="mb-2 text-xl font-bold text-gray-900">{t('emailVerificationTitle')}</h2>
            <p className="mb-6 text-sm text-gray-500">
              <span className="font-medium text-gray-700">{registeredEmail}</span>으로<br />
              {t('emailVerificationSent')}
            </p>

            <div className="space-y-3">
              <Button
                onClick={() => handleResendVerification(registeredEmail)}
                variant="outline"
                className="w-full"
                isLoading={isLoading}
              >
                {t('resendVerification')}
              </Button>
              
              <Button
                onClick={() => {
                  onClose()
                  onSwitchToLogin()
                }}
                variant="secondary"
                className="w-full"
              >
                {t('goToLoginModal')}
              </Button>
            </div>

            <p className="mt-6 text-xs text-gray-400">
              {t('checkSpam')}
            </p>
          </div>
        ) : (
          <>
            {/* 로고 */}
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold text-gray-900">{tm('title')}</h1>
              <p className="mt-2 text-sm text-gray-500">{tm('subtitle')}</p>
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
                            } else if (action.type === 'resend_verification' && action.email) {
                              handleResendVerification(action.email)
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

            {/* 로그인 링크 */}
            <div className="mt-6 text-center text-sm text-gray-500">
              <span>{t('hasAccount')}</span>
              <button 
                onClick={onSwitchToLogin}
                className="font-medium text-gray-900 hover:underline"
              >
                {t('loginLink')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

