'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button, Input } from '@/shared/components/ui'
import { useLogin } from '../hooks/useLogin'
import { useAuthStore } from '../store/authStore'
import { Mail, Lock, AlertCircle } from 'lucide-react'

export function LoginForm() {
  const t = useTranslations('auth.login')
  const tv = useTranslations('auth.validation')
  const { handleLogin, isLoading } = useLogin()
  const { error, clearError } = useAuthStore()

  const loginSchema = z.object({
    email: z
      .string()
      .min(1, tv('emailRequired'))
      .email(tv('emailInvalid')),
    password: z
      .string()
      .min(1, tv('passwordRequired')),
  })

  type LoginFormData = z.infer<typeof loginSchema>

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    clearError()
    await handleLogin(data)
  }

  return (
    <div className="w-full max-w-md">
      {/* 로고 */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-primary-500">CLASSDUO</h1>
        <p className="mt-2 text-sm text-gray-500">{t('tagline')}</p>
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
                      if (action.type === 'resend_verification' && action.endpoint) {
                        // 인증 메일 재전송 로직
                        console.log('Resend verification to:', action.email)
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

      {/* 로그인 폼 */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <Input
            {...register('email')}
            type="email"
            placeholder={t('emailPlaceholder')}
            className="pl-12"
            error={errors.email?.message}
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <Input
            {...register('password')}
            type="password"
            placeholder={t('passwordPlaceholder')}
            className="pl-12"
            error={errors.password?.message}
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
        <span>{t('noAccount')}</span>
        <Link href="/signup" className="font-medium text-primary-500 hover:underline">
          {t('signupLink')}
        </Link>
      </div>
    </div>
  )
}


