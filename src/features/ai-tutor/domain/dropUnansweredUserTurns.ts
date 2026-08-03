/**
 * @file dropUnansweredUserTurns.ts
 * @description 서버에서 불러온 대화에서 답변을 못 받은 학생 발화(연속 user 중 마지막 제외)를 제거
 * @module features/ai-tutor/domain
 * @dependencies 없음 (순수 함수)
 */

/**
 * 답변을 받지 못한 학생 발화를 걷어낸다 — 같은 질문이 두 번 보이는 현상의 원인.
 *
 * 스트리밍이 실패한 턴에서도 학생 메시지는 서버에 이미 저장된다. 화면에서는 재시도 시
 * 실패한 학생 말풍선을 지우지만(ChatInterface.handleRetry) 서버 행은 남아, 세션을 다시 열면
 * 그 유령 발화가 되살아나 같은 질문이 연속 두 번 렌더된다(인쇄물도 동일).
 *
 * 판정 규칙: **바로 뒤가 또 user 인 user 메시지 = 답변을 못 받은 턴**. 정상 턴은 언제나
 * user → assistant 로 이어지므로 user 가 연달아 오는 구간은 실패/재시도 흔적뿐이다.
 * 마지막 user 메시지(답변 대기 중일 수 있음)는 뒤에 user 가 없으므로 항상 보존된다.
 */
export function dropUnansweredUserTurns<T extends { role: string }>(messages: T[]): T[] {
  if (!Array.isArray(messages)) return []
  return messages.filter(
    (m, i) => !(m.role === 'user' && messages[i + 1]?.role === 'user'),
  )
}
