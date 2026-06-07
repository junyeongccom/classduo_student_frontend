/**
 * @file MobileSolveFooter.tsx
 * @description 풀이 페이지 모바일 하단 푸터 — 데스크탑 좌측 사이드바를 하단으로 재배치 (시안 942:9281)
 *   회차/테스트명 + 5열 문항 그리드 + 진행률(1/10) + 경과시간.
 * @module features/exam-prep-final/components/ui
 */

'use client'

import { useTranslations } from 'next-intl'

type MasteryState = 'learning' | 'skilled' | 'master'

interface MobileSolveFooterProps {
  /** 회차 라벨 (예: "1주차 2차시") */
  sessionLabel: string
  /** 테스트(강의) 제목 */
  lectureTitle: string
  /** 전체 문항 수 */
  total: number
  /** 현재 1-based 문항 번호 */
  currentSeq: number
  /** seq → mastery state. 없으면 미답 처리 */
  seqStateMap: Map<number, MasteryState>
  /** 클릭으로 이동 */
  onSelectSeq: (seq: number) => void
  /** 경과 시간 (초) */
  elapsedSec: number
}

/** mastery state → 셀 배경/글자색. 미답은 #ececec (시안 기본). */
const CELL_BG: Record<MasteryState, string> = {
  learning: '#D9D9D9',
  skilled: '#FFCD36',
  master: '#A78BFA',
}

export function MobileSolveFooter({
  sessionLabel,
  lectureTitle,
  total,
  currentSeq,
  seqStateMap,
  onSelectSeq,
  elapsedSec,
}: MobileSolveFooterProps) {
  const t = useTranslations()
  const seqs = Array.from({ length: total }, (_, i) => i + 1)

  return (
    <footer
      className="shrink-0 border-t border-gray-200 bg-white px-2 pb-[10px] pt-[9px] dark:border-gray-800 dark:bg-gray-900"
      style={{ fontFamily: 'Pretendard, sans-serif' }}
    >
      {/* Frame 76 — 좌: 테스트 정보 / 우: 문항 그리드 */}
      <div className="flex items-start gap-6">
        {/* 자료명, 테스트명 */}
        <div className="min-w-0 flex-1 p-1">
          <p className="truncate text-[12px] leading-[1.2] text-gray-500 dark:text-gray-400">
            {sessionLabel}
          </p>
          <p className="mt-0.5 line-clamp-3 break-keep text-[16px] font-semibold leading-[1.2] text-gray-900 dark:text-gray-50">
            {lectureTitle}
          </p>
        </div>

        {/* 문항 그리드 — 5열 2행. 현재 문항은 1.25배 확대(폰트 12→15px 동반). */}
        <div className="grid shrink-0 grid-cols-5 gap-x-[9px] gap-y-[18.75px]">
          {seqs.map((seq) => {
            const isCurrent = seq === currentSeq
            const state = seqStateMap.get(seq)
            const bg = state ? CELL_BG[state] : '#ececec'
            const fg = state === 'master' ? '#ffffff' : '#1f2937'
            return (
              <button
                key={seq}
                type="button"
                onClick={() => onSelectSeq(seq)}
                className={
                  'flex h-[29.25px] w-[28.5px] items-center justify-center rounded-full text-[12px] font-extrabold leading-none tabular-nums transition-transform' +
                  (isCurrent ? ' z-10 scale-[1.25]' : '')
                }
                style={{ backgroundColor: bg, color: fg }}
              >
                {seq}
              </button>
            )
          })}
        </div>
      </div>

      {/* Frame 77 — 좌: 진행률 / 우: 경과시간 */}
      <div className="mt-[14px] flex items-center justify-between px-1.5">
        <p className="text-[24px] leading-[1.2]">
          <span className="font-bold text-black dark:text-white">{currentSeq}</span>
          <span className="font-medium text-[#676767]"> / {total}</span>
        </p>
        <div className="flex items-center gap-5 text-[14px] leading-[1.2]">
          <span className="font-semibold text-black dark:text-white">
            {t('examPrepFinal.elapsedTime')}
          </span>
          <span className="tabular-nums font-normal text-black dark:text-white">
            {formatElapsed(elapsedSec)}
          </span>
        </div>
      </div>
    </footer>
  )
}

function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
