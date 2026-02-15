/**
 * @file LectureStudyContainer.tsx
 * @description 회차별 학습 메인 컨테이너 — 좌우 패널 레이아웃
 * @module features/lecture-study
 * @dependencies 없음 (placeholder)
 */

'use client'

export function LectureStudyContainer({ lectureId }: { lectureId: string }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-gray-400">
      회차별 학습 화면 — lectureId: {lectureId} (구현 예정)
    </div>
  )
}
