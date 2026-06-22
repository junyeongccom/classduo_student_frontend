/**
 * @file MaintenanceFullScreen.tsx
 * @description 서비스 종료 안내 전체화면 (핵심주제학습 남/여 캐릭터 + 종료 공지). 사이트 접속 시 항상 표시.
 * @module shared/components/common
 * @dependencies public/topic_test/hero-{male,female}.png
 */
'use client'

// 서비스 종료 안내 — true 면 사이트 전체를 종료 공지로 덮는다. (서비스 재개 시 false)
const SERVICE_CLOSED = true

// 흰 스티커 외곽선 + 보라 그림자 (ExamPrepHeroCard 와 동일 톤).
const STICKER =
  'drop-shadow(2px 0 0 #fff) drop-shadow(-2px 0 0 #fff) drop-shadow(0 2px 0 #fff) drop-shadow(0 -2px 0 #fff) drop-shadow(0 8px 16px rgba(63,61,191,0.35))'

export function MaintenanceFullScreen() {
  if (!SERVICE_CLOSED) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-start overflow-y-auto px-5 py-10 text-center"
      style={{ background: 'linear-gradient(to bottom, #f0efff 0%, #dbdafb 100%)' }}
      role="status"
      aria-live="polite"
    >
      <div className="my-auto flex w-full flex-col items-center">
        <div className="flex items-end justify-center gap-1 sm:gap-4">
          <img
            src="/topic_test/hero-female.png"
            alt=""
            aria-hidden
            draggable={false}
            className="pointer-events-none h-auto w-24 select-none sm:w-36"
            style={{ filter: STICKER }}
          />
          <img
            src="/topic_test/hero-male.png"
            alt=""
            aria-hidden
            draggable={false}
            className="pointer-events-none h-auto w-24 select-none sm:w-36"
            style={{ filter: STICKER }}
          />
        </div>

        <div className="mt-7 w-full max-w-lg rounded-2xl bg-white/85 p-6 text-left shadow-xl backdrop-blur sm:p-8 dark:bg-gray-900/85">
          <h1 className="mb-4 text-center text-base font-extrabold text-gray-900 sm:text-xl dark:text-gray-50">
            생명과학의 세계 · Aplus 학습 서비스 종료 안내
          </h1>
          <div className="space-y-3 text-sm leading-relaxed text-gray-700 sm:text-[15px] dark:text-gray-200">
            <p>안녕하세요, 생명과학의 세계 수강생 여러분.</p>
            <p>한 학기 동안 Aplus를 이용해 주셔서 진심으로 감사합니다.</p>
            <p>기말고사가 마무리됨에 따라 생명과학의 세계 Aplus 학습 서비스 운영을 종료하게 되었습니다.</p>
            <div className="rounded-lg bg-indigo-50 p-3 text-[13px] sm:text-sm dark:bg-indigo-900/30">
              <p>
                ■ <b>종료 일시</b>: 6월 22일 19시
              </p>
              <p className="mt-1.5">
                ■ <b>종료 후 안내</b>: 종료 시점 이후에는 AI튜터·내퀴즈·핵심주제학습 등 모든 기능과 학습 기록에 접근이 어렵습니다.
              </p>
            </div>
            <p>
              한 학기 동안 Aplus와 함께 열심히 공부하신 여러분 모두 수고 많으셨습니다. 좋은 결과 있으시길 응원합니다.
            </p>
            <p>감사합니다.</p>
            <p className="text-right font-semibold text-gray-600 dark:text-gray-300">Aplus 운영팀 드림</p>
          </div>
        </div>
      </div>
    </div>
  )
}
