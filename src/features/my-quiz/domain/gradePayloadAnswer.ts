/**
 * @file gradePayloadAnswer.ts
 * @description exam_prep 특수 유형(매칭/빈칸/복수/단수 객관식) 클라이언트 채점 (순수 함수).
 *   시험모드는 여러 테스트의 문항을 섞어 출제하므로 단일 attempt 서버 채점을 쓸 수 없다 →
 *   payload 의 정답(correct_answer / correct_pairs)으로 프론트에서 직접 정/오답을 판정한다.
 *   핵심주제학습(CoreTestSolveContainer)의 정답 판정 규약(payload.correct_answer 인덱스)과 동치.
 *   서술형(error_diagnosis_evaluation)은 LLM 채점이라 여기서 다루지 않는다(시험모드에서 제외).
 * @module features/my-quiz/domain
 * @dependencies (none)
 */

/** 시험모드가 핵심주제학습 폼으로 풀게 지원하는 객관식 question_format 집합. 서술형은 제외. */
export const SUPPORTED_PAYLOAD_FORMATS = new Set<string>([
  'term_definition_match3', // 매칭
  'category_fill_blank5_single', // 빈칸 단수
  'category_fill_blank7_multi', // 빈칸 복수
  'description_mcq6_multi', // 6지선다 복수
  'compare_contrast_mcq4', // 4지선다 단수 (default)
  'reason_purpose_mcq4',
  'description_mcq4_single',
])

/** LLM 채점이 필요한 서술형 — 시험모드 출제/렌더에서 제외. */
export const ESSAY_PAYLOAD_FORMAT = 'error_diagnosis_evaluation'

/**
 * question_format 이 시험모드에서 폼으로 풀 수 있는 유형인지.
 * (지원 집합에 명시된 유형만 true. 미지의 신규 유형/서술형은 false → 단일선택 폴백 또는 출제 제외.)
 */
export function isSupportedPayloadFormat(
  questionFormat: string | null | undefined,
): boolean {
  if (!questionFormat) return false
  return SUPPORTED_PAYLOAD_FORMATS.has(questionFormat)
}

/** number[] 로 안전 변환 (혼합 배열에서 number 만 추출). */
function numberArray(v: unknown): number[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is number => typeof x === 'number')
}

/** [number, number][] 로 안전 변환 (길이 2 number 쌍만). */
function pairArray(v: unknown): [number, number][] {
  if (!Array.isArray(v)) return []
  const out: [number, number][] = []
  for (const p of v) {
    if (Array.isArray(p) && typeof p[0] === 'number' && typeof p[1] === 'number') {
      out.push([p[0], p[1]])
    }
  }
  return out
}

/** 두 number 집합이 동일 원소 집합인지 (순서 무관). */
function sameNumberSet(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false
  const sa = new Set(a)
  if (sa.size !== b.length) return false // 중복 제거 후 길이 불일치 방지
  return b.every((x) => sa.has(x))
}

/** 두 매칭 쌍 집합이 동일한지 (순서 무관, "l,r" 키 비교). */
function samePairSet(a: [number, number][], b: [number, number][]): boolean {
  if (a.length !== b.length) return false
  const sa = new Set(a.map(([l, r]) => `${l},${r}`))
  if (sa.size !== a.length) return false
  return b.every(([l, r]) => sa.has(`${l},${r}`))
}

/**
 * 특수 유형 응답을 payload 정답과 대조해 정/오답 판정.
 *
 * 응답 모델(polymorphic):
 *  - mcq4 / fill_blank5_single → number (선택 인덱스)
 *  - mcq6_multi               → number[] (정확히 2개)
 *  - fill_blank7_multi        → (number|null)[] (각 빈칸 인덱스; null=미완성)
 *  - match                    → [number, number][] (좌→우 쌍)
 *
 * @param questionFormat 문항 유형
 * @param payload        문항 payload (한국어; correct_answer/correct_pairs 는 언어 무관 인덱스)
 * @param response       사용자 응답 (위 모델). 미완성/미응답이면 false.
 * @returns is_correct (지원 유형이 아니거나 정답 데이터 부재 시 false)
 */
export function gradePayloadResponse(
  questionFormat: string | null | undefined,
  payload: Record<string, unknown> | null | undefined,
  response: unknown,
): boolean {
  if (!questionFormat || !payload) return false
  const p = payload

  switch (questionFormat) {
    case 'term_definition_match3': {
      const correct = pairArray(p.correct_pairs)
      const ans = pairArray(response)
      if (correct.length === 0) return false
      return samePairSet(ans, correct)
    }
    case 'description_mcq6_multi': {
      // 6지선다 복수 = M개 중 N개 고르기 → 순서 무관 집합 비교.
      const correct = numberArray(p.correct_answer)
      if (correct.length === 0) return false
      if (!Array.isArray(response)) return false
      if ((response as unknown[]).some((x) => x == null)) return false
      return sameNumberSet(numberArray(response), correct)
    }
    case 'category_fill_blank7_multi': {
      // 빈칸 복수 = 각 빈칸의 정답 인덱스. 기본은 위치별(순서) 비교,
      // payload.unordered === true 일 때만 순서 무관(집합) — exam_prep 채점 규약(8453606)과 일치.
      const correct = numberArray(p.correct_answer)
      if (correct.length === 0) return false
      if (!Array.isArray(response)) return false
      if ((response as unknown[]).some((x) => x == null)) return false
      const ans = numberArray(response)
      if (p.unordered === true) return sameNumberSet(ans, correct)
      if (ans.length !== correct.length) return false
      return ans.every((x, i) => x === correct[i])
    }
    // 단수형 (mcq4 / fill_blank5_single 및 미지의 단수 유형 폴백)
    default: {
      const rawCorrect = p.correct_answer
      const correctIdx =
        typeof rawCorrect === 'number'
          ? rawCorrect
          : Array.isArray(rawCorrect) && typeof rawCorrect[0] === 'number'
            ? (rawCorrect[0] as number)
            : null
      if (correctIdx == null) return false
      return typeof response === 'number' && response === correctIdx
    }
  }
}
