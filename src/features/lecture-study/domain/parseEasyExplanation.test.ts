/**
 * @file parseEasyExplanation.test.ts
 * @description 쉬운 설명 파서 회귀 테스트 — 백엔드 parse_easy_explanation 과 동일 규칙 보장
 * @module features/lecture-study/domain
 * @dependencies node:test, parseEasyExplanation
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { parseEasyExplanation } from './parseEasyExplanation.ts'

test('라벨이 붙은 신규 생성분: 라벨을 신뢰하고 접두를 제거한다', () => {
  const text = [
    '한마디로: 프로세스는 실행 중인 프로그램이다.',
    '비유하자면: 레시피가 프로그램, 요리하는 행위가 프로세스다.',
    '예를 들면: 크롬 탭 하나하나가 각각 프로세스다.',
    '왜 중요하냐면: 스케줄링·메모리 보호의 단위가 프로세스이기 때문이다.',
  ].join('\n')

  assert.deepEqual(parseEasyExplanation(text), [
    { kind: 'summary', text: '프로세스는 실행 중인 프로그램이다.' },
    { kind: 'analogy', text: '레시피가 프로그램, 요리하는 행위가 프로세스다.' },
    { kind: 'example', text: '크롬 탭 하나하나가 각각 프로세스다.' },
    { kind: 'why', text: '스케줄링·메모리 보호의 단위가 프로세스이기 때문이다.' },
  ])
})

test('라벨 순서가 뒤섞여도 순서가 아니라 라벨을 따른다', () => {
  const text = '왜 중요하냐면: 시험에 나온다.\n한마디로: 핵심이다.'
  assert.deepEqual(parseEasyExplanation(text), [
    { kind: 'why', text: '시험에 나온다.' },
    { kind: 'summary', text: '핵심이다.' },
  ])
})

test('라벨 없는 뒷줄은 직전 라벨 덩어리 본문으로 합친다', () => {
  const text = '한마디로: 첫 줄.\n이어지는 둘째 줄.\n비유하자면: 저울 같다.'
  assert.deepEqual(parseEasyExplanation(text), [
    { kind: 'summary', text: '첫 줄.\n이어지는 둘째 줄.' },
    { kind: 'analogy', text: '저울 같다.' },
  ])
})

test('라벨이 전혀 없는 기존 데이터: 순서 기반 폴백', () => {
  const text = '가.\n\n나.\n다.\n라.'
  assert.deepEqual(parseEasyExplanation(text), [
    { kind: 'summary', text: '가.' },
    { kind: 'analogy', text: '나.' },
    { kind: 'example', text: '다.' },
    { kind: 'why', text: '라.' },
  ])
})

test('4덩어리를 넘는 잉여분은 plain', () => {
  const text = '1\n2\n3\n4\n5\n6'
  assert.deepEqual(
    parseEasyExplanation(text).map((b) => b.kind),
    ['summary', 'analogy', 'example', 'why', 'plain', 'plain'],
  )
})

test('4덩어리 미만이면 있는 것만 돌려준다', () => {
  assert.deepEqual(parseEasyExplanation('한 덩어리뿐.'), [
    { kind: 'summary', text: '한 덩어리뿐.' },
  ])
})

test('영문 라벨과 전각 콜론도 인식한다', () => {
  const text = 'In short： It is a process.\nFor example: a Chrome tab.'
  assert.deepEqual(parseEasyExplanation(text), [
    { kind: 'summary', text: 'It is a process.' },
    { kind: 'example', text: 'a Chrome tab.' },
  ])
})

test('영문 라벨은 대소문자를 가리지 않는다', () => {
  assert.deepEqual(parseEasyExplanation('WHY IT MATTERS: exam.'), [
    { kind: 'why', text: 'exam.' },
  ])
})

test('빈 줄·공백만 있는 덩어리는 버린다', () => {
  assert.deepEqual(parseEasyExplanation('\n\n  \n가.\n\n\n나.\n   '), [
    { kind: 'summary', text: '가.' },
    { kind: 'analogy', text: '나.' },
  ])
})

test('라벨만 있고 본문이 비면 그 덩어리는 버리되 순서 슬롯은 소비한다', () => {
  // 백엔드와 동일: enumerate 인덱스는 유지되므로 뒤 덩어리의 폴백 종류가 밀리지 않는다.
  const text = '한마디로:\n비유하자면: 저울 같다.'
  assert.deepEqual(parseEasyExplanation(text), [{ kind: 'analogy', text: '저울 같다.' }])
})

test('문자열이 아니거나 비어 있으면 빈 배열', () => {
  assert.deepEqual(parseEasyExplanation(''), [])
  assert.deepEqual(parseEasyExplanation('   \n  '), [])
  assert.deepEqual(parseEasyExplanation(null), [])
  assert.deepEqual(parseEasyExplanation(undefined), [])
  assert.deepEqual(parseEasyExplanation(42), [])
})

test('CRLF 원문도 같은 결과 (strip 이 \\r 를 먹는다)', () => {
  assert.deepEqual(parseEasyExplanation('가.\r\n\r\n나.'), [
    { kind: 'summary', text: '가.' },
    { kind: 'analogy', text: '나.' },
  ])
})
