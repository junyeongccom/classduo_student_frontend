/**
 * @file socraticStages.test.ts
 * @description 소크라 요약표 회귀 테스트 — 단계별 점수 합 == 총점 (랭킹 신뢰도 직결)
 * @module features/ai-tutor/domain
 * @dependencies node:test, socraticStages
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import type { SocraticCheckpointResult, SocraticStageOutlineItem } from '../types.ts'
import { buildSocraticSummary, buildSocraticCheckpointRows } from './socraticStages.ts'

const OUTLINE: SocraticStageOutlineItem[] = [
  { type: 'TERM_MEMORY', label: '용어암기', count: 2, start_index: 0 },
  { type: 'CONCEPT', label: '개념이해', count: 1, start_index: 2 },
  { type: 'ANALYSIS_APPLY', label: '분석과적용', count: 1, start_index: 3 },
  { type: 'JUDGE_DESIGN', label: '판단과설계', count: 1, start_index: 4 },
]

// dev DB 실제 세션(8edf24c2…)의 checkpoint_results — total_score = 60
const RESULTS: SocraticCheckpointResult[] = [
  { index: 0, method: 'fallback', aha: false, score: 8 },
  { index: 1, method: 'scaffold2', aha: true, score: 12 },
  { index: 2, method: 'self', aha: false, score: 20 },
  { index: 3, method: 'self', aha: false, score: 20 },
]

const sumRows = (rows: { score: number }[]) => rows.reduce((s, r) => s + r.score, 0)

test('요약표 단계별 점수 합 == 총점 (핵심 불변식)', () => {
  const summary = buildSocraticSummary(OUTLINE, 5, 4, RESULTS)
  assert.equal(sumRows(summary.rows), summary.totalScore)
  assert.equal(summary.totalScore, 60)
})

test('복원 세션: checkpoint_results 가 살아 있으면 방식·점수가 그대로 찍힌다', () => {
  const { rows } = buildSocraticSummary(OUTLINE, 5, 4, RESULTS)
  assert.deepEqual(
    rows.map((r) => [r.passed, r.method, r.score]),
    [
      [true, 'fallback', 8],
      [true, 'scaffold2', 12],
      [true, 'self', 20],
      [true, 'self', 20],
      [false, null, 0],
    ],
  )
})

test('결과가 유실된 구 세션도 합과 총점이 갈라지지 않는다 (둘 다 0)', () => {
  // 회귀 대상: 예전에는 rows 가 전부 0점인데 총점만 store 에서 80으로 따로 들어와 모순이었다.
  const summary = buildSocraticSummary(OUTLINE, 4, 4, [])
  assert.equal(sumRows(summary.rows), summary.totalScore)
  assert.equal(summary.totalScore, 0)
  assert.ok(summary.rows.every((r) => r.passed && r.method === null))
})

test('어뷰징 감점도 서버식(Σ − penalty, 바닥 0)과 같게 반영된다', () => {
  assert.equal(buildSocraticSummary(OUTLINE, 5, 4, RESULTS, 2).totalScore, 58)
  assert.equal(buildSocraticSummary(OUTLINE, 5, 4, RESULTS, 999).totalScore, 0)
})

test('아하 횟수도 같은 행에서 파생된다', () => {
  assert.equal(buildSocraticSummary(OUTLINE, 5, 4, RESULTS).ahaCount, 1)
})

test('복원 세션 실제 페이로드(총점 80) — 예전 인쇄물이 0점 × 4 로 찍던 그 세션', () => {
  // dev API GET /ai-tutor/sessions/d483dbb8…/socratic/state 응답 그대로.
  // 서버는 checkpoint_results 를 정상 반환하고 있었고, 프론트 복원 경로가 이걸 버려서 생긴 버그였다.
  const outline: SocraticStageOutlineItem[] = [
    { type: 'TERM_MEMORY', label: '용어암기', count: 1, start_index: 0 },
    { type: 'CONCEPT', label: '개념이해', count: 1, start_index: 1 },
    { type: 'ANALYSIS_APPLY', label: '분석과적용', count: 1, start_index: 2 },
    { type: 'JUDGE_DESIGN', label: '판단과설계', count: 1, start_index: 3 },
  ]
  const summary = buildSocraticSummary(outline, 4, 4, [
    { index: 0, method: 'scaffold1', aha: true, score: 20 },
    { index: 1, method: 'self', aha: false, score: 25 },
    { index: 2, method: 'scaffold1', aha: true, score: 20 },
    { index: 3, method: 'scaffold2', aha: true, score: 15 },
  ], 0)
  assert.equal(sumRows(summary.rows), summary.totalScore)
  assert.equal(summary.totalScore, 80)
  assert.equal(summary.ahaCount, 3)
  assert.ok(summary.rows.every((r) => r.method !== null && r.score > 0))
})

test('outline 이 없으면 유형 4개 균등 배분으로 폴백하고 합은 여전히 맞는다', () => {
  const summary = buildSocraticSummary([], 4, 4, [
    { index: 0, method: 'scaffold1', aha: false, score: 20 },
    { index: 1, method: 'self', aha: false, score: 25 },
    { index: 2, method: 'scaffold1', aha: false, score: 20 },
    { index: 3, method: 'scaffold2', aha: false, score: 15 },
  ])
  assert.equal(sumRows(summary.rows), summary.totalScore)
  assert.equal(summary.totalScore, 80)
  assert.deepEqual(
    summary.rows.map((r) => r.stageKey),
    ['termMemory', 'concept', 'analysisApply', 'judgeDesign'],
  )
})

test('점수가 이물질(문자열/누락)이어도 합계가 NaN 으로 무너지지 않는다', () => {
  const dirty = [
    { index: 0, method: 'self', aha: false, score: undefined },
    { index: 1, method: 'self', aha: false, score: 20 },
  ] as unknown as SocraticCheckpointResult[]
  const summary = buildSocraticSummary(OUTLINE, 2, 2, dirty)
  assert.equal(summary.totalScore, 20)
  assert.equal(sumRows(summary.rows), summary.totalScore)
})

test('stageTotal 0(단계 없는 옛 주제)이면 표를 그리지 않는다', () => {
  assert.deepEqual(buildSocraticCheckpointRows(OUTLINE, 0, 0, RESULTS), [])
})
