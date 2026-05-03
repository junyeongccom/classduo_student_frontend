/**
 * @file Phase1MasterXp.tsx
 * @description 테스트 종료 1단계 풀화면 — 마스터 달성 경험치 집계 모션
 *   10문항 그리드(5x2) + 우측 카운터(0 XP). 풀이 전 숙련도(회색/노랑/보라) 에서
 *   풀이 후 숙련도까지 squish-pop 애니메이션을 무작위로 재생. 마스터 도달 이벤트 시
 *   문항 중앙에서 보라 물방울이 호를 그리며 카운터로 빨려들어가고 +10 가산.
 * @module features/exam-prep-final/components/result-overlay
 * @dependencies QuestionDelta, shuffleEventsPreservingPerQuestionOrder
 */

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { QuestionDelta, MasteryState } from './types'
import { shuffleEventsPreservingPerQuestionOrder, type XpEvent } from './utils'

interface Phase1Props {
  /** seq.asc 정렬된 문항 변화 — 길이 = 풀이 문항 수 (보통 10/15) */
  deltas: QuestionDelta[]
  /** 모션이 모두 끝난 뒤 호출 — 다음 phase 로 자동 진행 */
  onDone: () => void
}

const STATE_BG: Record<MasteryState, string> = {
  learning: '#ECECEE',
  skilled: '#FFC53D',
  master: '#6E5BE2',
}
const STATE_TEXT: Record<MasteryState, string> = {
  learning: '#1C1C1E',
  skilled: '#1C1C1E',
  master: '#FFFFFF',
}

/** 두 상태 사이의 squish-pop 이벤트 시퀀스 산출 */
function deriveEvents(d: QuestionDelta): XpEvent[] {
  if (d.before === d.after) return []
  // 상승 경로
  if (d.before === 'learning' && d.after === 'skilled') {
    return [{ qSeq: d.seq, type: 'yellow' }]
  }
  if (d.before === 'learning' && d.after === 'master') {
    return [{ qSeq: d.seq, type: 'yellow' }, { qSeq: d.seq, type: 'purple' }]
  }
  if (d.before === 'skilled' && d.after === 'master') {
    return [{ qSeq: d.seq, type: 'purple' }]
  }
  // 하락 경로 (마스터는 강등 없음 — 백엔드 정책. skilled→learning 만 가능)
  if (d.before === 'skilled' && d.after === 'learning') {
    return [{ qSeq: d.seq, type: 'skill-down', fallTo: 'learning' }]
  }
  // master 강등 (만일을 대비. 백엔드 정책상 발생 X)
  if (d.before === 'master' && d.after === 'skilled') {
    return [{ qSeq: d.seq, type: 'skill-down', fallTo: 'skilled' }]
  }
  if (d.before === 'master' && d.after === 'learning') {
    return [{ qSeq: d.seq, type: 'skill-down', fallTo: 'skilled' }, { qSeq: d.seq, type: 'skill-down', fallTo: 'learning' }]
  }
  return []
}

/** 이벤트 간 지터 — 사용자 요청: 한 문제 색상 전환 후 다음 문제 전환까지 2~3배 빠르게.
 *  기존 330~630ms → 110~210ms (3x). FINAL_DELAY 와 DROPLET_AFTER_PURPLE 도 단축. */
const STEP_MIN = 110
const STEP_MAX = 210
const FIRST_DELAY = 200
const DROPLET_AFTER_PURPLE = 220
const DROPLET_DUR = 1100
// 마지막 droplet 도달 후 다음 단계 진행 전 여유 — 너무 빨리 넘어가지 않게 +500ms 추가.
const FINAL_DELAY = 820

/** 풀이 전체 droplet 도착 좌표 — counter ref 기반으로 매번 측정 */
interface Droplet {
  id: number
  fromX: number
  fromY: number
  toX: number
  toY: number
  apexY: number
}

export function Phase1MasterXp({ deltas, onDone }: Phase1Props) {
  // ─── 큐 (random shuffle 1회) ───
  const [queue] = useState<XpEvent[]>(() => {
    const groups = new Map<number, XpEvent[]>()
    deltas.forEach((d) => {
      const evts = deriveEvents(d)
      if (evts.length > 0) groups.set(d.seq, evts)
    })
    return shuffleEventsPreservingPerQuestionOrder(groups)
  })

  // ─── 각 문항 현재 표시 상태 (애니메이션이 진행되며 갱신) ───
  const [perSeqState, setPerSeqState] = useState<Record<number, MasteryState>>(() => {
    const m: Record<number, MasteryState> = {}
    deltas.forEach((d) => {
      m[d.seq] = d.before
    })
    return m
  })

  /** 마지막 pop 적용 시각 — pop 클래스 toggling 용 */
  const [poppingSeq, setPoppingSeq] = useState<{ seq: number; pulse: number } | null>(null)
  const [fallingSeq, setFallingSeq] = useState<{ seq: number; pulse: number } | null>(null)

  // ─── 카운터 ───
  const [xpCount, setXpCount] = useState(0)
  const [counterPulse, setCounterPulse] = useState(0)

  // ─── droplets ───
  const [droplets, setDroplets] = useState<Droplet[]>([])
  const dropletIdRef = useRef(0)

  // ─── refs (위치 측정용) ───
  const stageRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef<Map<number, HTMLDivElement | null>>(new Map())
  const counterRef = useRef<HTMLSpanElement | null>(null)
  const doneRef = useRef(false)
  // 부모가 매 렌더마다 onDone 새 함수 만들어 넘기는 케이스 대비 — ref 로 안정화
  // (부모 컨테이너의 elapsedSec 1s 타이머로 인해 useEffect 가 매초 cleanup 되는 버그 방지)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  // ─── 시퀀스 재생 ───
  useEffect(() => {
    if (doneRef.current) return
    if (queue.length === 0) {
      // 변화 없는 풀이 — 빠르게 종료
      const t = setTimeout(() => onDoneRef.current(), 800)
      return () => clearTimeout(t)
    }

    const timeouts: ReturnType<typeof setTimeout>[] = []
    let cursor = FIRST_DELAY

    queue.forEach((evt, idx) => {
      timeouts.push(
        setTimeout(() => {
          // 1) 색 전환 (state 갱신)
          setPerSeqState((prev) => {
            const next = { ...prev }
            if (evt.type === 'yellow') next[evt.qSeq] = 'skilled'
            else if (evt.type === 'purple') next[evt.qSeq] = 'master'
            else if (evt.type === 'skill-down' && evt.fallTo) next[evt.qSeq] = evt.fallTo
            return next
          })
          // 2) pop 애니메이션 트리거
          if (evt.type === 'skill-down') {
            setFallingSeq({ seq: evt.qSeq, pulse: idx })
          } else {
            setPoppingSeq({ seq: evt.qSeq, pulse: idx })
          }
          // 3) 보라 이벤트면 droplet 발사 (DROPLET_AFTER_PURPLE 후)
          if (evt.type === 'purple') {
            timeouts.push(
              setTimeout(() => {
                const stage = stageRef.current
                const item = itemRefs.current.get(evt.qSeq)
                const counter = counterRef.current
                if (!stage || !item || !counter) return
                const fromRect = item.getBoundingClientRect()
                const toRect = counter.getBoundingClientRect()
                const fromX = fromRect.left + fromRect.width / 2
                const fromY = fromRect.top + fromRect.height / 2
                const toX = toRect.left + toRect.width / 2
                const toY = toRect.top + toRect.height / 2
                const apexY = Math.min(fromY, toY) - 110
                const id = dropletIdRef.current++
                setDroplets((prev) => [...prev, { id, fromX, fromY, toX, toY, apexY }])
                // 도착 시점에 카운터 +10
                timeouts.push(
                  setTimeout(() => {
                    setXpCount((v) => v + 10)
                    setCounterPulse((p) => p + 1)
                    setDroplets((prev) => prev.filter((d) => d.id !== id))
                  }, DROPLET_DUR - 80),
                )
              }, DROPLET_AFTER_PURPLE),
            )
          }
        }, cursor),
      )
      cursor += STEP_MIN + Math.floor(Math.random() * (STEP_MAX - STEP_MIN))
    })

    // 마지막 droplet 도착 + 여유시간 후 종료
    const totalDur = cursor + DROPLET_AFTER_PURPLE + DROPLET_DUR + FINAL_DELAY
    timeouts.push(
      setTimeout(() => {
        if (doneRef.current) return
        doneRef.current = true
        onDoneRef.current()
      }, totalDur),
    )

    return () => {
      timeouts.forEach((t) => clearTimeout(t))
    }
    // queue 만 deps — onDone 참조 변동으로 인한 cleanup 방지
  }, [queue])

  // ─── 렌더 데이터 ───
  const orderedSeqs = useMemo(() => deltas.map((d) => d.seq).sort((a, b) => a - b), [deltas])
  // 최대 10개만 표시 (handoff: 5x2)
  const gridSeqs = orderedSeqs.slice(0, 10)

  return (
    <div
      ref={stageRef}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-white py-12"
      style={{ fontFamily: 'Pretendard, sans-serif' }}
    >
      {/* 좌측: 문항 그리드 5x2 */}
      <div className="grid grid-cols-5 gap-4">
        {gridSeqs.map((seq) => {
          const state = perSeqState[seq] ?? 'learning'
          const isPopping = poppingSeq?.seq === seq
          const isFalling = fallingSeq?.seq === seq
          return (
            <div
              key={seq}
              ref={(el) => {
                itemRefs.current.set(seq, el)
              }}
              className={`xp-item flex h-14 w-14 items-center justify-center rounded-2xl text-base font-bold ${
                isPopping ? 'is-popping' : ''
              } ${isFalling ? 'is-falling' : ''}`}
              style={{
                backgroundColor: STATE_BG[state],
                color: STATE_TEXT[state],
              }}
              data-pulse={isPopping ? poppingSeq?.pulse : isFalling ? fallingSeq?.pulse : undefined}
              data-state={state}
            >
              {seq}
            </div>
          )
        })}
      </div>

      {/* 우측: 카운터 — 라벨 + N XP. 카운터 영역은 고정 너비 (w-[360px]) 로 자릿수 변동에도
          중앙 위치/그리드 좌표가 흔들리지 않게 한다 (사용자 요청 7번). */}
      <div className="ml-[140px] flex w-[360px] shrink-0 flex-col items-end gap-4">
        <span className="text-xl font-bold text-gray-900">마스터 달성 경험치</span>
        {/* counter-bump 애니메이션이 scale 1.22 로 살짝 커지면서 'P' 가 우측 잘리던 문제 →
            overflow-visible + pr 여유로 해결. */}
        <div className="flex h-20 w-full items-center justify-end pr-2 text-right">
          <span
            ref={counterRef}
            key={counterPulse}
            className="te-counter-bump tabular-nums text-6xl font-black leading-none text-gray-900"
          >
            {xpCount} XP
          </span>
        </div>
      </div>

      {/* 보라 물방울 (호 궤적) */}
      {droplets.map((d) => (
        <span
          key={d.id}
          className="xp-drop-x"
          style={{
            // @ts-expect-error CSS variable
            '--from-x': `${d.fromX}px`,
            '--to-x': `${d.toX}px`,
          }}
        >
          <span
            className="xp-drop-y"
            style={{
              // @ts-expect-error CSS variable
              '--from-y': `${d.fromY}px`,
              '--apex-y': `${d.apexY}px`,
              '--to-y': `${d.toY}px`,
            }}
          >
            <span className="xp-drop" />
          </span>
        </span>
      ))}
    </div>
  )
}
