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

// 회귀 테스트: 2패스 설계 검증
test('앞쪽 잡음 $ 가 뒤의 진짜 수식을 삼키지 않는다', () => {
  const out = splitMathSegments('이 문제는 $와 관련된 개념을 다룬다. 정답은 $x^2$ 이다.')
  const inlines = out.filter(s => s.type === 'inline')
  assert.equal(inlines.length, 1)
  assert.equal(inlines[0].value, 'x^2')
})

test('통화 $ 앞에 있어도 블록 수식이 보존된다', () => {
  const out = splitMathSegments('가격 $5, 공식 $$x^2$$')
  const blocks = out.filter(s => s.type === 'block')
  assert.equal(blocks.length, 1)
  assert.equal(blocks[0].value, 'x^2')
})

test('통화 표기 두 개는 수식이 아니다', () => {
  const out = splitMathSegments('$5 와 $7')
  assert.equal(out.filter(s => s.type !== 'text').length, 0)
})

test('한글 문장은 수식으로 오인하지 않는다', () => {
  const out = splitMathSegments('이것은 $아니고 그냥$ 텍스트')
  assert.equal(out.filter(s => s.type !== 'text').length, 0)
})

test('LaTeX 지표가 있으면 한글이 섞여도 수식이다', () => {
  const out = splitMathSegments('$속도 = \\frac{거리}{시간}$')
  assert.equal(out[0].type, 'inline')
  assert.ok(out[0].value.includes('\\frac'))
})

test('이스케이프된 달러는 평문에서 언이스케이프된다', () => {
  const out = splitMathSegments('\\$5 와 \\$7')
  assert.equal(out.length, 1)
  assert.equal(out[0].type, 'text')
  assert.equal(out[0].value, '$5 와 $7')
})

test('여러 줄 블록 수식의 줄바꿈과 백슬래시가 보존된다', () => {
  const out = splitMathSegments('$$A = \\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}$$')
  assert.equal(out[0].type, 'block')
  assert.ok(out[0].value.includes('\\\\'))
})

// 수정 라운드 2: 규율 통합 검증
test('영어 문장 속 통화가 뒤의 수식을 삼키지 않는다', () => {
  const out = splitMathSegments('The cost is $5 and the formula is $x^2$')
  const inlines = out.filter(s => s.type === 'inline')
  assert.equal(inlines.length, 1)
  assert.equal(inlines[0].value, 'x^2')
})

test('짝 없는 $$ 가 뒤의 인라인 수식을 삼키지 않는다', () => {
  const out = splitMathSegments('정답은 $$ 대충 쓰고 공식은 $x^2$ 이다')
  const inlines = out.filter(s => s.type === 'inline')
  assert.equal(inlines.length, 1)
  assert.equal(inlines[0].value, 'x^2')
})

test('짝 없는 $$ 뒤의 진짜 블록과 인라인이 모두 살아남는다', () => {
  const out = splitMathSegments('정답 $$ 오타 그리고 진짜 블록 $$y^2$$ 뒤에 인라인 $z$')
  const blocks = out.filter(s => s.type === 'block')
  const inlines = out.filter(s => s.type === 'inline')
  assert.equal(blocks.length, 1)
  assert.equal(blocks[0].value, 'y^2')
  assert.equal(inlines.length, 1)
  assert.equal(inlines[0].value, 'z')
})

test('한글 문장은 블록으로도 오인하지 않는다', () => {
  const out = splitMathSegments('$$ 오타 그리고 진짜 블록 $$')
  assert.equal(out.filter(s => s.type !== 'text').length, 0)
})
