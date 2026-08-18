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

/** 길이 3자 이상의 영문 단어가 몇 개인지 세기 */
function countLongEnglishWords(text: string): number {
  const words = text.split(/\s+/)
  return words.filter(w => /^[a-zA-Z]{3,}$/.test(w)).length
}

/** 내용이 수식으로 타당한지 판정 */
function isPlausibleMath(content: string): boolean {
  const trimmed = content.trim()
  if (!trimmed) return false

  // LaTeX 지표가 있으면 true
  if (hasLatexIndicator(trimmed)) return true

  // LaTeX 지표 없으면, 아래 4개 모두 만족할 때만 true
  // 1. 한글 없음
  if (/[ㄱ-힝가-힣]/.test(trimmed)) return false

  // 2. 길이 40자 이하
  if (trimmed.length > 40) return false

  // 3. 문장 종결부호+공백 없음
  if (/[.!?]\s/.test(trimmed)) return false

  // 4. 길이 3자 이상 영문 단어가 2개 이상 공백으로 구분되면 거부 (영어 문장 배제)
  if (countLongEnglishWords(trimmed) >= 2) return false

  return true
}

/** 지정 위치 이후의 이스케이프되지 않은 `$$` 를 찾는다 */
function findUnescapedDoubleDollar(text: string, startPos: number): number {
  for (let i = startPos; i < text.length - 1; i++) {
    if (
      text[i] === '$' &&
      text[i + 1] === '$' &&
      (i === 0 || text[i - 1] !== '\\')
    ) {
      return i
    }
  }
  return -1
}

/** 1패스: 블록 수식 스캔 + isPlausibleMath 검사 */
function extractBlocks(text: string): Array<{ type: 'text' | 'block'; value: string; blockValue?: string }> {
  const result: Array<{ type: 'text' | 'block'; value: string; blockValue?: string }> = []
  let cursor = 0
  let pos = 0

  while (pos < text.length) {
    const openPos = findUnescapedDoubleDollar(text, pos)
    if (openPos === -1) {
      // 블록 시작 못 찾음 → 나머지 전부 text
      if (cursor < text.length) {
        result.push({ type: 'text', value: text.slice(cursor) })
      }
      break
    }

    // 블록 시작 찾음 → 닫는 $$ 를 찾음
    const contentStart = openPos + 2
    let closePos = findUnescapedDoubleDollar(text, contentStart)

    if (closePos === -1) {
      // 닫는 $$ 못 찾음 → 여는 $$ 2글자만 건너뛰고 계속
      if (openPos > cursor) {
        result.push({ type: 'text', value: text.slice(cursor, openPos + 2) })
      } else {
        result.push({ type: 'text', value: text.slice(cursor, openPos) })
        result.push({ type: 'text', value: '$$' })
      }
      cursor = openPos + 2
      pos = openPos + 2
      continue
    }

    // 블록 후보 찾음: $$ ~ $$
    const blockContent = text.slice(contentStart, closePos).trim()
    if (isPlausibleMath(blockContent)) {
      // 수식으로 판정 → 블록 확정
      if (openPos > cursor) {
        result.push({ type: 'text', value: text.slice(cursor, openPos) })
      }
      result.push({
        type: 'block',
        value: text.slice(openPos, closePos + 2),
        blockValue: blockContent,
      })
      cursor = closePos + 2
      pos = closePos + 2
    } else {
      // 수식 아님 → 여는 $$ 2글자만 건너뛰고 다시 스캔
      if (openPos > cursor) {
        result.push({ type: 'text', value: text.slice(cursor, openPos + 2) })
      } else {
        result.push({ type: 'text', value: text.slice(cursor, openPos) })
        result.push({ type: 'text', value: '$$' })
      }
      cursor = openPos + 2
      pos = openPos + 2
    }
  }

  return result
}

/** 2패스: 각 비블록 조각에서 인라인 수식 스캔 */
function scanInlineInChunk(chunk: string): MathSegment[] {
  const result: MathSegment[] = []
  let i = 0

  while (i < chunk.length) {
    const openPos = findUnescapedDollar(chunk, i)
    if (openPos === -1) {
      // 달러 없음 → 나머지 text
      result.push({ type: 'text', value: chunk.slice(i) })
      break
    }

    // 다음 달러가 또 다른 달러인지 확인 (짝 없는 $$)
    if (openPos + 1 < chunk.length && chunk[openPos + 1] === '$') {
      // 짝 없는 $$ 발견 → $$ 2글자만 건너뛰고 계속
      result.push({ type: 'text', value: chunk.slice(i, openPos + 2) })
      i = openPos + 2
      continue
    }

    // 홑 $ 의 닫는 $ 찾기 (개행 없음)
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
