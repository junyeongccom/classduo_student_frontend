/**
 * @file ExamPrepHeroCard.tsx
 * @description 과목 대시보드 메인 카드 — "핵심 주제 학습". Figma(991:3637) 매칭:
 *   연라벤더 그라데이션 표면 + 하단 양각(3D) + 좌상단 DNA / 우상단 돋보기 / 캐릭터 + 제목.
 *   카드 폭 기준 cqw 비례 스케일(container-type: inline-size, aspect-ratio 663/479).
 *   isLocked 시 콘텐츠 dim + 자물쇠 오버레이 + 호버 안내.
 * @module features/course-dashboard/components/ui
 * @dependencies public/topic_test/*.png, public/midtest/자물쇠.png, globals.css mid-* keyframes
 */

'use client'

interface ExamPrepHeroCardProps {
  /** 카드 제목 (i18n: courseDashboard.modeExam.title = "핵심 주제 학습") */
  title: string
  onClick: () => void
  ariaLabel?: string
  /** 잠금 상태 — 자물쇠 오버레이 + 클릭 비활성 + 호버 시 lockedTooltip 표시 */
  isLocked?: boolean
  /** 잠금 시 카드 내부 호버 안내 메시지 */
  lockedTooltip?: string
}

// Figma 기준 좌표/치수는 카드 폭(663) 대비 cqw(=폭 1%). aspect-ratio 663/479 로 높이 동반 스케일.
export function ExamPrepHeroCard({
  title,
  onClick,
  ariaLabel,
  isLocked = false,
  lockedTooltip,
}: ExamPrepHeroCardProps) {
  const dim = isLocked ? 'opacity-40' : ''
  return (
    <button
      type="button"
      onClick={isLocked ? undefined : onClick}
      aria-label={ariaLabel ?? title}
      aria-disabled={isLocked}
      className={`group relative mx-auto block w-full max-w-[663px] ${isLocked ? 'cursor-not-allowed' : ''}`}
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
        className={`absolute inset-x-0 overflow-hidden ${dim}`}
        style={{
          top: 0,
          height: '69.08cqw',
          borderRadius: '6.033cqw',
          backgroundImage: 'linear-gradient(to bottom, #f0efff, #dbdafb)',
        }}
      >
        {/* DNA 좌상단 */}
        <img
          src="/topic_test/corner-dna.png"
          alt=""
          aria-hidden
          draggable={false}
          className="pointer-events-none absolute"
          style={{ left: '-1.885cqw', top: '-0.302cqw', width: '25.79cqw' }}
        />
        {/* 돋보기 우상단 */}
        <img
          src="/topic_test/corner-magnifier.png"
          alt=""
          aria-hidden
          draggable={false}
          className="pointer-events-none absolute"
          style={{ left: '71.27cqw', top: '-0.302cqw', width: '29.71cqw' }}
        />
        {/* 캐릭터 */}
        <img
          src="/topic_test/character.png"
          alt=""
          aria-hidden
          draggable={false}
          className="pointer-events-none absolute"
          style={{
            left: '2.489cqw',
            top: '5.43cqw',
            width: '94.87cqw',
            filter: 'drop-shadow(0 4px 10px rgba(113,111,220,0.45))',
          }}
        />
      </div>

      {/* 제목 — 표면 위 중앙 상단 (#383698) */}
      <div className={`pointer-events-none absolute inset-x-0 flex justify-center ${dim}`} style={{ top: '3.167cqw' }}>
        <span
          className="text-center font-semibold leading-tight break-keep"
          style={{
            maxWidth: '92cqw',
            fontSize: '10.558cqw',
            color: '#8f8df0',
            // 시안: 페리윙클 fill + 흰 외곽선(Dev Mode design_context 누락분). 획을 fill 뒤로
            // (paint-order) 돌려 fill 은 또렷하게 두고 바깥에 흰 테두리만 둘러 시안 매칭.
            WebkitTextStroke: '0.12em #ffffff',
            paintOrder: 'stroke fill',
            textShadow: '0 0.6cqw 0.6cqw #716fdc',
            fontFamily: 'Pretendard, sans-serif',
          }}
        >
          {title}
        </span>
      </div>

      {/* 잠금 — 자물쇠 단독 오버레이 */}
      {isLocked && (
        <div
          className="mid-scene pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
          data-stage="locked"
          aria-hidden
        >
          <img
            src="/midtest/자물쇠.png"
            alt=""
            aria-hidden
            draggable={false}
            className="mid-lock object-contain"
            style={{ width: '22cqw' }}
          />
        </div>
      )}

      {/* 호버 시 카드 하단 안내 — group-hover fade-in */}
      {isLocked && lockedTooltip && (
        <div
          className="pointer-events-none absolute inset-x-0 z-30 flex justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          style={{ bottom: '6cqw' }}
        >
          <div className="rounded-lg bg-white/95 px-4 py-2 text-sm font-semibold text-gray-900 shadow-lg backdrop-blur-sm">
            {lockedTooltip}
          </div>
        </div>
      )}
    </button>
  )
}
