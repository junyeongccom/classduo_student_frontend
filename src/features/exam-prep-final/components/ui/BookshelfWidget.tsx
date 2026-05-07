/**
 * @file BookshelfWidget.tsx
 * @description 상단바 책장 위젯. 책장 BG = streak tier 색, 책 권수 = 오늘 풀이 수 (cap 5).
 *   클릭 시 책들이 위로 솟구쳐 회전·이동하며 떠다니다 안착하는 부드러운 비행 모션.
 * @module features/exam-prep-final/components/ui
 * @dependencies public/upba/*.png, globals.css bookshelf-fly keyframe, fetchCourseAttemptCounts
 */

'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/shared/lib/utils'
import { fetchCourseAttemptCounts } from '../../services/examPrepService'
import { getKstTodayIso } from '../result-overlay/utils'

interface BookshelfWidgetProps {
  /** 현재 출석 연속 일수 — 책장 배경 색만 결정. 책 권수에는 영향 X. */
  currentStreak: number
  /** 과목 id — 일자별 풀이수를 과목 단위로 조회 (전역 누적이 아니다). */
  courseId: string | null | undefined
  /** 외부 px 사이즈 — height 도 동일 (정사각) */
  size?: number
  className?: string
}

/** streak 별 책장 배경 — 책 권수는 오늘 풀이 수 기반으로 별도 계산 */
function resolveShelfBg(streak: number): string {
  if (streak <= 0) return '/upba/0일차 책장.png'
  if (streak === 1) return '/upba/1일차 책장.png'
  if (streak <= 4) return '/upba/2~4일차 책장.png'
  return '/upba/5일차 책장.png'
}

const BOOK_SRCS = ['/upba/책1.png', '/upba/책2.png']
const MAX_BOOKS = 5

interface BookSlot {
  src: string
  /** 0~1 (셀 안 가로 비율) */
  left: number
  /** ±15deg 정도 회전 */
  rotate: number
  /** 0~1 (셀 안 세로 비율, 작을수록 위쪽으로) */
  bottom: number
  /** 클릭 시 비행 모션 — 횡 변위 px (±) */
  flyDx: number
  /** 클릭 시 비행 모션 — 종 변위 px (음수=위로) */
  flyDy: number
  /** 클릭 시 회전 spin deg */
  flySpin: number
  /** 비행 시작 지연 ms (책마다 시차) */
  flyDelay: number
  /** 비행 한 사이클 duration ms (책마다 다름) */
  flyDur: number
}

/** count 만큼 책 슬롯을 균등 분할 + jitter 로 만들어줌. 비행 모션용 랜덤 궤적 포함.
 *  flyDx/Dy 는 책장 안쪽에서 자연스럽게 들썩이는 폭으로만 잡고, 시각적 클립은
 *  부모 button 의 overflow-hidden 이 담당. flyDelay/Dur 는 책마다 무작위 부여 →
 *  같은 시점에 다 같이 떨어지지 않고 시차 두고 흩어짐. */
function generateBooks(count: number): BookSlot[] {
  if (count === 0) return []
  // 책장 안쪽 가용 영역을 가로 22~78% 로 잡고 등간격 분할
  const start = 0.22
  const end = 0.78
  const span = end - start
  const slotWidth = count > 1 ? span / (count - 1) : 0
  return Array.from({ length: count }).map((_, i) => {
    const baseLeft = count === 1 ? 0.5 : start + slotWidth * i
    const jitter = (Math.random() - 0.5) * 0.06 // ±3%
    return {
      src: BOOK_SRCS[Math.floor(Math.random() * BOOK_SRCS.length)],
      left: baseLeft + jitter,
      rotate: (Math.random() - 0.5) * 24, // ±12deg
      bottom: 0.18 + (Math.random() - 0.5) * 0.04, // 책장 바닥 근처
      flyDx: (Math.random() - 0.5) * 24, // ±12px 횡 드리프트 (책장 안쪽)
      flyDy: -8 - Math.random() * 14, // -8 ~ -22px (위로, 책장 천장 안쪽)
      // 360° 의 정수배 (1 또는 2 회전) — 종료 시 base 회전과 시각적으로 일치 → 클래스 제거
      // 시 스냅 없음. 부호로 시계/반시계 다양화.
      flySpin: (Math.random() < 0.5 ? -1 : 1) * (Math.random() < 0.5 ? 360 : 720),
      flyDelay: Math.random() * 60, // 0 ~ 60ms — 거의 동시에 움직이며 시차는 미세하게만
      flyDur: 580 + Math.random() * 180, // 580 ~ 760ms — 빠르게 휙
    }
  })
}

/** flying state 를 false 로 되돌리는 안전 timeout — 가장 늦게 끝나는 책의 (delay + dur) 보다 길게. */
const FLY_RESET_MS = 900

export function BookshelfWidget({ currentStreak, courseId, size = 64, className }: BookshelfWidgetProps) {
  const shelfBg = resolveShelfBg(currentStreak)

  // 오늘 풀이 수 — 백엔드 attempt-counts API (course_id 필터). localStorage 미사용.
  const [todayCount, setTodayCount] = useState<number>(0)

  useEffect(() => {
    if (!courseId) {
      setTodayCount(0)
      return
    }
    let cancelled = false

    const refresh = async () => {
      const today = getKstTodayIso()
      const { data } = await fetchCourseAttemptCounts(courseId, today, today)
      if (cancelled) return
      setTodayCount(data?.counts?.[today] ?? 0)
    }

    void refresh()
    // 풀이 직후 다른 컴포넌트가 발화하는 'exam-prep-rewards-refresh' 이벤트로 즉시 재조회.
    const handler = () => { void refresh() }
    window.addEventListener('exam-prep-rewards-refresh', handler)
    return () => {
      cancelled = true
      window.removeEventListener('exam-prep-rewards-refresh', handler)
    }
  }, [courseId])

  const visibleCount = Math.min(MAX_BOOKS, todayCount)
  const [books, setBooks] = useState<BookSlot[]>(() => generateBooks(visibleCount))
  const [flying, setFlying] = useState(false)

  // todayCount 변동 시 책 재배치
  useEffect(() => {
    setBooks(generateBooks(visibleCount))
  }, [visibleCount])

  const handleClick = () => {
    if (visibleCount === 0) return
    // 새 비행 궤적 + 새 안착 위치 — 매 클릭 다른 모양
    setBooks(generateBooks(visibleCount))
    setFlying(true)
    window.setTimeout(() => setFlying(false), FLY_RESET_MS)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={visibleCount === 0}
      aria-label={`오늘 ${todayCount}권 / 출석 ${currentStreak}일차 책장`}
      className={cn(
        'relative shrink-0 overflow-hidden transition-transform active:scale-95 disabled:cursor-default',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {/* 책장 배경 — streak tier 별 색 */}
      <img
        src={shelfBg}
        alt=""
        aria-hidden
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full object-contain"
      />
      {/* 책들 — 무작위 위치 + 클릭 시 비행 모션 */}
      <div className={cn('pointer-events-none absolute inset-0', flying && 'bookshelf-fly')}>
        {books.map((book, i) => (
          <img
            key={`${book.src}-${i}-${book.left.toFixed(3)}`}
            src={book.src}
            alt=""
            aria-hidden
            draggable={false}
            className="bookshelf-book absolute"
            style={{
              left: `${book.left * 100}%`,
              bottom: `${book.bottom * 100}%`,
              width: `${size * 0.22}px`,
              height: `${size * 0.45}px`,
              ['--book-rot' as string]: `${book.rotate}deg`,
              ['--book-x' as string]: `-${size * 0.11}px`,
              ['--fly-dx' as string]: `${book.flyDx}px`,
              ['--fly-dy' as string]: `${book.flyDy}px`,
              ['--fly-spin' as string]: `${book.flySpin}deg`,
              ['--fly-delay' as string]: `${book.flyDelay}ms`,
              ['--fly-dur' as string]: `${book.flyDur}ms`,
              transform: `translate(-${size * 0.11}px, 0) rotate(${book.rotate}deg)`,
              transformOrigin: '50% 50%',
            }}
          />
        ))}
      </div>
    </button>
  )
}
