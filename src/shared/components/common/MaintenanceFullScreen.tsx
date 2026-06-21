/**
 * @file MaintenanceFullScreen.tsx
 * @description 점검 시간 동안 전체화면 점검 페이지 (핵심주제학습 남/여 캐릭터). 다운타임에 로그인 모달 대신 앱 전체를 가린다.
 * @module shared/components/common
 * @dependencies next-intl, public/topic_test/hero-{male,female}.png
 */
'use client'

import { useEffect, useState } from 'react'
import { useLocale } from 'next-intl'

// 점검 차단 창 — 이 시간대에만 전체화면 점검 페이지로 앱을 가린다.
// 2026-06-22 06:10 ~ 06:45 KST (= 06-21 21:10 ~ 21:45 UTC, 끝 5분 버퍼). Month 0-index: 5 = June.
const START = Date.UTC(2026, 5, 21, 21, 10, 0)
const END = Date.UTC(2026, 5, 21, 21, 45, 0)
// 점검 조기 종료 시 false 로 배포하면 시간과 무관하게 즉시 해제.
const MAINTENANCE_ENABLED = true

// 흰 스티커 외곽선 + 보라 그림자 (ExamPrepHeroCard 와 동일 톤, px 버전).
const STICKER =
  'drop-shadow(2px 0 0 #fff) drop-shadow(-2px 0 0 #fff) drop-shadow(0 2px 0 #fff) drop-shadow(0 -2px 0 #fff) drop-shadow(0 8px 16px rgba(63,61,191,0.35))'

export function MaintenanceFullScreen() {
  const en = useLocale() === 'en'
  const [active, setActive] = useState(false)

  useEffect(() => {
    const tick = () =>
      setActive(MAINTENANCE_ENABLED && Date.now() >= START && Date.now() < END)
    tick()
    const id = setInterval(tick, 10000)
    return () => clearInterval(id)
  }, [])

  if (!active) return null

  const title = en ? 'Server maintenance in progress' : '서버 점검 중이에요'
  const body = en
    ? 'We’re updating the service for a smoother experience. It will be finished by 6:40 AM — please come back in a moment!'
    : '쾌적한 사용을 위해 업데이트가 진행되고 있어요. 06시 40분에 끝나요 — 잠시 후 다시 이용해 주세요!'

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center px-6 text-center"
      style={{ background: 'linear-gradient(to bottom, #f0efff 0%, #dbdafb 100%)' }}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-end justify-center gap-1 sm:gap-4">
        <img
          src="/topic_test/hero-female.png"
          alt=""
          aria-hidden
          draggable={false}
          className="pointer-events-none h-auto w-[36vw] max-w-[230px] select-none"
          style={{ filter: STICKER }}
        />
        <img
          src="/topic_test/hero-male.png"
          alt=""
          aria-hidden
          draggable={false}
          className="pointer-events-none h-auto w-[36vw] max-w-[230px] select-none"
          style={{ filter: STICKER }}
        />
      </div>

      <div className="mt-8 flex flex-col items-center">
        <div className="mb-3 flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#6366F1] opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-[#6366F1]" />
          </span>
          <h1 className="text-xl font-extrabold text-gray-900 sm:text-2xl">{title}</h1>
        </div>
        <p className="max-w-md text-sm leading-relaxed text-gray-600 sm:text-base">{body}</p>
      </div>
    </div>
  )
}
