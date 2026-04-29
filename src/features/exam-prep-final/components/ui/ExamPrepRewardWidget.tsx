/**
 * @file ExamPrepRewardWidget.tsx
 * @description 기말 대비 학습 페이지 우상단 보상 위젯 — 도장 · XP · 계급
 * @module features/exam-prep-final/components/ui
 * @dependencies StudentCourseState
 *
 * 동작:
 *  - 도장(원형): last_study_date == 오늘(KST) 이면 보라 채움, 아니면 비어있음
 *  - 도장 클릭 → 연속/누적 일수 팝업 토글
 *  - XP: total_xp 표시
 *  - 계급: 일단 'F' 고정 (사용자 지시 — 추후 매핑 추가 예정)
 */
'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/shared/lib/utils'
import type { StudentCourseState } from '../../services/gamificationService'

interface ExamPrepRewardWidgetProps {
  state: StudentCourseState | null
  loading?: boolean
}

/** KST 기준 오늘 ISO 날짜 (yyyy-mm-dd) */
function getKstTodayIso(): string {
  const now = new Date()
  // KST = UTC+9
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

export function ExamPrepRewardWidget({
  state,
  loading = false,
}: ExamPrepRewardWidgetProps) {
  const [isStampPopupOpen, setIsStampPopupOpen] = useState(false)
  const popupRef = useRef<HTMLDivElement>(null)

  const todayIso = getKstTodayIso()
  const hasTodayStamp = !!state?.last_study_date && state.last_study_date === todayIso
  const totalXp = state?.total_xp ?? 0
  const currentStreak = state?.current_streak ?? 0
  const totalDays = state?.total_study_days ?? 0
  // 계급: 사용자 지시로 일단 F 고정
  const rankCode = 'F'

  // 외부 클릭 시 팝업 닫기
  useEffect(() => {
    if (!isStampPopupOpen) return
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setIsStampPopupOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isStampPopupOpen])

  return (
    <div ref={popupRef} className="relative flex items-center gap-2">
      {/* 도장 (원형 — 오늘 받았으면 보라 채움) */}
      <button
        type="button"
        onClick={() => setIsStampPopupOpen((v) => !v)}
        aria-label={hasTodayStamp ? '오늘 도장 받음' : '오늘 도장 미수령'}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#6366F1]/10 transition-colors hover:bg-[#6366F1]/20"
      >
        <span
          className={cn(
            'block h-5 w-5 rounded-full border-2 transition-colors',
            hasTodayStamp
              ? 'border-[#6366F1] bg-[#6366F1]'
              : 'border-[#6366F1] bg-transparent',
          )}
        />
      </button>

      {/* XP */}
      <div
        aria-label="총 경험치"
        className="flex h-10 items-center gap-1.5 rounded-xl bg-[#6366F1]/10 px-3 text-[#6366F1]"
      >
        <span className="text-xs font-bold uppercase tracking-wide opacity-80">XP</span>
        <span className="text-sm font-bold">
          {loading ? '…' : totalXp.toLocaleString()}
        </span>
      </div>

      {/* 계급 */}
      <div
        aria-label="계급"
        className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6366F1] text-white"
      >
        <span className="text-base font-black tracking-tight">{rankCode}</span>
      </div>

      {/* 도장 팝업 */}
      {isStampPopupOpen && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-[100] w-64 rounded-xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
          <p className="mb-2 text-sm font-bold text-gray-900 dark:text-gray-100">
            나의 도장 기록
          </p>
          <div className="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
            <div className="flex items-center justify-between">
              <span>오늘 도장</span>
              <span className="font-semibold">
                {hasTodayStamp ? '받음' : '미수령'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>연속 접속</span>
              <span className="font-semibold">{currentStreak}일</span>
            </div>
            <div className="flex items-center justify-between">
              <span>누적 접속</span>
              <span className="font-semibold">{totalDays}일</span>
            </div>
          </div>
          <div className="absolute -top-2 right-4 h-0 w-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] border-b-white dark:border-b-gray-900" />
        </div>
      )}
    </div>
  )
}
