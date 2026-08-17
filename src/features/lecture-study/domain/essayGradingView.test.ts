/**
 * @file essayGradingView.test.ts
 * @description 서술형 채점 표시 모델 변환 회귀 테스트 — 구경로 행·빈 채점·failed 방어
 * @module features/lecture-study/domain
 * @dependencies node:test, essayGradingView
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  hasEssayGradingRecord,
  isEssayGradingSettled,
  toEssayGradingView,
} from './essayGradingView.ts'

test('graded: 요소·총평·점수를 그대로 옮긴다', () => {
  const view = toEssayGradingView({
    grading_status: 'graded',
    score: 67,
    grading: {
      criteria: [
        { key: 'a', label: '부모에게 없음', verdict: 'met', quote: '부모 DNA에는 없지만' },
        { key: 'b', label: '생식세포 분열', verdict: 'missed', quote: null },
      ],
      feedback: '  생식세포 이야기를 더해보세요  ',
    },
  })

  assert.equal(view.status, 'graded')
  assert.equal(view.score, 67)
  assert.equal(view.criteria.length, 2)
  assert.equal(view.feedback, '생식세포 이야기를 더해보세요')
})

test('failed: grading 이 통째로 null 이어도 터지지 않는다', () => {
  const view = toEssayGradingView({ grading_status: 'failed', score: null, grading: null })
  assert.deepEqual(view, { status: 'failed', score: null, criteria: [], feedback: null })
})

test('pending: 아직 점수도 요소도 없다', () => {
  const view = toEssayGradingView({ grading_status: 'pending' })
  assert.equal(view.status, 'pending')
  assert.equal(view.score, null)
})

test('graded 인데 요소가 비면 failed 로 낮춘다 — 빈 체크리스트를 결과인 양 보이지 않는다', () => {
  const view = toEssayGradingView({
    grading_status: 'graded',
    score: 80,
    grading: { criteria: [], feedback: '좋아요' },
  })
  assert.equal(view.status, 'failed')
  assert.equal(view.score, null)
})

test('점수가 숫자가 아니면 null 로 떨군다', () => {
  const view = toEssayGradingView({
    grading_status: 'graded',
    score: Number.NaN,
    grading: { criteria: [{ key: 'a', verdict: 'met', quote: null }] },
  })
  assert.equal(view.score, null)
})

test('알 수 없는 상태는 채점 중으로 본다 — 결과를 지어내지 않는다', () => {
  assert.equal(toEssayGradingView({ grading_status: 'weird' }).status, 'pending')
})

test('hasEssayGradingRecord: grading_status 가 없는 구경로 행은 채점 기록이 아니다', () => {
  assert.equal(hasEssayGradingRecord(null), false)
  assert.equal(hasEssayGradingRecord(undefined), false)
  assert.equal(hasEssayGradingRecord('pending'), true)
  assert.equal(hasEssayGradingRecord('graded'), true)
  assert.equal(hasEssayGradingRecord('failed'), true)
})

test('isEssayGradingSettled: graded·failed 만 최종값', () => {
  assert.equal(isEssayGradingSettled('graded'), true)
  assert.equal(isEssayGradingSettled('failed'), true)
  assert.equal(isEssayGradingSettled('pending'), false)
  assert.equal(isEssayGradingSettled(null), false)
})
