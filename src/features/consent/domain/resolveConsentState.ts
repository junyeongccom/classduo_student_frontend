/**
 * @file resolveConsentState.ts
 * @description 동의 체크 상태 → 필수 누락 판정·API payload 변환 (순수 함수)
 * @module features/consent/domain
 * @dependencies types
 */
import type { ConsentAnswer, ConsentChecked, ConsentCode, ConsentDocument } from '../types'

/**
 * 필수 4종. 서버 응답의 is_required 가 아니라 이 상수가 프론트 게이트의 기준이다 —
 * 서버 데이터가 잘못돼도 필수 동의가 조용히 풀리면 안 되기 때문이다.
 * 서버의 is_required 는 화면 배지 표시에만 쓴다.
 */
export const REQUIRED_CONSENT_CODES: readonly ConsentCode[] = [
  'terms_of_service',
  'privacy',
  'overseas_transfer',
  'age_14',
] as const

/** display_order 오름차순 정렬 (원본 불변) */
export function sortDocuments(documents: ConsentDocument[]): ConsentDocument[] {
  return [...documents].sort((a, b) => a.display_order - b.display_order)
}

/** 체크되지 않은 필수 코드를 REQUIRED_CONSENT_CODES 순서대로 반환 */
export function findMissingRequired(checked: ConsentChecked): ConsentCode[] {
  return REQUIRED_CONSENT_CODES.filter((code) => !checked[code])
}

/** 문서에 존재하는 코드만, display_order 순서로 API payload 생성 */
export function buildConsentPayload(
  documents: ConsentDocument[],
  checked: ConsentChecked
): ConsentAnswer[] {
  return sortDocuments(documents).map((doc) => ({
    code: doc.code,
    agreed: checked[doc.code] === true,
  }))
}

/** 선택 항목까지 전부 체크됐는지 (전체 동의 마스터 체크박스 상태) */
export function isAllChecked(
  documents: ConsentDocument[],
  checked: ConsentChecked
): boolean {
  return documents.length > 0 && documents.every((doc) => checked[doc.code] === true)
}

/** 모든 코드를 같은 값으로 설정 (전체 동의 토글) */
export function setAllChecked(
  documents: ConsentDocument[],
  value: boolean
): ConsentChecked {
  const result: ConsentChecked = {}
  for (const doc of documents) {
    result[doc.code] = value
  }
  return result
}
