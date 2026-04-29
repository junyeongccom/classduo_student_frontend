/**
 * @file ExamPrepRewardWidget.tsx
 * @description 기말 대비 학습 페이지 우상단 보상 위젯 — 도장 · XP · 계급
 * @module features/exam-prep-final/components/ui
 * @dependencies StudentCourseState
 *
 * 동작:
 *  - 도장(원형): last_study_date == 오늘(KST) 이면 보라 채움, 아니면 비어있음
 *  - 도장 클릭 → 연속/누적 일수 + 다음 계급까지 필요한 XP 팝업 토글
 *  - XP: total_xp 표시
 *  - 계급: 백엔드 rank.code (F/D/D+/C/C+/B/B+/A/A+). 데이터 미수신 시 'F' fallback
 */
'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/shared/lib/utils'
import type { StudentCourseStateDto } from '@/shared/services/gamificationService'

interface ExamPrepRewardWidgetProps {
  state: StudentCourseStateDto | null
  loading?: boolean
}

/** KST 기준 오늘 ISO 날짜 (yyyy-mm-dd) */
function getKstTodayIso(): string {
  const now = new Date()
  // KST = UTC+9
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

/**
 * 계급 진급까지 필요한 XP / 추가 조건 안내.
 * 백엔드 RANK_BRACKETS (b2b20260429 r3.2) 와 동일한 임계값을 미러링한다.
 *
 * 진급 임계 (총 XP):
 *   F→D 150 / D→D+ 450 / D+→C 950 / C→C+ 1650 / C+→B 2500 /
 *   B→B+ 3450 / B+→A 4500 / A→A+ 5600
 *
 * A / A+ 추가 조건 (master/stamp XP 하한):
 *   A  : master_xp ≥ 4500
 *   A+ : master_xp ≥ 4500, stamp_xp ≥ 1100
 */
const RANK_THRESHOLDS: Array<{ from: string; to: string; total: number }> = [
  { from: 'F',  to: 'D',  total: 150 },
  { from: 'D',  to: 'D+', total: 450 },
  { from: 'D+', to: 'C',  total: 950 },
  { from: 'C',  to: 'C+', total: 1650 },
  { from: 'C+', to: 'B',  total: 2500 },
  { from: 'B',  to: 'B+', total: 3450 },
  { from: 'B+', to: 'A',  total: 4500 },
  { from: 'A',  to: 'A+', total: 5600 },
]

interface NextRankProgress {
  /** 다음 등급 코드. 이미 A+ 도달 시 null */
  nextCode: string | null
  /** 다음 등급까지 필요한 추가 총 XP (0이면 임계는 충족, 다른 조건 부족) */
  xpRemaining: number
  /** 추가로 필요한 master_xp (A/A+ 진급 시 master 부족분) */
  masterXpRemaining: number
  /** 추가로 필요한 stamp_xp (A+ 진급 시 도장 부족분) */
  stampXpRemaining: number
  /** 사람이 읽기 좋은 한 줄 요약 */
  hint: string
}

function computeNextRankProgress(args: {
  rankCode: string
  totalXp: number
  masterXp: number
  stampXp: number
}): NextRankProgress {
  const { rankCode, totalXp, masterXp, stampXp } = args
  const step = RANK_THRESHOLDS.find((t) => t.from === rankCode)
  if (!step) {
    // 이미 A+ 도달
    return {
      nextCode: null,
      xpRemaining: 0,
      masterXpRemaining: 0,
      stampXpRemaining: 0,
      hint: '최고 계급에 도달했어요!',
    }
  }
  const xpRemaining = Math.max(0, step.total - totalXp)
  let masterXpRemaining = 0
  let stampXpRemaining = 0
  if (step.to === 'A' || step.to === 'A+') {
    masterXpRemaining = Math.max(0, 4500 - masterXp)
  }
  if (step.to === 'A+') {
    stampXpRemaining = Math.max(0, 1100 - stampXp)
  }

  // hint 작성: 가장 부족한 조건을 강조
  const parts: string[] = []
  if (xpRemaining > 0) parts.push(`XP +${xpRemaining}`)
  if (masterXpRemaining > 0) parts.push(`문제 Master XP +${masterXpRemaining}`)
  if (stampXpRemaining > 0) parts.push(`도장 XP +${stampXpRemaining}`)
  const hint = parts.length > 0
    ? `${step.to} 진급까지 ${parts.join(' · ')}`
    : `${step.to} 진급 조건 충족 — 곧 갱신됩니다`

  return {
    nextCode: step.to,
    xpRemaining,
    masterXpRemaining,
    stampXpRemaining,
    hint,
  }
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
  const masterXp = state?.master_xp ?? 0
  const stampXp = state?.stamp_xp ?? 0
  const currentStreak = state?.current_streak ?? 0
  const totalDays = state?.total_study_days ?? 0
  const rankCode = state?.rank?.code ?? 'F'

  const next = computeNextRankProgress({
    rankCode,
    totalXp,
    masterXp,
    stampXp,
  })

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
        <div className="absolute right-0 top-[calc(100%+8px)] z-[100] w-72 rounded-xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
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

          <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-700">
            <p className="mb-1 text-xs font-bold text-gray-500 dark:text-gray-400">
              경험치 상세
            </p>
            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
              <div className="flex items-center justify-between">
                <span>문제 Master XP</span>
                <span className="font-semibold">{masterXp.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>도장 XP</span>
                <span className="font-semibold">{stampXp.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-[#6366F1]">
                <span>총 XP</span>
                <span className="font-bold">{totalXp.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                현재 계급
              </span>
              <span className="text-sm font-black text-[#6366F1]">{rankCode}</span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
              {next.hint}
            </p>
          </div>

          <div className="absolute -top-2 right-4 h-0 w-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] border-b-white dark:border-b-gray-900" />
        </div>
      )}
    </div>
  )
}
