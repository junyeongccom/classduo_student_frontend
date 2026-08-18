/**
 * @file splitMathSegments.ts
 * @description 텍스트를 평문/인라인수식($...$)/블록수식($$...$$) 세그먼트로 분해
 * @module shared/lib/math
 * @dependencies 없음
 */

export type MathSegment = { type: 'text' | 'inline' | 'block'; value: string }

/** `$$...$$` 를 먼저, 그다음 `$...$` 를 찾는다. `\$` 는 수식 구분자가 아니다. */
const PATTERN = /(?<!\\)\$\$([\s\S]+?)(?<!\\)\$\$|(?<!\\)\$([^$\n]+?)(?<!\\)\$/g

export function splitMathSegments(text: string): MathSegment[] {
  if (!text) return []

  const segments: MathSegment[] = []
  let cursor = 0

  for (const match of text.matchAll(PATTERN)) {
    const start = match.index ?? 0
    if (start > cursor) {
      segments.push({ type: 'text', value: text.slice(cursor, start) })
    }
    if (match[1] !== undefined) {
      segments.push({ type: 'block', value: match[1].trim() })
    } else {
      segments.push({ type: 'inline', value: match[2].trim() })
    }
    cursor = start + match[0].length
  }

  if (cursor < text.length) {
    segments.push({ type: 'text', value: text.slice(cursor) })
  }
  return segments
}
