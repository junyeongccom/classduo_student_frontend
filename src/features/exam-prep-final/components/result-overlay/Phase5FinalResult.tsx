/**
 * @file Phase5FinalResult.tsx
 * @description 테스트 종료 5단계 — 기존 문제영역 레이아웃에 표시되는 최종 결과 패널.
 *   - 좌상단: 핵심 14 / Mid N / Final + 회차명
 *   - 가운데: 총 획득 경험치 카운트업 + 진행 바 (현재 등급 기준)
 *   - 우상단: 흰 네모 + 등급 글자 -18° 기울임. 레벨업 시 te-grade-pop
 *   - 4 박스: 연속 학습 일수 / 걸린 시간 / 숙련도 현황 / 문항별 OX
 *   - 격려 문구 + [다시풀기] / [다음] / [종료] 버튼
 * @module features/exam-prep-final/components/result-overlay
 * @dependencies FinalResultData, getRankProgress, formatElapsed
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { FinalResultData, MasteryState } from './types'
import { formatElapsed, getRankProgress } from './utils'

interface Phase5Props {
  data: FinalResultData
  onRestart: () => void
  onNext?: () => void
  onExit: () => void
  /** Phase1~4 시퀀스가 끝났거나 skip되어 본 화면이 시각적으로 노출된 시점부터 true.
   *  false인 동안 카운트업/진행바 RAF 와 MasteryRow setInterval 모두 대기. */
  startAnimation: boolean
}

const XP_COUNT_DUR = 1800
const BAR_DUR = 1800
/** 마스터리 카운트 — 1단위씩 변경. 너무 많은 변동(N≥10) 이면 전체 1.5s 이내로 끝나게 가속. */
const MASTERY_TICK_TOTAL_MAX = 1500

const STATE_BG_DOT: Record<MasteryState, string> = {
  learning: '#ECECEE',
  skilled: '#FFC53D',
  master: '#6E5BE2',
}

const RIGHT_GREEN = '#76D76F'
const WRONG_RED = '#F4473E'
const HINT_GREEN_OPAQUE = 'rgba(118, 215, 111, 0.5)'

export function Phase5FinalResult({ data, onRestart, onNext, onExit, startAnimation }: Phase5Props) {
  const t = useTranslations()
  const {
    pre,
    postTotalXp,
    postRankCode,
    postCurrentStreak,
    postMasterySummary,
    questionDeltas,
    masterXpEarned,
    dailyXpEarned,
    totalTimeSec,
    correctCount,
    total,
    testType,
    testNumber,
    sessionLabel,
    lectureTitle,
  } = data

  const totalEarnedXp = masterXpEarned + dailyXpEarned

  /**
   * 진행 바 — post 등급 기준 ratio. 풀이 전(preTotalXp 가 post 등급 밴드에서 차지하는 비율)
   * 부터 풀이 후(postTotalXp 의 비율)까지 채움. 레벨업 시 preRatio 는 post 밴드 시작점 0
   * 근처에서 시작 (preTotalXp 가 post 밴드 prevTotal 보다 작을 수 있음 → clamp).
   */
  const ratioInPostBand = (xp: number): number => {
    const prog = getRankProgress(postRankCode, xp)
    if (prog.isMax) return 1
    const span = prog.nextTotal - prog.prevTotal
    if (span <= 0) return 0
    return Math.max(0, Math.min(1, (xp - prog.prevTotal) / span))
  }
  const preRatio = ratioInPostBand(pre.totalXp)
  const postRatio = ratioInPostBand(postTotalXp)

  // ─── 카운트업 (총 획득 XP 0 → totalEarnedXp) + 진행 바 (preRatio → postRatio) ───
  const [xpDisplay, setXpDisplay] = useState(0)
  const [barFill, setBarFill] = useState(preRatio)
  // 등급 — 풀이 전 등급으로 시작. 레벨업 시 t≈0.7 에서 post 등급으로 flip + pop. 레벨업 X
  // 면 t≈0.92 에서 그냥 pop.
  const [gradeDisplay, setGradeDisplay] = useState(pre.rankCode)
  const [gradePulse, setGradePulse] = useState(0)
  // 최신 target 값을 RAF 클로저에서 읽기 (postState 비동기 도착해도 반영)
  const xpTargetRef = useRef(totalEarnedXp)
  const preRatioRef = useRef(preRatio)
  const postRatioRef = useRef(postRatio)
  const postRankRef = useRef(postRankCode)
  xpTargetRef.current = totalEarnedXp
  preRatioRef.current = preRatio
  postRatioRef.current = postRatio
  postRankRef.current = postRankCode
  const startedRef = useRef(false)
  const flippedRef = useRef(false)

  useEffect(() => {
    // Phase1~4 오버레이가 떠 있는 동안엔 본 화면이 가려져 있어 카운트업이
    // 백그라운드에서 끝나버리는 문제를 방지 — startAnimation 신호 받기 전엔 대기.
    if (!startAnimation) return
    // StrictMode dev double-mount 가드. cleanup 으로 RAF cancel 안함 — 두 번째 mount 가
    // 첫 번째를 죽이면 영원히 멈춤. 자연 종료 (t===1) 까지 두는 게 안전.
    if (startedRef.current) return
    startedRef.current = true
    const start = performance.now()
    const tick = () => {
      const now = performance.now()
      const elapsed = now - start
      const t = Math.min(1, elapsed / Math.max(XP_COUNT_DUR, BAR_DUR))
      const eased = 1 - Math.pow(1 - t, 3)
      setXpDisplay(Math.round(eased * xpTargetRef.current))
      // bar: preRatio → postRatio (선형 보간)
      const span = postRatioRef.current - preRatioRef.current
      setBarFill(preRatioRef.current + eased * span)

      const willLevelUp = pre.rankCode !== postRankRef.current
      // 레벨업 케이스만 pop 재생 — 변동 없을 땐 모션 일절 X (사용자 요청).
      if (willLevelUp && !flippedRef.current && t >= 0.7) {
        flippedRef.current = true
        setGradeDisplay(postRankRef.current)
        setGradePulse((p) => p + 1)
      }

      if (t < 1) {
        requestAnimationFrame(tick)
      }
    }
    requestAnimationFrame(tick)
  }, [pre.rankCode, startAnimation])

  // ─── 좌상단 라벨 — 큰 번호 / 주차차시 / 회차제목 3행 ───
  const headlineLabel =
    testType === 'mid'
      ? `Mid ${testNumber ?? ''}`
      : testType === 'final'
        ? 'Final'
        : `${testNumber ?? ''}`
  // 2번째 줄(주차차시) — mid/final 은 통합 라벨 사용
  const sessionLine =
    testType === 'mid'
      ? t('examPrepFinal.midTestOfSet', { testNumber: testNumber ?? '' })
      : testType === 'final'
        ? '최종 테스트'
        : sessionLabel
  // 3번째 줄(회차제목) — core 만 노출, mid/final 은 빈 문자열
  const titleLine = testType === 'core' ? lectureTitle : ''

  // ─── 격려 문구 ───
  const allMaster = postMasterySummary.master >= total
  const encouragement = allMaster ? t('examPrepFinal.encouragementAllMaster') : t('examPrepFinal.encouragementTryAgain')

  return (
    <div
      className="flex h-full flex-1 flex-col overflow-y-auto bg-white px-4 py-6 md:px-12 md:py-10"
      style={{ fontFamily: 'Pretendard, sans-serif' }}
    >
      {/* ──────── 상단 row: 모바일은 세로 stack, 데스크탑은 [번호+회차] | [XP + bar (with grade pinned to end)] ──────── */}
      <div className="flex flex-col gap-6 md:grid md:grid-cols-[auto_1fr] md:items-center md:gap-10">
        {/* 좌상단 — 큰 번호 / 주차차시 / 회차제목 (3행). 테스트 마스터 시 챕터제목 위에 도장(이슈 12-2). */}
        <div className="relative flex flex-col gap-2 pt-1 md:pr-28 md:pt-2">
          {allMaster && (
            <img
              src="/master-big.png"
              alt={t('examPrepFinal.testMasterAlt')}
              aria-hidden
              draggable={false}
              className="master-stamp-pop pointer-events-none absolute right-0 top-0 z-10 h-14 w-auto max-w-[4rem] select-none object-contain opacity-70 md:h-24 md:max-w-[6.5rem]"
              style={{ animationDelay: '180ms', transformOrigin: '100% 0%' }}
            />
          )}
          <span className="text-4xl font-black leading-none text-gray-900 md:text-7xl">{headlineLabel}</span>
          {sessionLine && (
            <span className="text-sm font-bold text-gray-500 md:text-base">{sessionLine}</span>
          )}
          {titleLine && (
            <span className="line-clamp-2 text-base font-bold text-gray-900 md:text-2xl" title={titleLine}>{titleLine}</span>
          )}
        </div>

        {/* 우측(데스크탑) / 하단(모바일) — XP 헤더 + 진행 바 + 등급 박스 */}
        <div className="flex flex-col gap-3 md:gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 md:gap-4 md:pr-44">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 md:gap-4">
              <span className="text-base font-bold text-gray-900 md:text-2xl">{t('examPrepFinal.totalEarnedXp')}</span>
              <span className="text-2xl font-black text-gray-900 md:text-5xl">
                {xpDisplay.toLocaleString()} XP
              </span>
            </div>
            <span className="text-[10px] font-medium text-gray-500 md:text-xs">
              {t('examPrepFinal.gradeDisclaimerShort')}
            </span>
          </div>

          {/* bar + 등급 박스 한 row — 데스크탑은 등급 박스 absolute, 모바일은 inline */}
          <div className="relative flex items-center gap-3 md:pr-44">
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-100 md:h-3.5">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.round(barFill * 100)}%`,
                  backgroundColor: '#FF5A5F',
                  transition: 'width 30ms linear',
                }}
              />
            </div>
            {/* 등급 박스 — 모바일은 inline (작게), 데스크탑은 진행 바 우측 absolute + 회전 */}
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-white shadow-md md:absolute md:right-0 md:top-1/2 md:h-40 md:w-40 md:-translate-y-1/2 md:rotate-[-18deg] md:rounded-none md:shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
            >
              <span
                key={gradePulse}
                className="te-grade-pop text-4xl font-black leading-none text-gray-900 md:text-8xl"
              >
                {gradeDisplay}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ──────── 하단 박스 — 모바일 1열, 데스크탑 3열 ──────── */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:mt-10 md:grid-cols-[auto_1fr_1.4fr]">
        {/* 좌측 column: 연속 학습 + 걸린 시간 — 모바일에선 2열 grid, 데스크탑은 세로 stack */}
        <div className="grid w-full grid-cols-2 gap-3 md:flex md:flex-col md:gap-4 md:w-[180px]">
          <div className="te-fade-up flex h-24 flex-col items-start justify-center gap-1 rounded-2xl border border-gray-200 bg-white p-4 md:h-32 md:p-5">
            <span className="text-xl font-black text-gray-900 md:text-2xl">{t('examPrepFinal.streakDays', { days: postCurrentStreak })}</span>
            <span className="text-xs font-medium text-gray-500 md:text-sm">{t('examPrepFinal.streakOngoing')}</span>
          </div>
          <div className="te-fade-up flex h-24 items-center justify-start rounded-2xl border border-gray-200 bg-white px-4 md:px-5" style={{ animationDelay: '80ms' }}>
            <span className="text-2xl font-black tabular-nums text-gray-900 md:text-3xl">
              {formatElapsed(totalTimeSec)}
            </span>
          </div>
        </div>

        {/* 가운데 — 숙련도 현황 (풀이 전 → 풀이 후) */}
        <div className="te-fade-up flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5" style={{ animationDelay: '120ms' }}>
          <span className="text-base font-bold text-gray-900">{t('examPrepFinal.masterySummaryTitle')}</span>
          <div className="flex flex-col gap-2.5">
            <MasteryRow
              label="Learning"
              dotColor={STATE_BG_DOT.learning}
              before={pre.masterySummary.learning}
              after={postMasterySummary.learning}
              start={startAnimation}
            />
            <MasteryRow
              label="Skilled"
              dotColor={STATE_BG_DOT.skilled}
              before={pre.masterySummary.skilled}
              after={postMasterySummary.skilled}
              start={startAnimation}
            />
            <MasteryRow
              label="Master"
              dotColor={STATE_BG_DOT.master}
              before={pre.masterySummary.master}
              after={postMasterySummary.master}
              start={startAnimation}
            />
          </div>
        </div>

        {/* 우측 — 문항별 OX (이슈 12-3 사각 round 30 + 12-4 좁은 gap + 12-1 안 푼 마스터 도장) */}
        <div className="te-fade-up flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5" style={{ animationDelay: '160ms' }}>
          <span className="text-base font-bold text-gray-900">OX</span>
          <div className="grid grid-cols-5 gap-1.5">
            {questionDeltas
              .slice(0, 10)
              .sort((a, b) => a.seq - b.seq)
              .map((d) => {
                const ok = d.isCorrect === true
                const wrong = d.isCorrect === false
                // 안 푼 문항 (isCorrect===null) + 마스터 도달 상태(after==='master') → master 도장 (이슈 12-1)
                // after === 'master' 면 풀이 결과 무관하게 마스터 도장 (이미 마스터된 테스트 다시 푸는 케이스에서 OX 대신 도장 일관 표시)
                const skippedMaster = d.after === 'master'
                let bg = '#ECECEE'
                let textColor = '#1C1C1E'
                if (ok && d.hintUsed) {
                  bg = HINT_GREEN_OPAQUE
                  textColor = '#1C1C1E'
                } else if (ok) {
                  bg = RIGHT_GREEN
                  textColor = '#FFFFFF'
                } else if (wrong) {
                  bg = WRONG_RED
                  textColor = '#FFFFFF'
                }
                return (
                  <div
                    key={d.seq}
                    className="relative flex h-10 w-10 items-center justify-center rounded-[30px] text-sm font-bold"
                    style={{ backgroundColor: bg, color: textColor }}
                  >
                    {skippedMaster ? (
                      <img
                        src="/master.png"
                        alt={t('examPrepFinal.questionMasteredAlt', { seq: d.seq })}
                        aria-hidden
                        draggable={false}
                        className="absolute inset-0 h-full w-full select-none object-contain"
                      />
                    ) : (
                      d.seq
                    )}
                  </div>
                )
              })}
          </div>
        </div>
      </div>

      {/* ──────── 격려 문구 ──────── */}
      <p className="mt-10 text-center text-base font-bold text-gray-900">{encouragement}</p>

      {/* ──────── 버튼 ──────── */}
      <div className="mt-6 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={onRestart}
          className="rounded-2xl px-6 py-3 text-base font-bold md:px-12 md:py-4 md:text-lg transition-colors"
          style={{ backgroundColor: '#E9E5FB', color: '#2D2461' }}
        >
          {t('examPrepFinal.restart')}
        </button>
        {onNext && (
          <button
            type="button"
            onClick={onNext}
            className="rounded-2xl border border-gray-900 bg-white px-12 py-4 text-lg font-bold text-gray-900 transition-colors hover:bg-gray-50"
          >
            {t('examPrepFinal.nextQuestion')}
          </button>
        )}
        <button
          type="button"
          onClick={onExit}
          className="rounded-2xl px-6 py-3 text-base font-bold md:px-12 md:py-4 md:text-lg text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: '#2D2461' }}
        >
          {t('examPrepFinal.endTest')}
        </button>
      </div>
    </div>
  )
}

interface MasteryRowProps {
  label: string
  dotColor: string
  before: number
  after: number
  /** Phase1~4 오버레이가 떠 있는 동안엔 false → before 유지. true 가 되면 카운트업 시작. */
  start: boolean
}
function MasteryRow({ label, dotColor, before, after, start }: MasteryRowProps) {
  // before → after 까지 1단위씩 변경. 변동 폭에 따라 step interval 조정 (총 1.5s 이내).
  const [display, setDisplay] = useState(before)
  useEffect(() => {
    if (!start) {
      setDisplay(before)
      return
    }
    if (before === after) {
      setDisplay(after)
      return
    }
    const direction = after > before ? 1 : -1
    const steps = Math.abs(after - before)
    const stepDur = Math.max(80, Math.min(220, MASTERY_TICK_TOTAL_MAX / steps))
    let i = 0
    let current = before
    setDisplay(before)
    const id = window.setInterval(() => {
      i++
      current += direction
      setDisplay(current)
      if (i >= steps) window.clearInterval(id)
    }, stepDur)
    return () => window.clearInterval(id)
  }, [before, after, start])

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: dotColor }} />
        <span className="text-sm font-bold text-gray-900">{label}</span>
      </div>
      <span key={display} className="te-num-pop text-base font-bold text-gray-900">
        {display}
      </span>
    </div>
  )
}
