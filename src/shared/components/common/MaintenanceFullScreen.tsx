/**
 * @file MaintenanceFullScreen.tsx
 * @description 서비스 종료 안내 전체화면 + 데모 계정(test.dev) 전용 우회 로그인. PROD에서만 표시.
 * @module shared/components/common
 * @dependencies public/topic_test/hero-{male,female}.png, features/auth (authService/authStore)
 */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/features/auth/store/authStore'
import { authService } from '@/features/auth/services/authService'

// 서비스 종료 안내 — PROD(wbubzj)에서만 종료 공지 표시. DEV(syzgbw)는 정상 접속 가능.
// 완전 재개 시 아래를 false 로.
const SERVICE_CLOSED = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').includes('wbubzj')

// 이 계정으로 로그인했을 때만 종료화면을 우회(데모용). 나머지 계정은 그대로 막힘.
const DEMO_EMAIL = 'test.dev@korea.ac.kr'

// 흰 스티커 외곽선 + 보라 그림자 (ExamPrepHeroCard 와 동일 톤).
const STICKER =
  'drop-shadow(2px 0 0 #fff) drop-shadow(-2px 0 0 #fff) drop-shadow(0 2px 0 #fff) drop-shadow(0 -2px 0 #fff) drop-shadow(0 8px 16px rgba(63,61,191,0.35))'

export function MaintenanceFullScreen() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const storeLogin = useAuthStore((s) => s.login)
  const setUser = useAuthStore((s) => s.setUser)
  const logout = useAuthStore((s) => s.logout)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // 훅 호출 이후에 조건부 반환 (Rules of Hooks)
  if (!SERVICE_CLOSED) return null
  // 데모 계정으로 로그인된 상태면 종료화면을 우회 → 앱 정상 노출
  if (user?.email?.toLowerCase() === DEMO_EMAIL) return null

  const handleDemoLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setLoading(true)
    try {
      const res = await authService.login({ email: email.trim().toLowerCase(), password })
      if (res.error || !res.data) {
        setErr('이메일 또는 비밀번호를 확인해주세요.')
        setLoading(false)
        return
      }
      // 토큰 저장 후 본인 확인
      storeLogin(res.data)
      const me = await authService.getMe()
      const loggedEmail = me.data?.email?.toLowerCase()
      if (!me.data || loggedEmail !== DEMO_EMAIL) {
        // 데모 지정 계정이 아니면 즉시 세션 해제 → 종료화면 유지
        logout()
        setErr('이 데모 환경은 지정된 데모 계정으로만 접속할 수 있습니다.')
        setLoading(false)
        return
      }
      // 데모 계정 확정 → user 설정(리렌더 시 우회) 후 대시보드로 이동
      setUser(me.data)
      router.push('/dashboard/ai-tutor')
    } catch {
      setErr('로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-start overflow-y-auto px-5 py-10 text-center"
      style={{ background: 'linear-gradient(to bottom, #f0efff 0%, #dbdafb 100%)' }}
      role="status"
      aria-live="polite"
    >
      <div className="my-auto flex w-full flex-col items-center">
        <div className="flex items-end justify-center gap-1 sm:gap-4">
          <img
            src="/topic_test/hero-female.png"
            alt=""
            aria-hidden
            draggable={false}
            className="pointer-events-none h-auto w-24 select-none sm:w-36"
            style={{ filter: STICKER }}
          />
          <img
            src="/topic_test/hero-male.png"
            alt=""
            aria-hidden
            draggable={false}
            className="pointer-events-none h-auto w-24 select-none sm:w-36"
            style={{ filter: STICKER }}
          />
        </div>

        <div className="mt-7 w-full max-w-lg rounded-2xl bg-white/85 p-6 text-left shadow-xl backdrop-blur sm:p-8 dark:bg-gray-900/85">
          <h1 className="mb-4 text-center text-base font-extrabold text-gray-900 sm:text-xl dark:text-gray-50">
            생명과학의 세계 · Aplus 학습 서비스 종료 안내
          </h1>
          <div className="space-y-3 text-sm leading-relaxed text-gray-700 sm:text-[15px] dark:text-gray-200">
            <p>안녕하세요, 생명과학의 세계 수강생 여러분.</p>
            <p>한 학기 동안 Aplus를 이용해 주셔서 진심으로 감사합니다.</p>
            <p>기말고사가 마무리됨에 따라 생명과학의 세계 Aplus 학습 서비스 운영을 종료하게 되었습니다.</p>
            <div className="rounded-lg bg-indigo-50 p-3 text-[13px] sm:text-sm dark:bg-indigo-900/30">
              <p>
                ■ <b>종료 일시</b>: 6월 22일 19시
              </p>
              <p className="mt-1.5">
                ■ <b>종료 후 안내</b>: 종료 시점 이후에는 AI튜터·내퀴즈·핵심주제학습 등 모든 기능과 학습 기록에 접근이 어렵습니다.
              </p>
            </div>
            <p>
              한 학기 동안 Aplus와 함께 열심히 공부하신 여러분 모두 수고 많으셨습니다. 좋은 결과 있으시길 응원합니다.
            </p>
            <p>감사합니다.</p>
            <p className="text-right font-semibold text-gray-600 dark:text-gray-300">Aplus 운영팀 드림</p>
          </div>
        </div>

        {/* 데모/관리자 전용 우회 로그인 — 지정 계정만 접속됨 */}
        <details className="mt-5 w-full max-w-lg text-left">
          <summary className="cursor-pointer select-none text-center text-xs font-medium text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
            🔒 관리자 데모 접속
          </summary>
          <form
            onSubmit={handleDemoLogin}
            className="mt-3 space-y-2.5 rounded-2xl bg-white/70 p-5 shadow-md backdrop-blur dark:bg-gray-900/70"
          >
            <input
              type="email"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="관리자 이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-50"
            />
            <input
              type="password"
              autoComplete="current-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-50"
            />
            {err && <p className="text-xs text-red-500">{err}</p>}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full rounded-lg bg-[#6366F1] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#6366F1]/20 transition-all hover:scale-[1.01] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? '접속 중…' : '데모 접속'}
            </button>
          </form>
        </details>
      </div>
    </div>
  )
}
