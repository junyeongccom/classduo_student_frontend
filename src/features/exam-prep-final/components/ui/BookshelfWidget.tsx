/**
 * @file BookshelfWidget.tsx
 * @description 출석 streak 에 따라 색·책 개수 바뀌는 책장. 클릭 시 책들이 쉐이커처럼
 *   흔들리고 배열이 살짝 재배치됨 (이스터에그).
 *   상태:
 *   - 0일차 (streak 0): 빈 회색 책장
 *   - 1일차: 연보라 책장 + 책 2권
 *   - 2~4일차: 중보라 책장 + 책 3권
 *   - 5일차+: 진보라 책장 + 책 3권
 * @module features/exam-prep-final/components/ui
 * @dependencies public/upba/*.png, globals.css bookshelf-shake keyframe
 */

'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/shared/lib/utils'

interface BookshelfWidgetProps {
  /** 현재 출석 연속 일수 */
  currentStreak: number
  /** 외부 px 사이즈 — height 도 동일 (정사각) */
  size?: number
  className?: string
}

interface ShelfTier {
  shelf: string
  bookCount: number
}

function resolveTier(streak: number): ShelfTier {
  if (streak <= 0) return { shelf: '/upba/0일차 책장.png', bookCount: 0 }
  if (streak === 1) return { shelf: '/upba/1일차 책장.png', bookCount: 2 }
  if (streak <= 4) return { shelf: '/upba/2~4일차 책장.png', bookCount: 3 }
  return { shelf: '/upba/5일차 책장.png', bookCount: 3 }
}

const BOOK_SRCS = ['/upba/책1.png', '/upba/책2.png']

interface BookSlot {
  src: string
  /** 0~1 (셀 안 가로 비율) */
  left: number
  /** ±15deg 정도 회전 */
  rotate: number
  /** 0~1 (셀 안 세로 비율, 작을수록 위쪽으로) */
  bottom: number
}

/** count 만큼 책 슬롯을 균등 분할 + jitter 로 만들어줌 */
function generateBooks(count: number): BookSlot[] {
  if (count === 0) return []
  // 책장 안쪽 가용 영역을 가로 25~78% 로 잡고 등간격 분할
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
    }
  })
}

export function BookshelfWidget({ currentStreak, size = 64, className }: BookshelfWidgetProps) {
  const tier = resolveTier(currentStreak)
  const [books, setBooks] = useState<BookSlot[]>(() => generateBooks(tier.bookCount))
  const [shaking, setShaking] = useState(false)

  // streak 변경 시 책 개수 재생성
  useEffect(() => {
    setBooks(generateBooks(tier.bookCount))
  }, [tier.bookCount])

  const handleClick = () => {
    if (tier.bookCount === 0) return // 빈 책장은 흔들림 없음
    setBooks(generateBooks(tier.bookCount))
    setShaking(true)
    window.setTimeout(() => setShaking(false), 460)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={tier.bookCount === 0}
      aria-label={`출석 ${currentStreak}일차 책장`}
      className={cn(
        'relative shrink-0 transition-transform active:scale-95 disabled:cursor-default',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {/* 책장 배경 */}
      <img
        src={tier.shelf}
        alt=""
        aria-hidden
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full object-contain"
      />
      {/* 책들 — 책장 위에 랜덤 배치. shake 애니메이션은 .bookshelf-shake .bookshelf-book */}
      <div className={cn('pointer-events-none absolute inset-0', shaking && 'bookshelf-shake')}>
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
              transform: `translate(-${size * 0.11}px, 0) rotate(${book.rotate}deg)`,
              transformOrigin: '50% 100%',
            }}
          />
        ))}
      </div>
    </button>
  )
}
