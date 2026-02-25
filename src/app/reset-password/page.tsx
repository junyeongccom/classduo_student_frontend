'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { Button, Input } from '@/shared/components/ui'
import { useResetPassword } from '@/features/auth/hooks/useResetPassword'
import { Lock, CheckCircle } from 'lucide-react'

type ResetPasswordFormData = {
  new_password: string
  new_password_confirm: string
}

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('resetPassword')
  const { updatePassword, isLoading, error, successMessage } = useResetPassword()
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const resetPasswordSchema = z.object({
    new_password: z
      .string()
      .min(8, t('validation.minLength'))
      .refine((password) => {
        const hasUpper = /[A-Z]/.test(password)
        const hasLower = /[a-z]/.test(password)
        const hasDigit = /\d/.test(password)
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password)

        const count = [hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length
        return count >= 3
      }, t('validation.complexity')),
    new_password_confirm: z.string().min(8, t('validation.confirmRequired')),
  }).refine((data) => data.new_password === data.new_password_confirm, {
    message: t('validation.mismatch'),
    path: ['new_password_confirm'],
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  // URL에서 access_token 추출 (hash 또는 query params에서)
  useEffect(() => {
    const hash = window.location.hash.substring(1)
    const hashParams = new URLSearchParams(hash)
    let token = hashParams.get('access_token')

    if (!token) {
      token = searchParams.get('access_token')
    }

    if (token) {
      setAccessToken(token)
    }
  }, [searchParams])

  // 토큰이 없으면 안내 메시지 표시
  if (!accessToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">{t('invalidLink')}</h1>
          <p className="mb-6 text-sm text-gray-600">
            {t('linkExpired')}
          </p>
          <Button
            onClick={() => router.push('/')}
            className="bg-gray-900"
          >
            {t('goToMain')}
          </Button>
        </div>
      </div>
    )
  }

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!accessToken) {
      return
    }

    const result = await updatePassword({
      access_token: accessToken,
      new_password: data.new_password,
      new_password_confirm: data.new_password_confirm,
    })

    if (result.success) {
      setIsSuccess(true)
      setTimeout(() => {
        router.push('/')
      }, 3000)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        {isSuccess ? (
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <CheckCircle className="h-16 w-16 text-gray-900" />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">{t('completed')}</h1>
            <p className="mb-4 text-sm text-gray-600">
              {t('successMessage')}
            </p>
            <p className="text-sm text-gray-500">
              {t('redirecting')}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
              <p className="mt-2 text-sm text-gray-500">{t('subtitle')}</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <Input
                    {...register('new_password')}
                    type="password"
                    placeholder={t('newPassword')}
                    className="pl-12"
                    error={errors.new_password?.message}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {t('passwordHint')}
                </p>
              </div>

              <div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <Input
                    {...register('new_password_confirm')}
                    type="password"
                    placeholder={t('confirmPassword')}
                    className="pl-12"
                    error={errors.new_password_confirm?.message}
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-gray-900"
                size="lg"
                isLoading={isLoading}
              >
                {t('submit')}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  const t = useTranslations('resetPassword')
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">{t('loading')}</h1>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
