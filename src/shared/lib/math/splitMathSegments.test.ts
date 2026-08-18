import { test } from 'node:test'
import assert from 'node:assert/strict'
import { splitMathSegments } from './splitMathSegments.ts'

test('수식이 없으면 텍스트 한 덩어리', () => {
  assert.deepEqual(splitMathSegments('함수의 정의역'), [{ type: 'text', value: '함수의 정의역' }])
})

test('인라인 수식을 분리한다', () => {
  assert.deepEqual(splitMathSegments('함수 $f(x)=3x$ 는'), [
    { type: 'text', value: '함수 ' },
    { type: 'inline', value: 'f(x)=3x' },
    { type: 'text', value: ' 는' },
  ])
})

test('블록 수식을 분리한다', () => {
  assert.deepEqual(splitMathSegments('$$\\frac{a}{b}$$'), [{ type: 'block', value: '\\frac{a}{b}' }])
})

test('블록이 인라인보다 우선한다', () => {
  const out = splitMathSegments('앞 $$x^2$$ 뒤')
  assert.equal(out[1].type, 'block')
  assert.equal(out[1].value, 'x^2')
})

test('행렬 표기를 보존한다', () => {
  const out = splitMathSegments('$$A = \\begin{pmatrix} 1 & 2 \\end{pmatrix}$$')
  assert.equal(out[0].value, 'A = \\begin{pmatrix} 1 & 2 \\end{pmatrix}')
})

test('닫히지 않은 달러는 평문으로 남긴다', () => {
  assert.deepEqual(splitMathSegments('가격은 $5 입니다'), [{ type: 'text', value: '가격은 $5 입니다' }])
})

test('이스케이프된 달러는 수식이 아니다', () => {
  const out = splitMathSegments('\\$5 와 \\$7')
  assert.equal(out.length, 1)
  assert.equal(out[0].type, 'text')
})

test('빈 문자열은 빈 배열', () => {
  assert.deepEqual(splitMathSegments(''), [])
})
