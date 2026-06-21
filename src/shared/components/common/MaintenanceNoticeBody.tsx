/**
 * @file MaintenanceNoticeBody.tsx
 * @description 서버 점검 공지 본문 (ko/en) — 06:10 기준 '점검 예정' ↔ '점검 중' 자동 전환
 * @module shared/components/common
 * @dependencies next-intl
 */
'use client'

import { useEffect, useState } from 'react'
import { useLocale } from 'next-intl'

// 2026-06-22 06:10 ~ 06:40 KST (= 06-21 21:10 ~ 21:40 UTC). Month 0-index: 5 = June.
const START = Date.UTC(2026, 5, 21, 21, 10, 0)

export function MaintenanceNoticeBody() {
  const en = useLocale() === 'en'
  // SSR-안전: 초기엔 '예정'으로 렌더 후, 클라이언트에서 실제 시각 반영 + 06:10 되면 자동 전환.
  const [ongoing, setOngoing] = useState(false)
  useEffect(() => {
    const tick = () => setOngoing(Date.now() >= START)
    tick()
    const id = setInterval(tick, 20000)
    return () => clearInterval(id)
  }, [])

  const c = en
    ? ongoing
      ? {
          title: 'Server maintenance in progress',
          body: 'We’re updating the service for a smoother experience! It will be finished by 6:40 AM.',
        }
      : {
          title: 'Scheduled maintenance',
          body: 'For a smoother experience, the server will be updated from 6:10 AM to 6:40 AM. We appreciate your understanding that the app may be unavailable during this time!',
        }
    : ongoing
      ? {
          title: '서버 점검 중',
          body: '쾌적한 사용을 위해 업데이트가 진행되고 있어요! 06시 40분에 끝나요!',
        }
      : {
          title: '서버 점검 예정',
          body: '쾌적한 사용을 위해 앞으로 06시 10분부터 06시 40분까지 서버 업데이트가 진행되어요! 해당 시간대는 프로그램 사용이 어려운 점 양해 부탁드려요!',
        }

  return (
    <div className="space-y-2 text-left">
      <h3 className="text-sm font-bold leading-snug text-gray-900 dark:text-gray-100">
        {c.title}
      </h3>
      <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300">{c.body}</p>
    </div>
  )
}
