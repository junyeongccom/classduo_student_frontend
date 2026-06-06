/**
 * @file ContentScaledCanvas.tsx
 * @description 풀이 본문(문제+선지) 전용 비례 캔버스 — 사이드바/헤더는 px 고정이고
 *   본문 영역만 1620×1080(=1920-사이드바300) 좌표계로 contain 스케일된다.
 *   container-type:size 로 자식의 cqw 가 이 캔버스 폭(1620 기준) 1% 가 된다.
 *   (figma-pixel 기본 가정: 사이드바/헤더 고정, 본문만 비례)
 * @module features/exam-prep-final/components/ui
 * @dependencies (none)
 */
'use client'

import type { ReactNode } from 'react'

/** 본문 디자인 좌표계 — 폭은 전체 1920 에서 사이드바(300) 를 뺀 1620,
 *  높이는 전체 1080 에서 헤더(70) 를 뺀 1010 (figma content 프레임 y=70~1080). */
export const CONTENT_DESIGN_W = 1620
export const CONTENT_DESIGN_H = 1010

export function ContentScaledCanvas({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex h-full w-full items-center justify-center overflow-hidden"
      // 본문 프레임은 높이기준 풀사이즈 고정(축소 안 함) + 가운데정렬 + overflow:hidden.
      // 영역(우측 패널/좁은 창)보다 넓어지면 프레임 양끝(=좌우 여백 padding)만 잘려나가고
      // 본문(프레임 내 거의 중앙)은 크기 유지한 채 좁아진 영역 중앙으로 왼쪽 이동.
      // → 가로 스크롤 없이 "문제영역 크기 유지 + 좌우 여백만 감소 + 왼쪽 이동".
      style={{ containerType: 'size' }}
    >
      <div
        className="relative flex shrink-0 overflow-hidden"
        style={{
          // 폭 = 높이 비례(고정). cqw 캘리브레이션 유지 → 본문 크기 불변.
          width: `calc(100cqh * ${CONTENT_DESIGN_W} / ${CONTENT_DESIGN_H})`,
          aspectRatio: `${CONTENT_DESIGN_W} / ${CONTENT_DESIGN_H}`,
          containerType: 'size',
        }}
      >
        {children}
      </div>
    </div>
  )
}
