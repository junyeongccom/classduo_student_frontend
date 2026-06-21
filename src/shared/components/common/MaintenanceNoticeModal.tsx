/**
 * @file MaintenanceNoticeModal.tsx
 * @description 서비스 장애 사과 공지 모달 (로그인 후 페이지 전용 — 인증화면은 AuthGuard 별도 카드가 담당)
 * @module shared/components/common
 * @dependencies shared/components/ui/Dialog, features/auth
 */
'use client'

import { useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { useAuthStore } from '@/features/auth'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/Dialog'
import { MaintenanceNoticeBody } from './MaintenanceNoticeBody'
import { dismissNoticeForToday, isNoticeDismissedToday } from './maintenanceNotice'

// 공지 노출 토글 — 종료 후 false 로 변경하면 즉시 비표시.
const SHOW_MAINTENANCE_NOTICE = true

export function MaintenanceNoticeModal() {
  const { isAuthenticated } = useAuthStore()
  const isEn = useLocale() === 'en'
  const [open, setOpen] = useState(false)

  // SSR/hydration 안전: 클라이언트에서 "오늘 하루 닫기" 상태가 아닐 때만 노출.
  useEffect(() => {
    if (SHOW_MAINTENANCE_NOTICE && !isNoticeDismissedToday()) setOpen(true)
  }, [])

  // 미인증(회원가입/로그인) 화면은 AuthGuard 의 별도 카드가 담당 → 여기선 렌더 안 함
  // (인증 오버레이 z-index/포커스 트랩 충돌 방지).
  if (!SHOW_MAINTENANCE_NOTICE || !isAuthenticated) return null

  const handleDismissToday = () => {
    dismissNoticeForToday()
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader className="sr-only">
          <DialogTitle>서비스 장애 사과 안내</DialogTitle>
        </DialogHeader>
        <MaintenanceNoticeBody />
        <div className="mt-2 flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={handleDismissToday}
            className="rounded-lg px-3 py-2.5 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            {isEn ? "Don't show today" : '오늘 하루 닫기'}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
          >
            {isEn ? 'OK' : '확인'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
