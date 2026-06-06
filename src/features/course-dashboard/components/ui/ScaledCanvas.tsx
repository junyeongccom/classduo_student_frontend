/**
 * @file ScaledCanvas.tsx
 * @description 고정 디자인 좌표계(designWidth×designHeight)를 가용 영역에 스케일.
 *   - fit="contain": min(가로비,세로비) → 잘림/스크롤 없이 한 화면 fit(넓은 창에선 좌우 여백).
 *   - fit="width": 가로비 기준 → 메인 폭을 꽉 채움(여백 최소). 콘텐츠가 더 높으면 세로 스크롤.
 *   transform: scale(origin top-left) + 스케일 크기만큼의 측정 래퍼로 부모가 정확히 스크롤되게 함
 *   (transform 은 레이아웃 박스를 안 줄이므로 래퍼로 보정 — figma-pixel §2).
 *   자식은 design px 절대좌표로 배치 → 화면 크기와 무관하게 시안 비율 유지.
 * @module features/course-dashboard/components/ui
 * @dependencies (none)
 */

'use client'

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

interface ScaledCanvasProps {
  designWidth: number
  designHeight: number
  /** 'contain'=한 화면 fit(여백 가능) | 'width'=가로 채움(세로 스크롤 가능) */
  fit?: 'contain' | 'width'
  /** 디자인 크기 초과 확대 상한 (기본 1 = 원본보다 키우지 않음). */
  maxScale?: number
  children: ReactNode
}

export function ScaledCanvas({
  designWidth,
  designHeight,
  fit = 'contain',
  maxScale = 1,
  children,
}: ScaledCanvasProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (w === 0 || h === 0) return
      const s =
        fit === 'width'
          ? Math.min(w / designWidth, maxScale)
          : Math.min(w / designWidth, h / designHeight, maxScale)
      setScale(s)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [designWidth, designHeight, fit, maxScale])

  const scaledW = designWidth * scale
  const scaledH = designHeight * scale

  return (
    <div
      ref={ref}
      className={
        fit === 'width'
          ? 'h-full w-full overflow-x-hidden overflow-y-auto'
          : 'flex h-full w-full items-center justify-center overflow-hidden'
      }
      style={fit === 'width' ? { scrollbarGutter: 'stable' } : undefined}
    >
      {/* 측정 래퍼 — 스케일된 실제 크기를 차지해 부모 스크롤/중앙정렬이 정확해짐 */}
      <div
        className="mx-auto shrink-0"
        style={{
          width: scaledW || '100%',
          height: scaledH || '100%',
          visibility: scale === 0 ? 'hidden' : 'visible',
        }}
      >
        <div
          style={{
            width: designWidth,
            height: designHeight,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
