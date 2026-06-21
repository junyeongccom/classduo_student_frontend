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

// 공지 노출 토글 — 점검 종료 후 false 로 변경하면 즉시 비표시.
const SHOW_MAINTENANCE_NOTICE = false

export function MaintenanceNoticeModal() {
  const { isAuthenticated } = useAuthStore()
  const isEn = useLocale() === 'en'
  const [open, setOpen] = useState(false)

  // 점검 공지는 모두가 봐야 하므로 영구 닫기(오늘 하루 닫기) 없이 항상 노출.
  // 확인/닫기 시 현재 세션에서만 닫히고, 새로고침하면 다시 표시된다.
  useEffect(() => {
    if (SHOW_MAINTENANCE_NOTICE) setOpen(true)
  }, [])

  // 미인증(회원가입/로그인) 화면은 AuthGuard 의 별도 카드가 담당 → 여기선 렌더 안 함
  // (인증 오버레이 z-index/포커스 트랩 충돌 방지).
  if (!SHOW_MAINTENANCE_NOTICE || !isAuthenticated) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader className="sr-only">
          <DialogTitle>서버 점검 안내</DialogTitle>
        </DialogHeader>
        <MaintenanceNoticeBody />
        <div className="mt-2 flex items-center justify-end gap-1">
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
