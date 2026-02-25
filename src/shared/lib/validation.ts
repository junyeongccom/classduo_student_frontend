/**
 * @file validation.ts
 * @description 공통 입력 검증 유틸리티
 * @module shared/lib
 * @dependencies 없음
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUUID(value: string): boolean {
  return UUID_REGEX.test(value)
}
