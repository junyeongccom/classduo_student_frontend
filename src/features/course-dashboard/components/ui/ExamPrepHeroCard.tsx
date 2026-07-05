/**
 * @file ExamPrepHeroCard.tsx
 * @description 과목 대시보드 메인 카드 — "핵심 주제 학습". Figma(1031:3488) 매칭:
 *   연라벤더 그라데이션 표면 + 하단 양각(3D) + DNA(좌)·돋보기(우) 흐린 배경 데코 + 남/여 캐릭터 2인 + 제목.
 *   카드 폭 기준 cqw 비례 스케일(container-type: inline-size, aspect-ratio 663/479). 하단 양각/프레스 인터랙션은 유지.
 *   isLocked 시 콘텐츠 dim + 자물쇠 오버레이 + 호버 안내.
 * @module features/course-dashboard/components/ui
 * @dependencies public/topic_test/hero-{bg,male,female}.png, public/midtest/자물쇠.png, globals.css mid-* keyframes
 */

'use client'

import { useState } from 'react'

interface ExamPrepHeroCardProps {
  /** 카드 제목 (i18n: courseDashboard.modeExam.title = "핵심 주제 학습") */
  title: string
  /** 제목 위 부제 (i18n: courseDashboard.modeExam.heroSubtitle = "26개 주제 · 5~10분씩 학습") */
  subtitle?: string
  onClick: () => void
  ariaLabel?: string
}

// Figma 기준 좌표/치수는 카드 폭(663) 대비 cqw(=폭 1%). aspect-ratio 663/479 로 높이 동반 스케일.
export function ExamPrepHeroCard({
  title,
  subtitle,
  onClick,
  ariaLabel,
}: ExamPrepHeroCardProps) {
  // 아케이드 눌림 — 핵심테스트 버튼처럼 누르면 표면(+제목)이 아래로 내려가 하단 양각(#716fdc)을 덮음.
  const [pressed, setPressed] = useState(false)
  const press = () => setPressed(true)
  const release = () => setPressed(false)
  const faceTransform = pressed ? 'translateY(3.167cqw)' : undefined
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={press}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
      aria-label={ariaLabel ?? title}
      className="group relative mx-auto block w-full max-w-[663px]"
      style={{ containerType: 'inline-size', aspectRatio: '663 / 479' }}
    >
      {/* 양각 — 하단 3D 그림자 레이어 (#716fdc) */}
      <div
        className="pointer-events-none absolute inset-x-0"
        style={{ top: '3.167cqw', height: '69.08cqw', borderRadius: '6.033cqw', background: '#716fdc' }}
        aria-hidden
      />

      {/* 표면(연라벤더 그라데이션) + 데코(DNA/돋보기/캐릭터) — 라운드 클립 */}
      <div
        className="absolute inset-x-0 overflow-hidden"
        style={{
          top: 0,
          height: '69.08cqw',
          borderRadius: '6.033cqw',
          backgroundImage: 'linear-gradient(to bottom, #f0efff, #dbdafb)',
          transform: faceTransform,
          transition: 'transform 110ms ease-out',
        }}
      >
        {/* 배경 데코 — DNA(좌). figma 1031:3478: hero-bg 좌측부를 확대해 흐리게(opacity .5). 표면 overflow-hidden 으로 클립. */}
        <img
          src="/topic_test/hero-bg.png"
          alt=""
          aria-hidden
          draggable={false}
          className="pointer-events-none absolute"
          style={{ left: '-21.285cqw', top: '-8.368cqw', width: '209.08cqw', maxWidth: 'none', height: '151.3cqw', opacity: 0.5 }}
        />
        {/* 배경 데코 — 돋보기(우). figma 1031:3479: hero-bg 우측부를 확대해 흐리게(opacity .5). */}
        <img
          src="/topic_test/hero-bg.png"
          alt=""
          aria-hidden
          draggable={false}
          className="pointer-events-none absolute"
          style={{ left: '-73.53cqw', top: '-22.19cqw', width: '229.86cqw', maxWidth: 'none', height: '165.97cqw', opacity: 0.5 }}
        />
        {/* 여캐(우) — figma 1031:3480. 1800×1300 PNG 을 card(130.9,170) 기준 0.2316배(=62.913cqw). 제공 PNG엔 흰
            테두리 없어 CSS 다방향 drop-shadow 로 흰 스티커 외곽선 + 보라 그림자(figma 0 4 10 rgba(63,61,191,.5)). */}
        <img
          src="/topic_test/hero-female.png"
          alt=""
          aria-hidden
          draggable={false}
          className="pointer-events-none absolute"
          style={{
            left: '19.743cqw',
            top: '25.64cqw',
            width: '62.913cqw',
            filter:
              'drop-shadow(0.35cqw 0 0 #fff) drop-shadow(-0.35cqw 0 0 #fff) drop-shadow(0 0.35cqw 0 #fff) drop-shadow(0 -0.35cqw 0 #fff) drop-shadow(0.25cqw 0.25cqw 0 #fff) drop-shadow(-0.25cqw 0.25cqw 0 #fff) drop-shadow(0.25cqw -0.25cqw 0 #fff) drop-shadow(-0.25cqw -0.25cqw 0 #fff) drop-shadow(0 0.603cqw 1.508cqw rgba(63,61,191,0.5))',
          }}
        />
        {/* 남캐(좌) — figma 1031:3481 (여캐보다 위 레이어). card(99,170) 기준 동일 스케일(=62.867cqw). */}
        <img
          src="/topic_test/hero-male.png"
          alt=""
          aria-hidden
          draggable={false}
          className="pointer-events-none absolute"
          style={{
            left: '14.932cqw',
            top: '25.64cqw',
            width: '62.867cqw',
            filter:
              'drop-shadow(0.35cqw 0 0 #fff) drop-shadow(-0.35cqw 0 0 #fff) drop-shadow(0 0.35cqw 0 #fff) drop-shadow(0 -0.35cqw 0 #fff) drop-shadow(0.25cqw 0.25cqw 0 #fff) drop-shadow(-0.25cqw 0.25cqw 0 #fff) drop-shadow(0.25cqw -0.25cqw 0 #fff) drop-shadow(-0.25cqw -0.25cqw 0 #fff) drop-shadow(0 0.603cqw 1.508cqw rgba(63,61,191,0.5))',
          }}
        />
      </div>

      {/* 부제 + 제목 — figma 1031:3482 텍스트버튼(표면 상단 중앙). 부제 top 12.896cqw, 제목과 gap 10px(1.508cqw). */}
      <div
        className="pointer-events-none absolute inset-x-0 flex flex-col items-center"
        style={{ top: '12.896cqw', gap: '1.508cqw', transform: faceTransform, transition: 'transform 110ms ease-out' }}
      >
        {/* 부제 — figma 20px(=3.017cqw) Pretendard SemiBold #383698. 문구는 i18n(heroSubtitle) 유지. */}
        {subtitle && (
          <span
            className="text-center font-semibold break-keep"
            style={{
              maxWidth: '92cqw',
              fontSize: '3.017cqw',
              lineHeight: 1.2,
              color: '#383698',
              fontFamily: 'Pretendard, sans-serif',
            }}
          >
            {subtitle}
          </span>
        )}
        {/* 제목 — figma 70px(=10.558cqw) Pretendard Bold #383698 + 흰 외곽선(시안 반영, design_context 누락분)
            + 보라 그림자(figma text-shadow 0 4 4 #716fdc). 획을 fill '뒤'(paint-order)로 돌려 코어는 또렷하게. */}
        <span
          className="text-center font-bold break-keep"
          style={{
            maxWidth: '92cqw',
            fontSize: '10.558cqw',
            lineHeight: 1.2,
            color: '#383698',
            WebkitTextStroke: '0.15em #ffffff',
            paintOrder: 'stroke fill',
            textShadow: '0 0.603cqw 0.603cqw #716fdc',
            fontFamily: 'Pretendard, sans-serif',
          }}
        >
          {title}
        </span>
      </div>
    </button>
  )
}
