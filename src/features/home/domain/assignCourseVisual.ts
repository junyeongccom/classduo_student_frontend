/**
 * @file assignCourseVisual.ts
 * @description courseId 기반 결정적 해시로 색상/이모지 자동 부여
 * @module features/home/domain
 * @dependencies 없음 (순수 함수)
 */

const COURSE_PALETTE = [
  { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200', accent: '#8B5CF6' },
  { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', accent: '#6366F1' },
  { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', accent: '#3B82F6' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200', accent: '#06B6D4' },
  { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200', accent: '#14B8A6' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', accent: '#10B981' },
  { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', accent: '#F59E0B' },
  { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', accent: '#F97316' },
  { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200', accent: '#F43F5E' },
  { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200', accent: '#EC4899' },
  { bg: 'bg-fuchsia-100', text: 'text-fuchsia-700', border: 'border-fuchsia-200', accent: '#D946EF' },
  { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', accent: '#A855F7' },
  { bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-200', accent: '#0EA5E9' },
  { bg: 'bg-lime-100', text: 'text-lime-700', border: 'border-lime-200', accent: '#84CC16' },
  { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', accent: '#EAB308' },
  { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', accent: '#EF4444' },
] as const

const COURSE_EMOJIS = [
  '📚', '🧪', '🔬', '📐', '🎨', '🌍', '💡', '🧠',
  '📊', '🎵', '🏛️', '⚙️', '📝', '🌱', '🔢', '🎯',
] as const

export interface CourseVisual {
  bg: string
  text: string
  border: string
  accent: string
  emoji: string
}

/**
 * courseId의 UUID 문자를 기반으로 결정적 해시값을 생성
 */
function hashCourseId(courseId: string): number {
  let hash = 0
  for (let i = 0; i < courseId.length; i++) {
    const char = courseId.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0
  }
  return Math.abs(hash)
}

/**
 * courseId 기반으로 결정적 색상/이모지를 할당
 * 동일 courseId는 항상 동일한 결과를 반환
 */
export function assignCourseVisual(courseId: string): CourseVisual {
  const hash = hashCourseId(courseId)
  const colorIndex = hash % COURSE_PALETTE.length
  const emojiIndex = (hash >>> 4) % COURSE_EMOJIS.length

  return {
    ...COURSE_PALETTE[colorIndex],
    emoji: COURSE_EMOJIS[emojiIndex],
  }
}

/**
 * 과목 목록에 대해 인접 과목 색상 충돌을 최소화하여 할당
 * 같은 학기 내에서 연속된 과목이 다른 색상을 가지도록 조정
 */
export function assignCourseVisuals(courseIds: string[]): Map<string, CourseVisual> {
  const result = new Map<string, CourseVisual>()
  const usedIndices = new Set<number>()

  for (const id of courseIds) {
    const hash = hashCourseId(id)
    let colorIndex = hash % COURSE_PALETTE.length

    // 인접 과목과 겹치면 다음 색상으로 이동
    let attempts = 0
    while (usedIndices.has(colorIndex) && attempts < COURSE_PALETTE.length) {
      colorIndex = (colorIndex + 1) % COURSE_PALETTE.length
      attempts++
    }

    usedIndices.add(colorIndex)
    const emojiIndex = (hash >>> 4) % COURSE_EMOJIS.length

    result.set(id, {
      ...COURSE_PALETTE[colorIndex],
      emoji: COURSE_EMOJIS[emojiIndex],
    })
  }

  return result
}
