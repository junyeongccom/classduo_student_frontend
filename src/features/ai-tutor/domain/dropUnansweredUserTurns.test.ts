/**
 * @file dropUnansweredUserTurns.test.ts
 * @description 회귀 테스트 — 실패한 턴의 학생 발화가 복원 시 중복 렌더되지 않는지
 * @module features/ai-tutor/domain
 * @dependencies node:test, dropUnansweredUserTurns
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { dropUnansweredUserTurns } from './dropUnansweredUserTurns.ts'

const m = (role: string, content: string) => ({ role, content })

test('실패 후 재시도로 같은 질문이 두 번 저장돼도 한 번만 남는다', () => {
  // dev DB 실제 세션(d483dbb8…) 재현: 04:37:24 user / 04:37:49 user(동일 내용) / 04:37:54 assistant
  const rows = [
    m('assistant', '디딤돌 질문'),
    m('user', '수만개의 유전자를 찾아야...'),
    m('user', '수만개의 유전자를 찾아야...'),
    m('assistant', '맞아요!'),
  ]
  assert.deepEqual(dropUnansweredUserTurns(rows), [rows[0], rows[2], rows[3]])
})

test('내용이 달라도 답변을 못 받은 앞선 발화는 걷어낸다', () => {
  const rows = [m('user', '실패한 질문'), m('user', '고쳐 쓴 질문'), m('assistant', '답변')]
  assert.deepEqual(dropUnansweredUserTurns(rows), [rows[1], rows[2]])
})

test('정상 대화(user→assistant 반복)는 한 건도 잃지 않는다', () => {
  const rows = [
    m('assistant', '시드 질문'), m('user', 'A'), m('assistant', 'a'),
    m('user', 'B'), m('assistant', 'b'),
  ]
  assert.deepEqual(dropUnansweredUserTurns(rows), rows)
})

test('같은 질문이라도 각각 답변을 받았으면 둘 다 남는다', () => {
  const rows = [m('user', '같은 질문'), m('assistant', '답1'), m('user', '같은 질문'), m('assistant', '답2')]
  assert.deepEqual(dropUnansweredUserTurns(rows), rows)
})

test('답변 대기 중인 마지막 학생 발화는 보존된다', () => {
  const rows = [m('assistant', '질문'), m('user', '답하는 중')]
  assert.deepEqual(dropUnansweredUserTurns(rows), rows)
})

test('빈 배열·비배열 입력에도 터지지 않는다', () => {
  assert.deepEqual(dropUnansweredUserTurns([]), [])
  assert.deepEqual(dropUnansweredUserTurns(null as unknown as { role: string }[]), [])
})
