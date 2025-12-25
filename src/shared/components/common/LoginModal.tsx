'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Button, Input } from '@/shared/components/ui'
import { useLogin } from '@/features/auth/hooks/useLogin'
import { useAuthStore } from '@/features/auth/store/authStore'
import { Mail, Lock, AlertCircle, X } from 'lucide-react'

const SAVED_ACCOUNTS_KEY = 'classduo_saved_accounts'

interface SavedAccount {
  email: string
  name?: string
  lastLoginAt: string
}

const loginSchema = z.object({
  email: z
    .string()
    .min(1, '이메일을 입력해주세요')
    .email('올바른 이메일 형식이 아닙니다'),
  password: z
    .string()
    .min(1, '비밀번호를 입력해주세요'),
})

type LoginFormData = z.infer<typeof loginSchema>

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  canClose?: boolean // 닫기 가능 여부 (기본값: true)
  onSwitchToSignup?: () => void // 회원가입 모달로 전환
}

export function LoginModal({ isOpen, onClose, canClose = true, onSwitchToSignup }: LoginModalProps) {
  const { handleLogin, isLoading } = useLogin()
  const { error, clearError, user } = useAuthStore()
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([])
  const [showForm, setShowForm] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
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
      clearError()
      setShowForm(false)
    }
  }, [isOpen, reset, clearError])

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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div 
        className="absolute inset-0 bg-black/30"
        onClick={canClose ? onClose : undefined}
      />
      
      {/* 모달 컨텐츠 */}
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        {/* 닫기 버튼 - canClose가 true일 때만 표시 */}
        {canClose && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* 로고 */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-primary-500">로그인</h1>
          <p className="mt-2 text-sm text-gray-500">계정을 선택하세요</p>
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
                  className="flex w-full items-center gap-3 rounded-xl border-2 border-gray-200 bg-white p-3 transition-colors hover:border-primary-500 hover:bg-gray-50"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500">
                    <span className="text-sm font-bold text-white">{initial}</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm text-gray-900">{account.email}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* 로그인 폼 */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input
              {...register('email')}
              type="email"
              placeholder="학교 이메일 (ex. @korea.ac.kr)"
              className="pl-12"
              error={errors.email?.message}
            />
          </div>

          <div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <Input
                {...register('password')}
                type="password"
                placeholder="비밀번호"
                className="pl-12"
                error={errors.password?.message}
              />
            </div>
            
            {/* 에러 메시지 - 비밀번호 입력 칸 아래 */}
            {error && (
              <p className="mt-2 text-sm text-red-600">{error.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-primary-500"
            size="lg"
            isLoading={isLoading}
          >
            로그인
          </Button>
        </form>

        {/* 회원가입 링크 */}
        <div className="mt-6 text-center">
          {onSwitchToSignup ? (
            <button
              onClick={onSwitchToSignup}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              회원가입
            </button>
          ) : (
            <Link 
              href="/signup"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              회원가입
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

