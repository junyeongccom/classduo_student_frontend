/**
 * @file ScaledCanvas.tsx
 * @description 고정 디자인 좌표계(designWidth×designHeight)를 가용 영역에 contain-스케일.
 *   transform: scale(min(가로비, 세로비, maxScale)) + absolute 중앙정렬(in-flow 부풀림 방지).
 *   자식은 design px 절대좌표로 배치 → 화면 크기와 무관하게 시안 비율 유지·한 화면 fit.
 * @module features/course-dashboard/components/ui
 * @dependencies (none)
 */

'use client'

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

interface ScaledCanvasProps {
  designWidth: number
  designHeight: number
  /** 디자인 크기 초과 확대 상한 (기본 1 = 원본보다 키우지 않음). */
  maxScale?: number
  children: ReactNode
}

export function ScaledCanvas({
  designWidth,
  designHeight,
  maxScale = 1,
  children,
}: ScaledCanvasProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const { width, height } = el.getBoundingClientRect()
      if (width === 0 || height === 0) return
      setScale(Math.min(width / designWidth, height / designHeight, maxScale))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [designWidth, designHeight, maxScale])

  return (
    <div ref={ref} className="relative h-full w-full overflow-hidden">
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: designWidth,
          height: designHeight,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: 'center',
          visibility: scale === 0 ? 'hidden' : 'visible',
        }}
      >
        {children}
      </div>
    </div>
  )
}
