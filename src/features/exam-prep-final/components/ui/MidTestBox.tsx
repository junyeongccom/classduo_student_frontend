/**
 * @file MidTestBox.tsx
 * @description 중간 테스트 책 버튼 — 핵심 테스트 그리드 마지막 셀
 *   stage state machine (locked → unlocking → pages)
 *   - locked: 책 + 자물쇠 + 4-piece 체인 (사슬 4개 분리 PNG)
 *   - unlocking: 1.6s — 체인 fly-off, 자물쇠 wobble→낙하, 책 흔들림, sparkle×5
 *   - pages: 책만, hover/선택 시 표지 살짝 열림 + glow 비침
 *   - mastered: MASTER 도장
 *   클릭 시 책이 펼쳐지는 모션 없음 — 부모에서 선택 상태(isSelected)를 토글하면
 *   호버와 동일한 표지 들림 + glow 가 유지됨. 다시 클릭 → 닫힘.
 *   localStorage 플래그로 첫 진입 1회만 자동 잠금풀림 재생.
 * @module features/exam-prep-final/components/ui
 * @dependencies globals.css mid-* keyframes, public/midtest/*.png
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/shared/lib/utils'
import type { MidTest } from '../../types'

interface MidTestBoxProps {
  midTest: MidTest
  /** 첫 진입 unlocking 애니메이션 1회 재생 키용 (localStorage scope) */
  courseId: string
  /** 선택(눌림) 상태 — 부모가 핵심테스트 선택과 동일하게 토글 관리 */
  isSelected?: boolean
  onClick?: () => void
}

type Stage = 'locked' | 'unlocking' | 'pages'

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

/**
 * 잠금 해제 모션은 "잠겨있던 상태에서 풀린 시점" 을 잡아서 한 번 재생한다.
 *  방식: localStorage 에 직전에 본 unlocked 값을 저장 → 현재가 true 인데 이전이 false
 *  였으면 motion 재생. 즉 false→true 전환 검출.
 *  (구버전 'seen' 플래그는 한 번 재생 후 영원히 skip 되어, 마스터 후 잠금해제 이벤트
 *  를 못 잡는 문제. prev 추적 방식으로 교체.)
 */
const PREV_UNLOCKED_KEY = (courseId: string, setNumber: number) =>
  `aplus-mid-prev-unlocked-${courseId}-${setNumber}`

/** 구 키 정리 — 한 번 마이그레이션 */
const LEGACY_SEEN_KEY = (courseId: string, setNumber: number) =>
  `aplus-mid-unlock-seen-${courseId}-${setNumber}`

export function MidTestBox({ midTest, courseId, isSelected = false, onClick }: MidTestBoxProps) {
  const t = useTranslations()
  const assets = SET_ASSETS[midTest.setNumber]
  const isMastered = midTest.status === 'mastered'

  // 초기 stage — 마운트 후 useEffect 에서 결정
  const [stage, setStage] = useState<Stage>('locked')
  /** 잠금 해제 모션 재생 시 박스가 뷰포트 밖이면 자동 스크롤로 노출하기 위한 ref */
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  // 잠금 해제 모션 트리거 시 — 박스가 뷰포트에 온전히 안 들어오면 가운데로 자동 스크롤.
  useEffect(() => {
    if (stage !== 'unlocking') return
    const el = buttonRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const fullyVisible = rect.top >= 0 && rect.bottom <= window.innerHeight
    if (fullyVisible) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [stage])

  useEffect(() => {
    if (isMastered) {
      // 마스터된 경우 책 펼침 상태 + MASTER 도장
      setStage('pages')
      return
    }
    if (typeof window === 'undefined') return

    // 구 키 정리 (1회성 마이그레이션) — 새 prev 키 로직만 신뢰
    try {
      window.localStorage.removeItem(LEGACY_SEEN_KEY(courseId, midTest.setNumber))
    } catch {
      // 무시
    }

    const prevKey = PREV_UNLOCKED_KEY(courseId, midTest.setNumber)
    const prevUnlocked = window.localStorage.getItem(prevKey) === '1'

    if (!midTest.unlocked) {
      // 잠금 상태 — 표시 + prev='0' 기록 (다음 unlock 시 motion 재생용)
      setStage('locked')
      try {
        window.localStorage.setItem(prevKey, '0')
      } catch {
        // 무시
      }
      return
    }

    // 풀이 종료 직후 신호 (이슈 4) — CoreTestSolveContainer handleExit 가 저장한 hint 가 있으면
    // prev 값과 무관하게 unlocking 모션 한 번 재생. 신호는 동일 set 의 첫 MidTestBox 가 소비.
    let consumedUnlockHint = false
    try {
      const hintRaw = window.sessionStorage.getItem(`examPrep:unlockHint:${courseId}`)
      if (hintRaw) {
        consumedUnlockHint = true
        window.sessionStorage.removeItem(`examPrep:unlockHint:${courseId}`)
      }
    } catch {
      // 무시
    }

    // unlocked=true. prev=true 이고 hint 도 없으면 이미 모션 본 상태 → pages 로 직행.
    if (prevUnlocked && !consumedUnlockHint) {
      setStage('pages')
      return
    }

    // (false→true 전환) 또는 (hint consumed) → unlocking 모션 재생 + prev='1' 기록
    setStage('unlocking')
    const t = setTimeout(() => {
      setStage('pages')
      try {
        window.localStorage.setItem(prevKey, '1')
      } catch {
        // 무시
      }
    }, UNLOCK_MS)
    return () => clearTimeout(t)
  }, [midTest.unlocked, midTest.setNumber, isMastered, courseId])

  // pages 단계면 클릭 허용 (locked/unlocking 중에는 차단).
  // 마스터 후에도 다시풀기를 위해 선택 가능 — 핵심테스트와 동일 정책.
  const isClickable = stage === 'pages' && !!onClick

  const ariaLabel = (() => {
    const params = { setNumber: midTest.setNumber }
    if (stage === 'locked' || stage === 'unlocking') return t('examPrepFinal.midBoxAria.locked', params)
    if (isMastered) {
      return isSelected
        ? t('examPrepFinal.midBoxAria.masteredSelected', params)
        : t('examPrepFinal.midBoxAria.masteredAvailable', params)
    }
    return isSelected
      ? t('examPrepFinal.midBoxAria.selected', params)
      : t('examPrepFinal.midBoxAria.available', params)
  })()

  const handleClick = () => {
    if (!isClickable) return
    // 책 펼침 모션 없이 부모로 토글 신호만 전달 — 부모가 isSelected 를 토글해서
    // 호버와 동일한 표지 들림 + glow 가 유지되게 한다.
    onClick?.()
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
      ref={buttonRef}
      type="button"
      onClick={handleClick}
      disabled={!isClickable}
      data-stage={stage}
      data-selected={isSelected ? 'true' : 'false'}
      aria-label={ariaLabel}
      aria-pressed={isClickable ? isSelected : undefined}
      className={cn(
        'mid-scene group/midbook relative h-28 w-28 disabled:cursor-default md:h-44 md:w-44',
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
          }}
        />
      ))}

      {/* MASTER 도장 — 마스터 도달 시 cover 위 오버레이 */}
      {isMastered && (
        <img
          src={assets.masterStamp}
          alt="MASTER"
          aria-label="Master"
          title={t('examPrepFinal.masterReachedTitle')}
          draggable={false}
          className="pointer-events-none absolute left-1/2 top-1/2 z-[20] w-[110%] max-w-none -translate-x-1/2 -translate-y-1/2 select-none object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]"
        />
      )}
    </button>
    </>
  )
}
