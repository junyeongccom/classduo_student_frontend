/**
 * @file ExamPrepHeaderBar.tsx
 * @description 기말대비 학습 페이지 — 상단 우측바(프로필 옆)에 들어가는 등급+XP+책장 바.
 *   - 계급 뱃지 클릭 시 학점 임계 XP 표 팝업 노출
 *   - XP 진행 바 옆 자동 노출 툴팁 (확인 클릭 시 24시간 미노출)
 *   기존 ExamPrepRewardWidget(도장·XP·계급 3개) 대체.
 * @module features/exam-prep-final/components/ui
 * @dependencies StudentCourseStateDto, BookshelfWidget, next-intl
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import { useLocale } from 'next-intl'
import type { StudentCourseStateDto } from '@/shared/services/gamificationService'
import { deriveRankFromXp } from '../result-overlay/utils'
import { BookshelfWidget } from './BookshelfWidget'

interface ExamPrepHeaderBarProps {
  state: StudentCourseStateDto | null
  loading?: boolean
  /** courseId 단위로 툴팁 dismiss 상태 분리. 없으면 'default' 키 사용. */
  courseId?: string | null
}

/** 백엔드 RANK_BRACKETS 와 동일한 진급 임계 (총 XP 기준). 핵심테스트 15→10 변경 반영. */
const RANK_THRESHOLDS: Array<{ from: string; to: string; total: number }> = [
  { from: 'F',  to: 'D',  total: 100 },
  { from: 'D',  to: 'D+', total: 300 },
  { from: 'D+', to: 'C',  total: 650 },
  { from: 'C',  to: 'C+', total: 1100 },
  { from: 'C+', to: 'B',  total: 1700 },
  { from: 'B',  to: 'B+', total: 2300 },
  { from: 'B+', to: 'A',  total: 3000 },
  { from: 'A',  to: 'A+', total: 3750 },
]

interface ProgressInfo {
  /** 현재 등급에서 다음 등급으로 진급하는 데 필요한 누적 XP (예: D→D+ 면 300) */
  nextTotal: number
  ratio: number
  isMax: boolean
}

function computeProgress(rankCode: string, totalXp: number): ProgressInfo {
  const step = RANK_THRESHOLDS.find((t) => t.from === rankCode)
  if (!step) return { nextTotal: totalXp, ratio: 1, isMax: true } // A+
  const prevTotal =
    RANK_THRESHOLDS.find((t) => t.to === rankCode)?.total ?? 0
  const span = step.total - prevTotal
  const earned = Math.max(0, totalXp - prevTotal)
  const ratio = span > 0 ? Math.min(1, earned / span) : 0
  return {
    nextTotal: step.total,
    ratio,
    isMax: false,
  }
}

/** 등급 코드 → 진행 바 색 (course-dashboard tier 컬러 톤 미러) */
const RANK_COLORS: Record<string, string> = {
  F: '#EF4444',
  D: '#A16207',
  'D+': '#CA8A04',
  C: '#65A30D',
  'C+': '#16A34A',
  B: '#0891B2',
  'B+': '#2563EB',
  A: '#7C3AED',
  'A+': '#383698',
}

const DISMISS_24H_MS = 24 * 60 * 60 * 1000

/** localStorage 에 ISO 타임스탬프로 저장된 dismiss 시점 + 24시간 미경과 여부.
 *  SSR/예외 시 true 반환 → 자동 노출 회피 (보수적). */
function isDismissedWithin24h(key: string): boolean {
  if (typeof window === 'undefined') return true
  try {
    const v = window.localStorage.getItem(key)
    if (!v) return false
    const ts = new Date(v).getTime()
    if (Number.isNaN(ts)) return false
    return Date.now() - ts < DISMISS_24H_MS
  } catch {
    return false
  }
}

function markDismissed(key: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, new Date().toISOString())
  } catch {
    // localStorage 차단 시 다음 진입에 또 노출될 뿐 — 사용자 영향 없음
  }
}

export function ExamPrepHeaderBar({ state, loading = false, courseId }: ExamPrepHeaderBarProps) {
  const locale = useLocale()
  const totalXp = state?.total_xp ?? 0
  const currentStreak = state?.current_streak ?? 0
  // 등급은 totalXp 로부터 derive — 백엔드 rank.code stale 시에도 일관성 보장.
  const rankCode = deriveRankFromXp(totalXp)
  const { nextTotal, ratio, isMax } = computeProgress(rankCode, totalXp)
  const barColor = RANK_COLORS[rankCode] ?? '#6366F1'

  const courseKey = courseId ?? 'default'
  const expDismissKey = `expBarTooltip_dismissed_${courseKey}`

  const [isExpTooltipOpen, setIsExpTooltipOpen] = useState(false)
  const [isBadgePopupOpen, setIsBadgePopupOpen] = useState(false)
  const expTooltipRef = useRef<HTMLDivElement>(null)
  const badgePopupRef = useRef<HTMLDivElement>(null)

  // 첫 진입 시 24시간 dismiss 검사 → 자동 노출
  useEffect(() => {
    if (!isDismissedWithin24h(expDismissKey)) {
      setIsExpTooltipOpen(true)
    }
  }, [expDismissKey])

  // 외부 클릭 닫기 — 경험치 툴팁
  useEffect(() => {
    if (!isExpTooltipOpen) return
    const handleClick = (e: MouseEvent) => {
      if (expTooltipRef.current && !expTooltipRef.current.contains(e.target as Node)) {
        setIsExpTooltipOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isExpTooltipOpen])

  // 외부 클릭 닫기 — 계급 뱃지 팝업
  useEffect(() => {
    if (!isBadgePopupOpen) return
    const handleClick = (e: MouseEvent) => {
      if (badgePopupRef.current && !badgePopupRef.current.contains(e.target as Node)) {
        setIsBadgePopupOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isBadgePopupOpen])

  const handleExpDismiss = () => {
    markDismissed(expDismissKey)
    setIsExpTooltipOpen(false)
  }

  const isKo = locale !== 'en'
  const expTooltipBody = isKo
    ? '경험치를 모으고 A+ 뱃지를 달성하세요!\n추첨 이벤트 예정!'
    : 'Earn XP and unlock the A+ badge!\nRaffle event coming soon!'
  const expTooltipConfirm = isKo ? '확인' : 'OK'
  const badgePopupTitle = isKo ? '학점 뱃지 시스템' : 'Grade Badge System'
  const badgePopupSubtitle = isKo
    ? '각 학점 진급에 필요한 누적 XP'
    : 'Total XP thresholds for each grade promotion'
  // "240 / 300 XP" — 현재 누적 XP / 다음 등급 도달 임계 XP. A+ 면 "/ MAX".
  const xpDisplay = loading
    ? '…'
    : isMax
      ? `${totalXp.toLocaleString()} / MAX`
      : `${totalXp.toLocaleString()} / ${nextTotal.toLocaleString()}`
  // 등급 이미지 — public/grade/{rank}.png ('+' URL 인코딩)
  const rankImageSrc = `/grade/${encodeURIComponent(rankCode)}.png`

  return (
    <div className="flex items-center gap-4">
      {/* 계급 뱃지 — 클릭 시 학점 임계 XP 표 팝업 */}
      <div ref={badgePopupRef} className="relative">
        <button
          type="button"
          onClick={() => setIsBadgePopupOpen((v) => !v)}
          className="block h-12 w-12 shrink-0 cursor-pointer transition-opacity hover:opacity-80"
          aria-label={isKo
            ? `현재 계급 ${rankCode} — 클릭하여 뱃지 시스템 보기`
            : `Current grade ${rankCode} — click to see badge system`}
        >
          <img
            src={rankImageSrc}
            alt={rankCode}
            draggable={false}
            className="h-full w-full select-none object-contain"
          />
        </button>
        {isBadgePopupOpen && (
          <div className="absolute left-0 top-[calc(100%+8px)] z-[100] w-72 rounded-xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-50">{badgePopupTitle}</p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{badgePopupSubtitle}</p>
            <ul className="mt-3 space-y-1.5">
              {RANK_THRESHOLDS.map((th) => (
                <li key={th.from} className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-700 dark:text-gray-200">
                    {th.from} → {th.to}
                  </span>
                  <span
                    className="font-semibold"
                    style={{ color: RANK_COLORS[th.to] ?? '#6366F1' }}
                  >
                    {th.total.toLocaleString()} XP
                  </span>
                </li>
              ))}
            </ul>
            <div className="absolute -top-2 left-6 h-0 w-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] border-b-white dark:border-b-gray-900" />
          </div>
        )}
      </div>

      {/* XP 진행 바 — "240 / 300 XP" 표기 + 자동 노출/24시간 dismiss 툴팁 */}
      <div ref={expTooltipRef} className="relative flex w-[200px] shrink-0 flex-col gap-1">
        <div className="flex items-baseline justify-end">
          <span
            className="text-sm font-bold leading-none text-gray-900 dark:text-gray-50"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            {xpDisplay}
            <span className="ml-1 text-sm font-bold text-gray-500">XP</span>
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{
              width: `${Math.round(ratio * 100)}%`,
              backgroundColor: barColor,
            }}
          />
        </div>
        {isExpTooltipOpen && (
          <div className="absolute left-0 top-[calc(100%+8px)] z-[100] w-72 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-2xl">
            <div className="mb-3">
              <p className="whitespace-pre-line text-sm font-medium leading-relaxed text-gray-700 dark:text-gray-300">
                {expTooltipBody}
              </p>
            </div>
            <div className="flex items-center justify-end border-t border-gray-100 dark:border-gray-700 pt-3">
              <button
                onClick={handleExpDismiss}
                className="rounded-lg bg-[#6366F1] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#5558E6]"
              >
                {expTooltipConfirm}
              </button>
            </div>
            <div className="absolute -top-2 left-6 h-0 w-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] border-b-white dark:border-b-gray-900" />
          </div>
        )}
      </div>

      {/* 출석 책장 — streak 별 색/책수, 클릭 시 쉐이커 이스터에그.
          courseId 전달로 과목별 일자 풀이수를 분리해서 카운트 (전역 누적이 아니다). */}
      <BookshelfWidget currentStreak={currentStreak} courseId={courseId ?? null} size={48} />
    </div>
  )
}
