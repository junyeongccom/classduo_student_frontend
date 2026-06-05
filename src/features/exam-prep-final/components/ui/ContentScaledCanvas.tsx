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
    <div className="flex h-full w-full items-center justify-center overflow-hidden">
      <div
        className="relative flex shrink-0 overflow-hidden"
        style={{
          // 본문 영역 안에서 1620:1080 비율 박스를 contain (높이 우선, 넘치면 maxWidth 로 가로 맞춤).
          height: '100%',
          aspectRatio: `${CONTENT_DESIGN_W} / ${CONTENT_DESIGN_H}`,
          maxWidth: '100%',
          containerType: 'size',
        }}
      >
        {children}
      </div>
    </div>
  )
}
