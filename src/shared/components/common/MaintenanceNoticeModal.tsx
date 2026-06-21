/**
 * @file MaintenanceNoticeModal.tsx
 * @description 서버 안정화 작업 중 사과/안내 공지 모달 (긴급 운영 공지)
 * @module shared/components/common
 * @dependencies shared/components/ui/Dialog
 */
'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/Dialog'

// 공지 노출 토글 — 작업 완료 후 false 로 변경(또는 본 import 제거)하면 즉시 비노출.
const SHOW_MAINTENANCE_NOTICE = true

export function MaintenanceNoticeModal() {
  const [open, setOpen] = useState(SHOW_MAINTENANCE_NOTICE)

  if (!SHOW_MAINTENANCE_NOTICE) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">🙏 일시적인 접속 오류 안내</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm leading-relaxed text-gray-700">
          <p>
            기말 기간 동시 접속자가 크게 늘면서 일부 기능(퀴즈 채점·학습 기록 저장 등)에서
            일시적인 오류가 발생하고 있습니다. 불편을 드려 진심으로 죄송합니다.
          </p>
          <p>
            현재 서버 안정화 및 성능 개선 작업을 진행하고 있으며,{' '}
            <span className="font-semibold text-gray-900">약 30분 내로 정상화</span>될
            예정입니다. 잠시 후 다시 접속해 주시면 감사하겠습니다.
          </p>
          <p className="text-xs text-gray-500">
            작업 중에는 일시적으로 접속이 원활하지 않을 수 있습니다. 더 안정적인 서비스로
            보답하겠습니다.
          </p>
        </div>
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
