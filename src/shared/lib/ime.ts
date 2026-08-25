/**
 * @file ime.ts
 * @description 한글 등 IME 조합 중 Enter 를 "전송"으로 오인하지 않도록 판별
 * @module shared/lib
 * @dependencies 없음 (React 이벤트의 nativeEvent 만 읽음)
 */

/**
 * IME(한글·일본어·중국어) 조합 중에 눌린 Enter 인지 여부.
 *
 * 조합 중의 Enter 는 "글자 확정"이지 "전송"이 아니다. 이를 구분하지 않으면
 * 전송 직후 IME 가 확정한 마지막 글자가 입력창에 다시 채워져 잔상으로 남는다.
 * (예: "설명해줘" 입력 후 Enter → 전송은 되지만 "줘" 가 입력창에 남음)
 *
 * isComposing 을 채우지 않는 일부 환경을 위해 keyCode 229 도 함께 본다.
 */
export function isImeComposing(e: { nativeEvent: unknown }): boolean {
  const native = e.nativeEvent as { isComposing?: boolean; keyCode?: number } | null
  return native?.isComposing === true || native?.keyCode === 229
}
