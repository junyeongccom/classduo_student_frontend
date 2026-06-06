/**
 * @file SolveCanvas.tsx
 * @description 풀이 화면 1920×1080 고정 비율 캔버스 — Figma 시안 1:1 재현용.
 *   container-type:size 로 캔버스를 query container 로 만들어, 내부 요소가 `cqw`(캔버스 폭 1%)
 *   단위로 비례 스케일된다. 데스크톱(시안) UI 가 화면 크기에 따라 전체가 균등 축소/확대(contain)되며
 *   비율이 보존된다. transform:scale 미사용 → 자식이 실제 캔버스 크기를 cqw 로 채우는 방식.
 * @module features/exam-prep-final/components/ui
 * @dependencies (none)
 *
 * 스케일 규약 (b2b figma-pixel):
 *   - 자식의 모든 치수는 `Ncqw` (= N/19.2 px @ 1920, 즉 1920 baseline vw 값과 동일 계수).
 *   - 화면이 16:9 보다 넓으면 세로(높이) 기준, 좁으면 가로(폭) 기준으로 contain → 한쪽에 여백.
 *   - 상한 cap 없음: 큰 모니터에서도 비율 유지하며 확대(꽉 채움).
 */
'use client'

import type { ReactNode } from 'react'

export const SOLVE_DESIGN_W = 1920
export const SOLVE_DESIGN_H = 1080

export function SolveCanvas({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden bg-[#F9F9FB] dark:bg-gray-950">
      <div
        className="relative shrink-0 overflow-hidden bg-white dark:bg-gray-950"
        style={{
          // contain-fit: 가로는 부모폭, 세로는 (부모높이×16/9) 중 작은 값 → 한쪽 축에 꽉 참.
          width: `min(100%, calc(100dvh * ${SOLVE_DESIGN_W} / ${SOLVE_DESIGN_H}))`,
          aspectRatio: `${SOLVE_DESIGN_W} / ${SOLVE_DESIGN_H}`,
          // 캔버스를 size container 로 → 자식의 cqw/cqh 가 이 캔버스 기준이 됨.
          containerType: 'size',
        }}
      >
        {children}
      </div>
    </div>
  )
}
