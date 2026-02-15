/**
 * @file LectureSelectContainer.tsx
 * @description 회차 선택 화면 컨테이너 — 회차 카드 목록
 * @module features/lecture-study
 * @dependencies 없음 (placeholder)
 */

'use client'

export function LectureSelectContainer({ courseId }: { courseId: string }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-gray-400">
      회차 선택 화면 — courseId: {courseId} (구현 예정)
    </div>
  )
}
