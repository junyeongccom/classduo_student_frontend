/**
 * @file MaintenanceNoticeModal.tsx
 * @description 서비스 장애 사과 공지 모달 (로그인 후 페이지 전용 — 인증화면은 AuthGuard 별도 카드가 담당)
 * @module shared/components/common
 * @dependencies shared/components/ui/Dialog, features/auth
 */
'use client'

import { useState } from 'react'
import { useAuthStore } from '@/features/auth'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/Dialog'
import { MaintenanceNoticeBody } from './MaintenanceNoticeBody'

// 공지 노출 토글 — 종료 후 false 로 변경하면 즉시 비표시.
const SHOW_MAINTENANCE_NOTICE = true

export function MaintenanceNoticeModal() {
  const { isAuthenticated } = useAuthStore()
  const [open, setOpen] = useState(true)

  // 미인증(회원가입/로그인) 화면은 AuthGuard 의 별도 카드가 담당 → 여기선 렌더 안 함
  // (인증 오버레이 z-index/포커스 트랩 충돌 방지).
  if (!SHOW_MAINTENANCE_NOTICE || !isAuthenticated) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader className="sr-only">
          <DialogTitle>서비스 장애 사과 안내</DialogTitle>
        </DialogHeader>
        <MaintenanceNoticeBody />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-2 w-full rounded-lg bg-gray-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
        >
          확인
        </button>
      </DialogContent>
    </Dialog>
  )
}
