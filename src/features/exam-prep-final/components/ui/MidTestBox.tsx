/**
 * @file MidTestBox.tsx
 * @description 중간 테스트 책 버튼 — 핵심 테스트 그리드 마지막 셀
 *   stage state machine (locked → unlocking → pages → opening → navigate)
 *   - locked: 책 + 자물쇠 + 4-piece 체인 (사슬 4개 분리 PNG)
 *   - unlocking: 1.6s — 체인 fly-off, 자물쇠 wobble→낙하, 책 흔들림, sparkle×5
 *   - pages: 책만, hover 시 표지 살짝 열림 + glow 비침
 *   - opening: 1.4s — 표지 활짝 열림(rotateY -112°), glow, sparkle×5 → 라우팅
 *   - mastered: MASTER 도장
 *   localStorage 플래그로 첫 진입 1회만 자동 잠금풀림 재생.
 * @module features/exam-prep-final/components/ui
 * @dependencies globals.css mid-* keyframes, public/midtest/*.png
 */

'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/shared/lib/utils'
import type { MidTest } from '../../types'

interface MidTestBoxProps {
  midTest: MidTest
  /** 첫 진입 unlocking 애니메이션 1회 재생 키용 (localStorage scope) */
  courseId: string
  onClick?: () => void
}

type Stage = 'locked' | 'unlocking' | 'pages' | 'opening'

/** 세트별 PNG 자산 매핑 (public/midtest/) */
const SET_ASSETS: Record<
  1 | 2 | 3,
  { open: string; cover: string; lock: string; masterStamp: string }
> = {
  1: {
    open: '/midtest/책-5.png',
    cover: '/midtest/표지-1.png',
    lock: '/midtest/자물쇠.png',
    masterStamp: '/master.png',
  },
  2: {
    open: '/midtest/책-4.png',
    cover: '/midtest/표지.png',
    lock: '/midtest/자물쇠-1.png',
    masterStamp: '/master-set3.png',
  },
  3: {
    open: '/midtest/책-3.png',
    cover: '/midtest/표지-2.png',
    lock: '/midtest/자물쇠.png',
    masterStamp: '/master.png',
  },
}

/** 4-piece chain PNG 매핑 — 위/아래 swap (사용자 피드백) */
const CHAINS = {
  tl: '/midtest/왼쪽사슬.png',
  tr: '/midtest/우측 사슬.png',
  bl: '/midtest/왼쪽사슬-1.png',
  br: '/midtest/우측사슬-2.png',
}

const UNLOCK_MS = 1600
const OPEN_MS = 1400

const storageKey = (courseId: string, setNumber: number) =>
  `aplus-mid-unlock-seen-${courseId}-${setNumber}`

export function MidTestBox({ midTest, courseId, onClick }: MidTestBoxProps) {
  const assets = SET_ASSETS[midTest.setNumber]
  const isMastered = midTest.status === 'mastered'

  // 초기 stage — 마운트 후 useEffect 에서 결정
  const [stage, setStage] = useState<Stage>('locked')

  useEffect(() => {
    if (isMastered) {
      // 마스터된 경우 책 펼침 상태 + MASTER 도장
      setStage('pages')
      return
    }
    if (!midTest.unlocked) {
      setStage('locked')
      return
    }
    // unlocked + 미마스터 — localStorage 확인해서 첫 진입이면 unlocking 재생
    if (typeof window === 'undefined') return
    const seen = window.localStorage.getItem(storageKey(courseId, midTest.setNumber))
    if (seen) {
      setStage('pages')
      return
    }
    setStage('unlocking')
    const t = setTimeout(() => {
      setStage('pages')
      try {
        window.localStorage.setItem(storageKey(courseId, midTest.setNumber), '1')
      } catch {
        // 사파리 시크릿 등 — 실패해도 무시
      }
    }, UNLOCK_MS)
    return () => clearTimeout(t)
  }, [midTest.unlocked, midTest.setNumber, isMastered, courseId])

  // pages 단계에서만 클릭 허용 (locked/unlocking/opening 중에는 차단).
  const isClickable = stage === 'pages' && !!onClick && !isMastered

  const ariaLabel = (() => {
    if (isMastered) return `Set ${midTest.setNumber} 중간 테스트 — 마스터 완료`
    if (stage === 'locked' || stage === 'unlocking') return `Set ${midTest.setNumber} 중간 테스트 — 잠김`
    if (stage === 'opening') return `Set ${midTest.setNumber} 중간 테스트 — 펼치는 중`
    return `Set ${midTest.setNumber} 중간 테스트 — 탭하면 펼쳐져요`
  })()

  const handleClick = () => {
    if (!isClickable) return
    // pages → opening → 라우팅
    setStage('opening')
    setTimeout(() => {
      onClick?.()
    }, OPEN_MS)
  }

  return (
    <>
      {/* 잠금해제 모션 중에는 다른 영역을 dim 처리해서 시선을 mid-test 박스로 모음.
       *  fixed 풀스크린 backdrop + pointer-events 로 다른 클릭 차단.
       *  본 box 는 z-[60] 으로 backdrop(z-[50]) 위로 끌어올려 부각. */}
      {stage === 'unlocking' && (
        <div
          className="fixed inset-0 z-[50] bg-black/60 transition-opacity duration-300 motion-safe:animate-[te-fade-up_240ms_ease-out]"
          aria-hidden
        />
      )}
    <button
      type="button"
      onClick={handleClick}
      disabled={!isClickable}
      data-stage={stage}
      aria-label={ariaLabel}
      className={cn(
        'mid-scene group/midbook relative h-44 w-44 disabled:cursor-default',
        isClickable && 'cursor-pointer',
        // 잠금해제 중: backdrop 위로 끌어올림 + 살짝 확대 → 포커스 부각
        stage === 'unlocking' &&
          'z-[60] scale-110 transition-transform duration-500 ease-out',
      )}
    >
      {/* 책 컨테이너 — book-open + glow + book-cover 3-layer */}
      <div className="mid-book absolute inset-0">
        {/* book-open (대지) — 항상 뒷쪽, cover 가 열리면 보임 */}
        <img
          src={assets.open}
          alt=""
          aria-hidden
          draggable={false}
          className="pointer-events-none absolute inset-0 z-[1] h-full w-full object-contain"
        />
        {/* glow — book-open과 cover 사이 */}
        <span
          className="mid-glow pointer-events-none absolute inset-[12%] z-[2] rounded-2xl opacity-0"
          aria-hidden
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(255,255,255,0.95) 0%, rgba(255,247,210,0.7) 35%, rgba(255,235,150,0.35) 60%, rgba(255,235,150,0) 100%)',
            filter: 'blur(6px)',
          }}
        />
        {/* book-cover (표지) — pages stage 에선 기본 살짝 들린 상태,
            hover 시 더 들리며 흰 페이지 노출 */}
        <img
          src={assets.cover}
          alt=""
          aria-hidden
          draggable={false}
          className="mid-cover pointer-events-none absolute z-[3]"
          style={{
            top: '0%',
            left: '4%',
            right: '8%',
            bottom: '32%',
          }}
        />
      </div>

      {/* 4-piece 체인 — locked / unlocking 일 때 보임. 핸드오프 spec 좌표 비례 적용 */}
      {/* 아래 사슬 (z-4) — 자물쇠보다 뒤. 책 하단 방향에서 자물쇠 향함 */}
      <img
        src={CHAINS.bl}
        alt=""
        aria-hidden
        draggable={false}
        className="mid-chain mid-chain-bl pointer-events-none absolute left-0 top-[55%] z-[4] w-[42%] object-contain"
      />
      <img
        src={CHAINS.br}
        alt=""
        aria-hidden
        draggable={false}
        className="mid-chain mid-chain-br pointer-events-none absolute right-0 top-[55%] z-[4] w-[42%] object-contain"
      />
      {/* 자물쇠 (z-5) — wrapper 가 위치를 잡고 inner img 만 애니메이션 */}
      <div className="pointer-events-none absolute left-1/2 top-[28%] z-[5] w-[42%] -translate-x-1/2">
        <img
          src={assets.lock}
          alt=""
          aria-hidden
          draggable={false}
          className="mid-lock block w-full object-contain"
        />
      </div>
      {/* 위 사슬 (z-7) — 자물쇠 shackle 앞으로 가로지름 */}
      <img
        src={CHAINS.tl}
        alt=""
        aria-hidden
        draggable={false}
        className="mid-chain mid-chain-tl pointer-events-none absolute left-0 top-[6%] z-[7] w-[44%] object-contain"
      />
      <img
        src={CHAINS.tr}
        alt=""
        aria-hidden
        draggable={false}
        className="mid-chain mid-chain-tr pointer-events-none absolute right-0 top-[6%] z-[7] w-[44%] object-contain"
      />

      {/* sparkle ×5 — unlocking / opening 단계에서만 애니메이션 */}
      {[
        { key: 1, top: '15%', left: '20%' },
        { key: 2, top: '20%', right: '15%' },
        { key: 3, top: '50%', left: '8%' },
        { key: 4, bottom: '25%', right: '20%' },
        { key: 5, bottom: '15%', left: '40%' },
      ].map((p) => (
        <span
          key={p.key}
          className={`mid-sparkle mid-sparkle-${p.key} pointer-events-none absolute z-[8] block h-3 w-3 rounded-full opacity-0`}
          aria-hidden
          style={{
            ...p,
            background:
              'radial-gradient(circle, #FFE89A 0%, #FFD86A 40%, rgba(255,232,154,0) 80%)',
            boxShadow: '0 0 8px 2px rgba(255,232,154,0.7)',
          }}
        />
      ))}

      {/* MASTER 도장 — 마스터 도달 시 cover 위 오버레이 */}
      {isMastered && (
        <img
          src={assets.masterStamp}
          alt="MASTER"
          aria-label="Master"
          title="Master 도달"
          draggable={false}
          className="pointer-events-none absolute left-1/2 top-1/2 z-[9] w-[110%] max-w-none -translate-x-1/2 -translate-y-1/2 select-none object-contain"
        />
      )}
    </button>
    </>
  )
}
