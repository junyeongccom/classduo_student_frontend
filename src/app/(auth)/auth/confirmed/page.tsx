'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/shared/components/ui'
import { useAuthStore } from '@/features/auth'
import { authService } from '@/features/auth/services/authService'

function EmailConfirmedContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, setUser, setLoading } = useAuthStore()
  const [countdown, setCountdown] = useState(5)
  const [isProcessing, setIsProcessing] = useState(true)
  const [error, setError] = useState<{
    code: string | null
    description: string | null
  } | null>(null)

  // URL에서 토큰 및 에러 파라미터 확인 및 처리
  useEffect(() => {
    const processAuth = async () => {
      // Hash에서 확인 (Supabase가 hash에 토큰을 넣을 수 있음)
      const hash = window.location.hash.substring(1)
      const hashParams = new URLSearchParams(hash)

      // Query params에서 확인
      const queryParams = new URLSearchParams(searchParams.toString())

      // 에러 확인 (우선순위: hash > query)
      const hashError = hashParams.get('error')
      const queryError = queryParams.get('error')
      const error = hashError || queryError

      if (error) {
        // 에러가 있으면 설정하고 종료
        setError({
          code: hashParams.get('error_code') || queryParams.get('error_code') || null,
          description: hashParams.get('error_description') || queryParams.get('error_description') || null,
        })
        setIsProcessing(false)
        return
      }

      // 이메일 템플릿에서 직접 전달된 토큰 확인 (token + type)
      const emailToken = queryParams.get('token')
      const tokenType = queryParams.get('type') || 'signup'

      if (emailToken) {
        // 백엔드 API로 토큰 검증
        try {
          const result = await authService.verifyEmail(emailToken, tokenType)
          if (!result.error && result.data) {
            // 검증 성공 - 토큰으로 로그인 처리
            login({
              access_token: result.data.access_token,
              refresh_token: result.data.refresh_token || '',
              expires_in: result.data.expires_in || 3600,
              token_type: result.data.token_type || 'bearer',
            })

            // 사용자 정보 조회
            try {
              setLoading(true)
              const meResult = await authService.getMe()
              if (!meResult.error && meResult.data) {
                setUser(meResult.data)
              }
            } catch (meError) {
              console.warn('[이메일 인증] 사용자 정보 조회 실패 (무시):', meError)
            } finally {
              setLoading(false)
            }

            setIsProcessing(false)
            // URL에서 토큰 제거 (보안)
            if (typeof window !== 'undefined') {
              window.history.replaceState({}, '', window.location.pathname)
            }
            return
          } else {
            // 검증 실패
            setError({
              code: 'verification_failed',
              description: result.error?.message || '이메일 인증에 실패했습니다',
            })
            setIsProcessing(false)
            return
          }
        } catch (verifyError) {
          console.error('[이메일 인증] 토큰 검증 실패:', verifyError)
          setError({
            code: 'verification_failed',
            description: '이메일 인증 중 오류가 발생했습니다',
          })
          setIsProcessing(false)
          return
        }
      }

      // 기존 방식: Supabase에서 직접 전달된 access_token 확인
      let accessToken = hashParams.get('access_token') || queryParams.get('access_token')
      let refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token')

      // 토큰이 있으면 저장하고 사용자 정보 조회
      if (accessToken) {
        try {
          // 토큰 저장 및 로그인 처리
          login({
            access_token: accessToken,
            refresh_token: refreshToken || '',
            expires_in: 3600, // 기본값: 1시간 (Supabase 기본값)
            token_type: 'bearer', // 기본값
          })

          // 사용자 정보 조회 (선택적 - 실패해도 페이지는 표시)
          try {
            setLoading(true)
            const meResult = await authService.getMe()
            
            if (!meResult.error && meResult.data) {
              // 성공 - 사용자 정보 저장
              setUser(meResult.data)
            }
            // 실패해도 에러 표시하지 않음 (이미 인증 완료되었으므로)
          } catch (meError) {
            console.warn('[이메일 인증] 사용자 정보 조회 실패 (무시):', meError)
            // 사용자 정보 조회 실패해도 페이지는 정상 표시
          } finally {
            setLoading(false)
          }
        } catch (err) {
          console.error('[이메일 인증] 토큰 저장 중 오류:', err)
          // 토큰 저장 실패해도 페이지는 표시 (이미 인증 완료되었으므로)
        }
      }
      
      // 토큰이 있든 없든 처리 완료
      setIsProcessing(false)
      
      // URL에서 토큰 제거 (보안)
      if (typeof window !== 'undefined') {
        const newUrl = window.location.pathname
        window.history.replaceState({}, '', newUrl)
      }
    }

    processAuth()
  }, [searchParams, login, setUser, setLoading])

  useEffect(() => {
    // 에러가 없고 처리 완료되었을 때만 카운트다운 실행
    if (!error && !isProcessing) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            router.push('/')
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [router, error, isProcessing])

  // 처리 중일 때 로딩 표시
  if (isProcessing) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-6 flex justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-gray-900" />
          </div>
          <p className="text-gray-500">이메일 인증을 처리하는 중...</p>
        </div>
      </main>
    )
  }

  // 에러 케이스 처리
  if (error) {
    const isExpired = error.code === 'otp_expired' || error.description?.includes('expired')
    const isInvalid = error.code === 'access_denied' || error.description?.includes('invalid')

    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-red-100 p-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
            </div>
          </div>

          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            {isExpired ? '인증 링크가 만료되었습니다' : '인증 링크 오류'}
          </h1>
          <p className="mb-8 text-gray-500">
            {isExpired
              ? '인증 링크의 유효기간(10분)이 만료되었습니다.\n새로운 인증 링크를 발송해주세요.'
              : isInvalid
              ? '인증 링크가 유효하지 않습니다.\n새로운 인증 링크를 발송해주세요.'
              : '이메일 인증 중 오류가 발생했습니다.'}
          </p>

          <div className="space-y-3">
            <Button
              onClick={() => router.push('/signup')}
              className="w-full"
              size="lg"
            >
              회원가입 페이지로 이동
            </Button>
            <Button
              onClick={() => router.push('/login')}
              variant="outline"
              className="w-full"
            >
              로그인 페이지로 이동
            </Button>
          </div>

          {error.description && (
            <p className="mt-6 text-xs text-gray-400">
              오류 코드: {error.code || 'UNKNOWN'}
            </p>
          )}
        </div>
      </main>
    )
  }

  // 성공 케이스
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-gray-100 p-4">
            <CheckCircle className="h-12 w-12 text-gray-900" />
          </div>
        </div>

        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          이메일 인증 완료!
        </h1>
        <p className="mb-8 text-gray-500">
          이메일 인증이 성공적으로 완료되었습니다.<br />
          이제 로그인하여 ClassDuo를 이용할 수 있습니다.
        </p>

        <Button
          onClick={() => router.push('/')}
          className="w-full"
          size="lg"
        >
          로그인하러 가기
        </Button>

        <p className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          {countdown}초 후 자동으로 이동합니다
        </p>
      </div>
    </main>
  )
}

export default function EmailConfirmedPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
          <div className="w-full max-w-md text-center">
            <div className="mb-6 flex justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-gray-900" />
            </div>
            <p className="text-gray-500">로딩 중...</p>
          </div>
        </main>
      }
    >
      <EmailConfirmedContent />
    </Suspense>
  )
}

