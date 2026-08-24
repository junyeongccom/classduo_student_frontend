/**
 * @file resolveConsentState.test.ts
 * @description 동의 체크 상태 판정·payload 변환 회귀 테스트 (필수 동의 게이트 신뢰도 직결)
 * @module features/consent/domain
 * @dependencies node:test, resolveConsentState
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  REQUIRED_CONSENT_CODES,
  buildConsentPayload,
  findMissingRequired,
  isAllChecked,
  setAllChecked,
  sortDocuments,
} from './resolveConsentState.ts'
import type { ConsentDocument } from '../types.ts'

const DOCS: ConsentDocument[] = [
  { code: 'privacy', version: '2026-09-01', title_ko: '개인정보', title_en: 'Privacy', is_required: true, display_order: 2, document_path: '/privacy' },
  { code: 'terms_of_service', version: '2026-09-01', title_ko: '이용약관', title_en: 'Terms', is_required: true, display_order: 1, document_path: '/terms' },
  { code: 'research_use', version: '2026-09-01', title_ko: '연구 이용', title_en: 'Research', is_required: false, display_order: 5, document_path: '/privacy' },
  { code: 'age_14', version: '2026-09-01', title_ko: '만14세', title_en: 'Age 14', is_required: true, display_order: 4, document_path: null },
  { code: 'overseas_transfer', version: '2026-09-01', title_ko: '국외이전', title_en: 'Overseas', is_required: true, display_order: 3, document_path: '/privacy' },
]

const ALL_TRUE = {
  terms_of_service: true, privacy: true, overseas_transfer: true, age_14: true, research_use: true,
}

test('필수 코드는 4종으로 고정', () => {
  assert.deepEqual([...REQUIRED_CONSENT_CODES], [
    'terms_of_service', 'privacy', 'overseas_transfer', 'age_14',
  ])
})

test('sortDocuments는 display_order 오름차순', () => {
  assert.deepEqual(sortDocuments(DOCS).map((d) => d.code), [
    'terms_of_service', 'privacy', 'overseas_transfer', 'age_14', 'research_use',
  ])
})

test('sortDocuments는 원본 배열을 변형하지 않는다', () => {
  const before = DOCS.map((d) => d.code)
  sortDocuments(DOCS)
  assert.deepEqual(DOCS.map((d) => d.code), before)
})

test('findMissingRequired는 미체크 필수를 순서대로 반환', () => {
  assert.deepEqual(findMissingRequired({ privacy: true }), [
    'terms_of_service', 'overseas_transfer', 'age_14',
  ])
})

test('findMissingRequired는 모두 체크되면 빈 배열', () => {
  assert.deepEqual(findMissingRequired(ALL_TRUE), [])
})

test('findMissingRequired는 선택 항목 미체크를 무시', () => {
  assert.deepEqual(findMissingRequired({ ...ALL_TRUE, research_use: false }), [])
})

test('buildConsentPayload는 문서에 있는 모든 코드를 boolean으로 채운다', () => {
  const payload = buildConsentPayload(DOCS, { terms_of_service: true })
  assert.equal(payload.length, 5)
  assert.deepEqual(payload.find((p) => p.code === 'terms_of_service'), { code: 'terms_of_service', agreed: true })
  assert.deepEqual(payload.find((p) => p.code === 'research_use'), { code: 'research_use', agreed: false })
})

test('buildConsentPayload는 display_order 순서를 따른다', () => {
  assert.deepEqual(buildConsentPayload(DOCS, ALL_TRUE).map((p) => p.code), [
    'terms_of_service', 'privacy', 'overseas_transfer', 'age_14', 'research_use',
  ])
})

test('buildConsentPayload는 문서에 없는 코드를 내보내지 않는다', () => {
  const payload = buildConsentPayload([DOCS[0]], ALL_TRUE)
  assert.deepEqual(payload, [{ code: 'privacy', agreed: true }])
})

test('isAllChecked는 선택 항목까지 모두 체크돼야 true', () => {
  assert.equal(isAllChecked(DOCS, ALL_TRUE), true)
  assert.equal(isAllChecked(DOCS, { ...ALL_TRUE, research_use: false }), false)
})

test('setAllChecked(true)는 모든 코드를 true로', () => {
  assert.deepEqual(setAllChecked(DOCS, true), ALL_TRUE)
})

test('setAllChecked(false)는 모든 코드를 false로', () => {
  assert.deepEqual(setAllChecked(DOCS, false), {
    terms_of_service: false, privacy: false, overseas_transfer: false, age_14: false, research_use: false,
  })
})
