'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '@/shared/components/ui'

export default function EmailConfirmedPage() {
  const router = useRouter()
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
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
  }, [router])

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-primary-100 p-4">
            <CheckCircle className="h-12 w-12 text-primary-500" />
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


