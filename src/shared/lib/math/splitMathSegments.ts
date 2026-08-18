/**
 * @file splitMathSegments.ts
 * @description 텍스트를 평문/인라인수식($...$)/블록수식($$...$$) 세그먼트로 분해
 * @module shared/lib/math
 * @dependencies 없음
 */

export type MathSegment = { type: 'text' | 'inline' | 'block'; value: string }

/** 이스케이프되지 않은 블록 수식 ($$..$$) — 개행 허용 */
const BLOCK_PATTERN = /(?<!\\)\$\$([\s\S]+?)(?<!\\)\$\$/g

/** 지정 위치 이후의 이스케이프되지 않은 `$` 를 찾는다 */
function findUnescapedDollar(text: string, startPos: number): number {
  for (let i = startPos; i < text.length; i++) {
    if (text[i] === '$' && (i === 0 || text[i - 1] !== '\\')) {
      return i
    }
  }
  return -1
}

/** LaTeX 지표가 있는지 판정: \letter 또는 ^_{}  */
function hasLatexIndicator(content: string): boolean {
  if (/\\[a-zA-Z]/.test(content)) return true
  if (/[\^_{}]/.test(content)) return true
  return false
}

/** 내용이 수식으로 타당한지 판정 */
function isPlausibleMath(content: string): boolean {
  const trimmed = content.trim()
  if (!trimmed) return false

  // LaTeX 지표가 있으면 true
  if (hasLatexIndicator(trimmed)) return true

  // LaTeX 지표 없으면, 아래 3개 모두 만족할 때만 true
  // 1. 한글 없음
  if (/[ㄱ-힝가-힣]/.test(trimmed)) return false

  // 2. 길이 40자 이하
  if (trimmed.length > 40) return false

  // 3. 문장 종결부호+공백 없음
  if (/[.!?]\s/.test(trimmed)) return false

  return true
}

/** 1패스: 정규식으로 블록 수식 모두 찾기 */
function extractBlocks(text: string): Array<{ type: 'text' | 'block'; value: string; blockValue?: string }> {
  const result: Array<{ type: 'text' | 'block'; value: string; blockValue?: string }> = []
  let cursor = 0

  for (const match of text.matchAll(BLOCK_PATTERN)) {
    const start = match.index ?? 0
    if (start > cursor) {
      result.push({ type: 'text', value: text.slice(cursor, start) })
    }
    result.push({
      type: 'block',
      value: text.slice(start, start + match[0].length),
      blockValue: match[1].trim(),
    })
    cursor = start + match[0].length
  }

  if (cursor < text.length) {
    result.push({ type: 'text', value: text.slice(cursor) })
  }

  return result
}

/** 2패스: 각 비블록 조각에서 인라인 수식 스캔 */
function scanInlineInChunk(chunk: string): MathSegment[] {
  const result: MathSegment[] = []
  let i = 0

  while (i < chunk.length) {
    const openPos = findUnescapedDollar(chunk, i)
    if (openPos === -1 || (openPos + 1 < chunk.length && chunk[openPos + 1] === '$')) {
      // 인라인 시작 없음 또는 블록 시작 → 나머지 text
      result.push({ type: 'text', value: chunk.slice(i) })
      break
    }

    // 닫는 $ 찾기 (개행 없음)
    const contentStart = openPos + 1
    let closePos = contentStart
    let foundClose = false
    while (closePos < chunk.length) {
      if (chunk[closePos] === '\n') {
        break
      }
      if (chunk[closePos] === '$' && (closePos === 0 || chunk[closePos - 1] !== '\\')) {
        foundClose = true
        break
      }
      closePos++
    }

    if (!foundClose) {
      // 닫는 $ 없음 또는 개행 만남 → 여는 $ 하나만 건너뛰고 계속
      result.push({ type: 'text', value: chunk.slice(i, openPos + 1) })
      i = openPos + 1
      continue
    }

    const content = chunk.slice(contentStart, closePos)
    if (isPlausibleMath(content)) {
      // 수식으로 판정
      result.push({ type: 'text', value: chunk.slice(i, openPos) })
      result.push({ type: 'inline', value: content.trim() })
      i = closePos + 1
    } else {
      // 수식 아님 → 여는 $ 하나만 건너뛰고 다시 스캔
      result.push({ type: 'text', value: chunk.slice(i, openPos + 1) })
      i = openPos + 1
    }
  }

  return result
}

/** 인접한 text 세그먼트를 병합하고 언이스케이프 처리 */
function mergeAndUnescape(segments: MathSegment[]): MathSegment[] {
  if (segments.length === 0) return []

  const merged: MathSegment[] = []
  let currentText = ''

  for (const seg of segments) {
    if (seg.type === 'text') {
      currentText += seg.value
    } else {
      if (currentText) {
        merged.push({ type: 'text', value: currentText.replace(/\\\$/g, '$') })
        currentText = ''
      }
      merged.push(seg)
    }
  }

  if (currentText) {
    merged.push({ type: 'text', value: currentText.replace(/\\\$/g, '$') })
  }

  return merged
}

export function splitMathSegments(text: string): MathSegment[] {
  if (!text) return []

  // 1패스: 정규식으로 블록 수식 모두 추출
  const blockChunks = extractBlocks(text)

  // 2패스: 각 text 조각에서 인라인 스캔
  const allSegments: MathSegment[] = []
  for (const chunk of blockChunks) {
    if (chunk.type === 'block') {
      allSegments.push({ type: 'block', value: chunk.blockValue! })
    } else {
      const inlineSegments = scanInlineInChunk(chunk.value)
      allSegments.push(...inlineSegments)
    }
  }

  // 인접 text 병합 및 언이스케이프
  const result = mergeAndUnescape(allSegments)

  return result
}
