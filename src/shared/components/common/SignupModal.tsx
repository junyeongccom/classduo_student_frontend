'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Input } from '@/shared/components/ui'
import { useSignup } from '@/features/auth/hooks/useSignup'
import { useAuthStore } from '@/features/auth/store/authStore'
import { Mail, Lock, User, AlertCircle, CheckCircle, X } from 'lucide-react'

const signupSchema = z.object({
  email: z
    .string()
    .min(1, '이메일을 입력해주세요')
    .email('올바른 이메일 형식이 아닙니다')
    .refine(
      (email) => email.endsWith('@korea.ac.kr'),
      '학교 이메일(@korea.ac.kr)만 사용 가능합니다'
    ),
  full_name: z
    .string()
    .min(2, '이름은 2자 이상이어야 합니다')
    .max(50, '이름은 50자 이하여야 합니다'),
  password: z
    .string()
    .min(8, '비밀번호는 8자 이상이어야 합니다')
    .regex(/[A-Za-z]/, '영문자를 포함해야 합니다')
    .regex(/[0-9]/, '숫자를 포함해야 합니다'),
  password_confirm: z
    .string()
    .min(1, '비밀번호 확인을 입력해주세요'),
}).refine((data) => data.password === data.password_confirm, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['password_confirm'],
})

type SignupFormData = z.infer<typeof signupSchema>

interface SignupModalProps {
  isOpen: boolean
  onClose: () => void
  onSwitchToLogin: () => void
}

export function SignupModal({ isOpen, onClose, onSwitchToLogin }: SignupModalProps) {
  const { handleSignup, handleResendVerification, isLoading, signupSuccess, registeredEmail } = useSignup()
  const { error, clearError } = useAuthStore()

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
              <div className="rounded-full bg-primary-100 p-4">
                <CheckCircle className="h-12 w-12 text-primary-500" />
              </div>
            </div>
            
            <h2 className="mb-2 text-xl font-bold text-gray-900">이메일 인증을 완료해주세요</h2>
            <p className="mb-6 text-sm text-gray-500">
              <span className="font-medium text-gray-700">{registeredEmail}</span>으로<br />
              인증 링크를 발송했습니다.
            </p>

            <div className="space-y-3">
              <Button
                onClick={() => handleResendVerification(registeredEmail)}
                variant="outline"
                className="w-full"
                isLoading={isLoading}
              >
                인증 메일 재전송
              </Button>
              
              <Button
                onClick={() => {
                  onClose()
                  onSwitchToLogin()
                }}
                variant="secondary"
                className="w-full"
              >
                로그인하기
              </Button>
            </div>

            <p className="mt-6 text-xs text-gray-400">
              메일이 도착하지 않았다면 스팸함을 확인해주세요.
            </p>
          </div>
        ) : (
          <>
            {/* 로고 */}
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold text-primary-500">회원가입</h1>
              <p className="mt-2 text-sm text-gray-500">회원 정보를 입력하세요</p>
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
                <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  {...register('full_name')}
                  type="text"
                  placeholder="이름"
                  className="pl-12"
                  error={errors.full_name?.message}
                />
              </div>

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  {...register('email')}
                  type="email"
                  placeholder="학교 이메일 (ex. classduo@korea.ac.kr)"
                  className="pl-12"
                  error={errors.email?.message}
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  {...register('password')}
                  type="password"
                  placeholder="비밀번호 (8자 이상, 문자/숫자/기호 조합)"
                  className="pl-12"
                  error={errors.password?.message}
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  {...register('password_confirm')}
                  type="password"
                  placeholder="비밀번호 확인"
                  className="pl-12"
                  error={errors.password_confirm?.message}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-primary-500"
                size="lg"
                isLoading={isLoading}
              >
                완료
              </Button>
            </form>

            {/* 로그인 링크 */}
            <div className="mt-6 text-center text-sm text-gray-500">
              <span>이미 계정이 있으신가요? </span>
              <button 
                onClick={onSwitchToLogin}
                className="font-medium text-primary-500 hover:underline"
              >
                로그인
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

