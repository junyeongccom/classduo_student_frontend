/**
 * @file SolveSidebar.tsx
 * @description 풀이 페이지 좌측 사이드바 — 회차정보 + 숙련도 컬러 문항 그리드 + 경과시간
 * @module features/exam-prep-final/components/ui
 */

'use client'

import { useTranslations } from 'next-intl'
import { cn } from '@/shared/lib/utils'

type MasteryState = 'learning' | 'skilled' | 'master'

interface MasterySummary {
  learning: number
  skilled: number
  master: number
}

interface SolveSidebarProps {
  /** 회차 라벨 (예: "3주차 2차시") */
  sessionLabel: string
  /** 회차 제목 */
  lectureTitle: string
  /** 전체 문항 수 */
  total: number
  /** 현재 1-based 문항 번호 */
  currentSeq: number
  /** seq → mastery state. 없으면 미답(누적 mastery 없음) 처리 */
  seqStateMap: Map<number, MasteryState>
  /** 누적 숙련도 카운트 — Learning/Skilled/Master 합산 */
  masterySummary: MasterySummary
  /** 현재 문항의 mastery state — 해당 줄에 ring 강조 */
  currentQuestionState: MasteryState | null
  /** 클릭으로 이동 */
  onSelectSeq: (seq: number) => void
  /** 경과 시간 (초) */
  elapsedSec: number
  /** Phase5 결과 화면처럼 모바일에서 progress bar 불필요한 케이스에서 모바일 부분 통째로 숨김 */
  hideOnMobile?: boolean
}

const STATE_BG: Record<MasteryState, string> = {
  learning: 'bg-[#D9D9D9] text-gray-900',
  skilled: 'bg-[#FFCD36] text-gray-900',
  master: 'bg-[#C4B5FD] text-violet-900',
}

export function SolveSidebar({
  sessionLabel,
  lectureTitle,
  total,
  currentSeq,
  seqStateMap,
  masterySummary,
  currentQuestionState,
  onSelectSeq,
  elapsedSec,
  hideOnMobile = false,
}: SolveSidebarProps) {
  const t = useTranslations()
  const seqs = Array.from({ length: total }, (_, i) => i + 1)

  return (
    <>
      {/* Mobile: 상단 가로 progress bar (회차 라벨 + 문항 dots + 경과).
          hideOnMobile=true 시 (결과 화면) 통째로 숨김. */}
      {!hideOnMobile && (
      <div className="md:hidden flex shrink-0 flex-col gap-1.5 border-b border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="min-w-0 flex-1 truncate text-gray-500 dark:text-gray-400">
            <span className="font-semibold">{sessionLabel}</span>
            {sessionLabel && lectureTitle ? ' · ' : ''}
            <span>{lectureTitle}</span>
          </span>
          <span className="shrink-0 tabular-nums font-semibold text-gray-700 dark:text-gray-200"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            {currentSeq}/{total} · {formatElapsed(elapsedSec)}
          </span>
        </div>
        <div className="scroll-x-wrapper flex gap-1.5 pb-1">
          {seqs.map((seq) => {
            const isCurrent = seq === currentSeq
            const state = seqStateMap.get(seq)
            const bgCls = state ? STATE_BG[state] : 'bg-gray-100 text-gray-800'
            return (
              <button
                key={seq}
                type="button"
                onClick={() => onSelectSeq(seq)}
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black leading-none transition-all',
                  bgCls,
                  isCurrent ? 'ring-2 ring-violet-500 scale-110' : '',
                )}
              >
                {seq}
              </button>
            )
          })}
        </div>
      </div>
      )}

      {/* Desktop: 좌측 사이드바 (기존) */}
      <aside className="hidden md:flex h-full w-[200px] md:w-[260px] shrink-0 flex-col gap-3 md:gap-6 border-r border-gray-200 bg-white p-3 md:p-6 dark:border-gray-700 dark:bg-gray-900">
        {/* 회차 정보 */}
        <div>
          <p className="text-xs text-gray-400">{sessionLabel}</p>
          <h2 className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-50">
            {lectureTitle}
          </h2>
        </div>

        {/* 숙련도 카운트 — 현재 문항의 mastery 줄에 ring 강조 */}
        <div className="flex flex-col gap-1">
          <MasteryRow
            color="#D9D9D9"
            label="Learning"
            count={masterySummary.learning}
            ringColor="#9CA3AF"
            highlighted={currentQuestionState === 'learning'}
          />
          <MasteryRow
            color="#FFCD36"
            label="Skilled"
            count={masterySummary.skilled}
            ringColor="#FFCD36"
            highlighted={currentQuestionState === 'skilled'}
          />
          <MasteryRow
            color="#A78BFA"
            label="Master"
            count={masterySummary.master}
            ringColor="#A78BFA"
            highlighted={currentQuestionState === 'master'}
          />
        </div>

        {/* 문항 그리드 — 사각 (round 30). 현재 문항은 폰트만 키움 (블러/그림자 없음) */}
        <div className="grid grid-cols-5 gap-2.5">
          {seqs.map((seq) => {
            const isCurrent = seq === currentSeq
            const state = seqStateMap.get(seq)
            const bgCls = state ? STATE_BG[state] : 'bg-gray-100 text-gray-800'
            return (
              <button
                key={seq}
                type="button"
                onClick={() => onSelectSeq(seq)}
                className={cn(
                  'flex h-[38px] w-[38px] items-center justify-center rounded-[30px] font-black leading-none transition-all',
                  bgCls,
                  isCurrent
                    ? 'text-lg scale-[1.06]'
                    : 'text-base hover:brightness-95',
                )}
              >
                {seq}
              </button>
            )
          })}
        </div>

        {/* 경과 시간 — 문항 그리드 바로 아래. 라벨 bold, 숫자 regular Pretendard */}
        <div
          className="flex items-center justify-between text-sm"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          <span className="font-bold text-gray-500 dark:text-gray-400">
            {t('examPrepFinal.elapsedTime')}
          </span>
          <span className="font-normal tabular-nums text-gray-900 dark:text-gray-50">
            {formatElapsed(elapsedSec)}
          </span>
        </div>
      </aside>
    </>
  )
}

function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

interface MasteryRowProps {
  color: string
  label: string
  count: number
  ringColor: string
  highlighted: boolean
}

/** 숙련도 한 줄 — 점 + 라벨 + 카운트. highlighted 면 같은 톤 ring 으로 현재 문항 표시. */
function MasteryRow({ color, label, count, ringColor, highlighted }: MasteryRowProps) {
  return (
    <div
      className="flex items-center gap-2 rounded-md px-2 py-1 text-[13px] font-bold text-gray-800 transition-all"
      style={highlighted ? { boxShadow: `inset 0 0 0 2px ${ringColor}` } : undefined}
    >
      <span
        className="inline-block h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span>{label}</span>
      <span className="ml-auto tabular-nums">{count}</span>
    </div>
  )
}
