/**
 * @file parseEasyExplanation.ts
 * @description 평문 1문자열로 저장된 쉬운 설명을 {kind, text} 덩어리로 나누는 순수 함수
 * @module features/lecture-study/domain
 * @dependencies 없음 (백엔드 summary_normalizer.parse_easy_explanation 와 동일 규칙)
 */

/**
 * 쉬운 설명 덩어리 종류.
 * 프롬프트(백엔드 shared/prompts/content_summary.py)가 네 덩어리를 순서대로 쓰도록 지시한다:
 * (1) 한 문장 요약+용어풀이 (2) 비유 (3) 구체적 예시 (4) 왜 중요한지.
 */
export type EasyBlockKind = 'summary' | 'analogy' | 'example' | 'why' | 'plain'

export interface EasyBlock {
  kind: EasyBlockKind
  text: string
}

/** 라벨이 없을 때 순서로 부여하는 종류. 이 길이(4)를 넘는 덩어리는 plain. */
export const EASY_KIND_ORDER: readonly EasyBlockKind[] = ['summary', 'analogy', 'example', 'why']

/**
 * 신규 생성분은 각 덩어리 앞에 아래 라벨을 단다. 라벨이 있으면 순서와 무관하게 라벨을 신뢰한다.
 * (기존 데이터는 라벨이 없으므로 순서 기반 폴백을 탄다.)
 */
const EASY_LABELS: readonly (readonly [EasyBlockKind, readonly string[]])[] = [
  ['summary', ['한마디로', 'In short', 'In a word']],
  ['analogy', ['비유하자면', '비유를 들자면', 'Analogy', 'To use an analogy']],
  ['example', ['예를 들면', '예를 들어', 'For example', 'For instance']],
  ['why', ['왜 중요하냐면', '왜 중요한가', 'Why it matters', 'Why this matters']],
]

const LABEL_SEPARATORS = [':', '：'] as const

/** 덩어리 구분자는 줄바꿈이다. 빈 줄(연속 개행)도 하나의 구분자로 본다. */
const NEWLINE_RUN = /\n+/

/** 덩어리가 라벨로 시작하면 [kind, 라벨 제거한 본문]을, 아니면 [null, 원문]을 돌려준다. */
function matchEasyLabel(chunk: string): [EasyBlockKind | null, string] {
  const lowered = chunk.toLowerCase()
  for (const [kind, labels] of EASY_LABELS) {
    for (const label of labels) {
      for (const sep of LABEL_SEPARATORS) {
        const prefix = `${label}${sep}`.toLowerCase()
        if (lowered.startsWith(prefix)) {
          return [kind, chunk.slice(prefix.length).trim()]
        }
      }
    }
  }
  return [null, chunk]
}

/**
 * 평문 1문자열로 저장된 쉬운 설명을 {kind, text} 덩어리 목록으로 나눈다.
 *
 * 순수 함수. 저장 형태를 바꾸지 않고 표현(카드 렌더)만 살리기 위한 파싱이다.
 * 백엔드 `summary_normalizer.parse_easy_explanation` 과 규칙이 같아야 한다
 * (웹은 서버가 blocks 를 내려주지 않는 기존 계약을 쓰므로 클라이언트에서 같은 파싱을 한다).
 *
 * 규칙:
 *   - 줄바꿈(빈 줄 포함)으로 덩어리를 나누고 공백만 있는 덩어리는 버린다.
 *   - 라벨(`한마디로:` 등)로 시작하는 덩어리가 하나라도 있으면 라벨을 신뢰한다.
 *     라벨 없는 뒷줄은 직전 라벨 덩어리의 본문으로 합친다(한 덩어리가 여러 줄인 경우).
 *   - 라벨이 전혀 없으면 프롬프트가 지시한 순서대로 summary·analogy·example·why 를 부여한다.
 *   - 덩어리가 4개를 넘으면 나머지는 plain. 4개 미만이면 있는 것만 돌려준다.
 *   - 문자열이 아니거나 비어 있으면 빈 배열.
 */
export function parseEasyExplanation(text: unknown): EasyBlock[] {
  if (typeof text !== 'string') return []

  const chunks = text.split(NEWLINE_RUN).map((c) => c.trim())
  let matched: [EasyBlockKind | null, string][] = chunks
    .filter((c) => c)
    .map((c) => matchEasyLabel(c))
  if (matched.length === 0) return []

  if (matched.some(([kind]) => kind !== null)) {
    const merged: [EasyBlockKind | null, string][] = []
    for (const [kind, body] of matched) {
      const prev = merged[merged.length - 1]
      if (kind === null && prev) {
        merged[merged.length - 1] = [prev[0], `${prev[1]}\n${body}`.trim()]
      } else {
        merged.push([kind, body])
      }
    }
    matched = merged
  }

  const blocks: EasyBlock[] = []
  matched.forEach(([kind, body], index) => {
    if (!body) return
    const resolved = kind ?? (index < EASY_KIND_ORDER.length ? EASY_KIND_ORDER[index] : 'plain')
    blocks.push({ kind: resolved, text: body })
  })
  return blocks
}
