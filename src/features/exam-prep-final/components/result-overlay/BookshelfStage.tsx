/**
 * @file BookshelfStage.tsx
 * @description Phase 2/3/4 좌측 — 진한 그레이 배경 패널 안 7-day mini calendar.
 *   각 셀이 "책장" 역할을 하고, 그날의 테스트 풀이 수만큼 흰 책(가로 막대바)이 쌓여있음.
 *   Phase 2 진입 시 위에서 책 한 권이 떨어져 오늘 셀로 들어가고, 도달 순간 오늘 셀의
 *   책 스택이 +1 (= calendarCounts[0]).
 * @module features/exam-prep-final/components/result-overlay
 * @dependencies StreakTier
 */

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { resolveStreakTier } from './utils'

interface BookshelfStageProps {
  /** 풀이 시작 시점의 streak (셀 색 결정) */
  preStreak: number
  /** 풀이 종료 시점의 streak (책 도달 후 셀 색) */
  postStreak: number
  /** 오늘 첫 학습이면 오늘 셀 색이 회색→tier 색으로 바뀜. false 면 색 유지. */
  isFirstTestToday: boolean
  /** 캘린더 셀별 풀이 수 (offset -3..+3 → count). offset=0 (오늘) 은 이번 attempt 증가 후 값. */
  calendarCounts: Record<number, number>
  /** 책 떨어짐 모션 자동 재생 여부 (Phase 2 진입 시 true) */
  autoPlay: boolean
  /** 책 도달 시점 신호 — Phase23 가 카운터 증가 트리거 */
  onShelfFilled?: () => void
  /** 책 페이드 아웃까지 끝난 시점 신호 — Phase23 가 다음 단계 결정 */
  onSequenceDone?: () => void
  /** Phase 3/4 에서 진입 시 이미 채워진 상태로 시작 */
  initialFilled?: boolean
}

/** today 가운데, 좌우 ±3 일자만 표시 */
function buildMiniCalendar(): { label: number; offset: number; isToday: boolean }[] {
  const today = new Date()
  const arr: { label: number; offset: number; isToday: boolean }[] = []
  for (let off = -3; off <= 3; off++) {
    const d = new Date(today)
    d.setDate(today.getDate() + off)
    arr.push({ label: d.getDate(), offset: off, isToday: off === 0 })
  }
  return arr
}

const FALL_DELAY = 380
const FALL_DUR = 1000
const REST_DELAY = 200
const REST_DUR = 600

/** 셀 안에서 책 한 권의 두께 / 사이 갭. 정사각형 셀 안에 책을 더 많이 쌓을 수 있게 작게. */
const BOOK_BAR_HEIGHT = 3
const BOOK_BAR_GAP = 1
/** 셀에 시각적으로 쌓을 수 있는 책 최대 개수. 이를 넘으면 떨어지는 모션만 보여주고 스택은 유지. */
const MAX_VISIBLE_BOOKS = 7

export function BookshelfStage({
  preStreak,
  postStreak,
  isFirstTestToday,
  calendarCounts,
  autoPlay,
  onShelfFilled,
  onSequenceDone,
  initialFilled = false,
}: BookshelfStageProps) {
  const cells = useMemo(() => buildMiniCalendar(), [])
  const postTier = resolveStreakTier(postStreak)

  /** 책장이 채워진 상태 (today 셀 색이 streak 색으로 변함). */
  const [isFilled, setIsFilled] = useState(initialFilled)
  /** today 셀에 표시할 책 개수 — 책 도달 전엔 calendarCounts[0]-1 (+1 은 떨어지는 책으로 시각화),
   *  도달 후엔 calendarCounts[0] 로 증가. initialFilled 면 처음부터 최종값. */
  const [todayBooks, setTodayBooks] = useState(() =>
    initialFilled ? (calendarCounts[0] ?? 0) : Math.max(0, (calendarCounts[0] ?? 0) - 1),
  )
  const [bookFalling, setBookFalling] = useState(false)
  const [bookResting, setBookResting] = useState(false)
  const doneRef = useRef(false)
  // 부모 재렌더로 인한 callback 참조 변동 방지
  const onShelfFilledRef = useRef(onShelfFilled)
  const onSequenceDoneRef = useRef(onSequenceDone)
  onShelfFilledRef.current = onShelfFilled
  onSequenceDoneRef.current = onSequenceDone

  useEffect(() => {
    if (!autoPlay || initialFilled) return
    if (doneRef.current) return

    const timeouts: ReturnType<typeof setTimeout>[] = []
    timeouts.push(setTimeout(() => setBookFalling(true), FALL_DELAY))
    timeouts.push(
      setTimeout(() => {
        if (isFirstTestToday) setIsFilled(true)
        // 책이 도착하는 순간 today 셀 책 스택 +1 (떨어지는 책이 스택의 일원이 됨)
        setTodayBooks(calendarCounts[0] ?? 0)
        onShelfFilledRef.current?.()
      }, FALL_DELAY + FALL_DUR),
    )
    timeouts.push(setTimeout(() => setBookResting(true), FALL_DELAY + FALL_DUR + REST_DELAY))
    timeouts.push(
      setTimeout(() => {
        if (doneRef.current) return
        doneRef.current = true
        onSequenceDoneRef.current?.()
      }, FALL_DELAY + FALL_DUR + REST_DELAY + REST_DUR),
    )
    return () => timeouts.forEach((t) => clearTimeout(t))
  }, [autoPlay, initialFilled, isFirstTestToday, calendarCounts])

  const cellFillColor = postTier.color

  /**
   * 셀 채움 규칙:
   *  - offset === 0 (오늘): isFilled 시 채움 (오늘 첫 학습일 때만)
   *  - offset < 0 (과거): postStreak 길이 안에 들어가면 채움
   *  - offset > 0 (미래): 절대 채우지 않음
   */
  const isWithinStreak = (offset: number, streak: number): boolean => {
    if (offset > 0) return false
    return Math.abs(offset) < streak
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <div className="relative flex gap-3">
        {cells.map((c) => {
          const filled = isFilled
            ? isWithinStreak(c.offset, postStreak)
            : isWithinStreak(c.offset, preStreak)
          // 셀별 책 개수: 오늘은 동적 (todayBooks), 나머지는 calendarCounts 그대로.
          // 시각 표시는 MAX_VISIBLE_BOOKS 까지만 — 그 이상은 떨어지는 모션만 보여주고 스택 유지.
          const rawBookCount = c.isToday ? todayBooks : calendarCounts[c.offset] ?? 0
          const bookCount = Math.min(rawBookCount, MAX_VISIBLE_BOOKS)
          // 책 색: 채워진 셀(짙은 배경)은 흰 책, 흰 셀은 짙은 보라 책
          const bookColor = filled ? '#FFFFFF' : '#6E5BE2'
          return (
            <div
              key={c.offset}
              className={`dar-cell relative flex h-14 w-14 flex-col items-start justify-between rounded-xl p-1.5 ${
                filled ? 'is-filled' : ''
              }`}
              style={{
                backgroundColor: filled ? cellFillColor : '#FFFFFF',
                color: '#1C1C1E',
                fontFamily: 'Pretendard, sans-serif',
              }}
            >
              {/* 날짜 라벨 — 좌상단 */}
              <span className="text-[11px] font-extrabold leading-none">{c.label}</span>
              {/* 책 스택 — 셀 하단에서 위로 쌓임. flex-col-reverse 로 아래→위. */}
              <div className="flex w-full flex-col-reverse items-center gap-[1px]">
                {Array.from({ length: bookCount }).map((_, i) => (
                  <span
                    key={i}
                    className="block w-[78%] rounded-[1px]"
                    style={{
                      height: `${BOOK_BAR_HEIGHT}px`,
                      backgroundColor: bookColor,
                    }}
                  />
                ))}
              </div>
            </div>
          )
        })}
        {/* 떨어지는 책 — 가로 바 형태로, 오늘 셀의 책 스택 가장 위 자리에 안착.
         *  cell 높이 56 (h-14), padding 6 (p-1.5) → bottom of stack = 50px (from cell top).
         *  N번째 책의 top 위치 = 50 - (N*BAR_H + (N-1)*GAP) = 50 - 4N + 1 = 51 - 4N.
         *  N = calendarCounts[0] (이번 attempt 후 today 풀이 수).
         *  날짜 라벨 영역(상단 ~14px) 보호 위해 최저 16px clamp. */}
        <div
          className={`dar-falling-book ${bookFalling && !bookResting ? 'is-falling' : ''} ${
            bookResting ? 'is-resting' : ''
          }`}
          style={{
            width: '32px',
            height: `${BOOK_BAR_HEIGHT}px`,
            borderRadius: '1px',
            backgroundColor: '#FFFFFF',
            // 책이 7권 초과시에도 가장 윗 위치(=7번째 자리) 위에서 페이드 — 셀 위로 튀지 않게 clamp.
            // @ts-expect-error CSS variable
            '--book-rest-y': `${Math.max(
              16,
              51 -
                Math.min(calendarCounts[0] ?? 1, MAX_VISIBLE_BOOKS) *
                  (BOOK_BAR_HEIGHT + BOOK_BAR_GAP),
            )}px`,
          }}
        />
      </div>
    </div>
  )
}
