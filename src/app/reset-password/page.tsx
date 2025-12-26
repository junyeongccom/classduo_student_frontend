'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Input } from '@/shared/components/ui'
import { useResetPassword } from '@/features/auth/hooks/useResetPassword'
import { Lock, CheckCircle } from 'lucide-react'

const resetPasswordSchema = z.object({
  new_password: z
    .string()
    .min(8, '비밀번호는 최소 8자 이상이어야 합니다')
    .refine((password) => {
      const hasUpper = /[A-Z]/.test(password)
      const hasLower = /[a-z]/.test(password)
      const hasDigit = /\d/.test(password)
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password)
      
      const count = [hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length
      return count >= 3
    }, '영문 대문자, 소문자, 숫자, 특수문자 중 3가지 이상을 포함해야 합니다'),
  new_password_confirm: z.string().min(8, '비밀번호 확인을 입력해주세요'),
}).refine((data) => data.new_password === data.new_password_confirm, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['new_password_confirm'],
})

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { updatePassword, isLoading, error, successMessage } = useResetPassword()
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  // URL에서 access_token 추출 (hash 또는 query params에서)
  useEffect(() => {
    // 먼저 hash에서 확인 (Supabase 기본 방식)
    const hash = window.location.hash.substring(1)
    const hashParams = new URLSearchParams(hash)
    let token = hashParams.get('access_token')
    
    // hash에 없으면 query params에서 확인
    if (!token) {
      token = searchParams.get('access_token')
    }
    
    console.log('[DEBUG] Extracted token:', token)
    console.log('[DEBUG] Hash:', window.location.hash)
    console.log('[DEBUG] Search:', window.location.search)
    
    if (token) {
      // 짧은 토큰이든 JWT든 백엔드에서 알아서 처리
      setAccessToken(token)
    }
  }, [searchParams])

  // 토큰이 없으면 안내 메시지 표시
  if (!accessToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">유효하지 않은 링크</h1>
          <p className="mb-6 text-sm text-gray-600">
            비밀번호 재설정 링크가 만료되었거나 유효하지 않습니다.
          </p>
          <Button
            onClick={() => router.push('/')}
            className="bg-primary-500"
          >
            메인 페이지로 이동
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
      // 3초 후 메인 페이지로 리다이렉트
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
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">비밀번호 변경 완료</h1>
            <p className="mb-4 text-sm text-gray-600">
              비밀번호가 성공적으로 변경되었습니다.
            </p>
            <p className="text-sm text-gray-500">
              잠시 후 로그인 페이지로 이동합니다...
            </p>
          </div>
        ) : (
          <>
            {/* 제목 */}
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold text-primary-500">새 비밀번호 설정</h1>
              <p className="mt-2 text-sm text-gray-500">새로운 비밀번호를 입력하세요</p>
            </div>

            {/* 비밀번호 재설정 폼 */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <Input
                    {...register('new_password')}
                    type="password"
                    placeholder="새 비밀번호"
                    className="pl-12"
                    error={errors.new_password?.message}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  영문 대문자, 소문자, 숫자, 특수문자 중 3가지 이상 포함 (최소 8자)
                </p>
              </div>

              <div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <Input
                    {...register('new_password_confirm')}
                    type="password"
                    placeholder="새 비밀번호 확인"
                    className="pl-12"
                    error={errors.new_password_confirm?.message}
                  />
                </div>
              </div>

              {/* 에러 메시지 */}
              {error && (
                <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-primary-500"
                size="lg"
                isLoading={isLoading}
              >
                비밀번호 변경
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

