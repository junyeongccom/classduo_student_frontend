/**
 * @file formatExplanation.ts
 * @description "1: … 2: …" 처럼 선지 번호로 나열된 해설을 번호마다 단락으로 끊고, 화면 선지 라벨(숫자/문자)에 맞춰 표기하는 순수 함수
 * @module features/my-quiz/domain
 * @dependencies (none)
 */

/** 선지 번호(1-based) → 폼 라벨. exam_prep 폼은 A,B,C…(String.fromCharCode), legacy/저장소 리스트는 숫자. */
export function letterLabel(n: number): string {
  return n >= 1 && n <= 26 ? String.fromCharCode(64 + n) : String(n)
}
export function numberLabel(n: number): string {
  return String(n)
}

/**
 * "1: … 2: … 3: …" 처럼 선지 번호로 나열된 해설을 번호마다 단락(\n\n)으로 끊어 가독성을 높인다.
 * 번호는 원본 선지 순서를 가리키므로 toLabel 로 화면 선지 라벨(exam_prep 폼=A,B,C / 숫자 리스트=숫자)에 맞추고,
 * 자동 재번호를 막기 위해 마크다운 ordered list 가 아닌 굵은 라벨 + 단락 구분만 삽입한다.
 * 콜론 뒤 공백이 없는 "3:30"(시간)·"4:1"(비율) 등은 매칭되지 않으며, 번호 나열이 아닌 일반 해설은 그대로 둔다(no-op).
 */
export function formatNumberedExplanation(
  text: string,
  toLabel: (n: number) => string = numberLabel,
): string {
  const out = text.replace(
    /\s*(\d{1,2}):[ \t]+/g,
    (_m, d: string) => `\n\n**${toLabel(Number(d))}:** `,
  )
  return out.replace(/^\s+/, '').trim()
}
