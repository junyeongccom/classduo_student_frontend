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
}: SolveSidebarProps) {
  const t = useTranslations()
  const seqs = Array.from({ length: total }, (_, i) => i + 1)

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col gap-6 border-r border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
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

      {/* 문항 그리드 — 사각 (round 30) + 현재 문항은 폰트 키움 + 짙은 그림자 (흰 링 제거) */}
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
                'flex h-9 w-9 items-center justify-center rounded-[30px] font-black leading-none transition-all',
                bgCls,
                isCurrent
                  ? 'text-lg shadow-[0_3px_8px_rgba(15,23,42,0.18)] scale-[1.06]'
                  : 'text-base hover:brightness-95',
              )}
            >
              {seq}
            </button>
          )
        })}
      </div>

      {/* 경과 시간 — 문항 그리드 바로 아래 */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500 dark:text-gray-400">
          {t('examPrepFinal.elapsedTime')}
        </span>
        <span className="font-mono font-semibold text-gray-900 dark:text-gray-50">
          {formatElapsed(elapsedSec)}
        </span>
      </div>
    </aside>
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
