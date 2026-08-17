/**
 * @file useCardDrag.ts
 * @description 카드 드래그 앤 드롭 (마우스·터치 공용) — Pointer Events 기반
 * @module features/review/games/word-solitaire
 * @dependencies react
 */
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 이 거리(px)를 넘겨야 드래그로 친다. 그 전에 손을 떼면 '탭'이다 —
 * 손가락은 가만히 눌러도 1~2px 씩 흔들리므로 0 으로 두면 모든 탭이 드래그가 된다.
 */
const DRAG_THRESHOLD = 6

export interface DragState<T> {
  /** 집은 카드의 식별 정보 */
  payload: T
  /** 화면 좌표 (고스트 카드를 그릴 위치) */
  x: number
  y: number
  /** 카드 안에서 잡은 지점의 오프셋 — 커서와 카드의 상대 위치를 유지한다 */
  offsetX: number
  offsetY: number
  /** 임계값을 넘겨 실제 드래그로 전환됐는가 */
  active: boolean
}

export interface UseCardDragOptions<T> {
  /** 드롭 지점 아래의 목적지 키를 찾는다 (`data-drop-key` 속성으로 표시된 요소) */
  onDrop: (payload: T, dropKey: string | null) => void
  /** 임계값 미만으로 움직이고 손을 뗐을 때 — 탭으로 처리 */
  onTap: (payload: T) => void
}

/**
 * 카드에 `onPointerDown={start(payload)}` 를 걸면 드래그가 시작된다.
 *
 * 브라우저 기본 동작(스크롤·텍스트 선택·이미지 드래그)은 카드 쪽 CSS `touch-action: none` 과
 * 여기의 preventDefault 로 막는다. 모바일 WebView 에서 판이 세로 스크롤되는 것과 충돌하지 않도록
 * **임계값을 넘기 전에는 기본 동작을 살려둔다**.
 */
export function useCardDrag<T>({ onDrop, onTap }: UseCardDragOptions<T>) {
  const [drag, setDrag] = useState<DragState<T> | null>(null)
  const dragRef = useRef<DragState<T> | null>(null)
  const originRef = useRef<{ x: number; y: number } | null>(null)

  const set = useCallback((next: DragState<T> | null) => {
    dragRef.current = next
    setDrag(next)
  }, [])

  const start = useCallback(
    (payload: T) => (event: React.PointerEvent<HTMLElement>) => {
      // 주 버튼(왼쪽 클릭)·터치만
      if (event.button !== 0) return
      const rect = event.currentTarget.getBoundingClientRect()
      originRef.current = { x: event.clientX, y: event.clientY }
      set({
        payload,
        x: event.clientX,
        y: event.clientY,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
        active: false,
      })
    },
    [set],
  )

  useEffect(() => {
    if (!drag) return

    const handleMove = (event: PointerEvent) => {
      const current = dragRef.current
      const origin = originRef.current
      if (!current || !origin) return

      const dx = event.clientX - origin.x
      const dy = event.clientY - origin.y
      const passed = current.active || Math.hypot(dx, dy) > DRAG_THRESHOLD
      // 드래그로 확정된 뒤에만 스크롤을 막는다
      if (passed && event.cancelable) event.preventDefault()
      set({ ...current, x: event.clientX, y: event.clientY, active: passed })
    }

    const handleUp = (event: PointerEvent) => {
      const current = dragRef.current
      set(null)
      originRef.current = null
      if (!current) return

      if (!current.active) {
        onTap(current.payload)
        return
      }
      // 고스트 카드가 좌표를 가리므로 잠시 숨기고 그 아래 요소를 찾는다
      const under = document.elementFromPoint(event.clientX, event.clientY)
      const dropTarget = under?.closest('[data-drop-key]') as HTMLElement | null
      onDrop(current.payload, dropTarget?.dataset.dropKey ?? null)
    }

    const handleCancel = () => {
      set(null)
      originRef.current = null
    }

    window.addEventListener('pointermove', handleMove, { passive: false })
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleCancel)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleCancel)
    }
  }, [drag, onDrop, onTap, set])

  return { drag, start, isDragging: Boolean(drag?.active) }
}
