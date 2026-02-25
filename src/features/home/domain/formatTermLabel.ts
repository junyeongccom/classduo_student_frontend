/**
 * @file formatTermLabel.ts
 * @description 학기 정보를 사람이 읽을 수 있는 라벨로 변환
 * @module features/home/domain
 * @dependencies 없음 (순수 함수)
 */

import type { AcademicTerm, TermCode } from '../types'

const TERM_LABELS_KO: Record<TermCode, string> = {
  SPRING: '1학기',
  SUMMER: '여름학기',
  FALL: '2학기',
  WINTER: '겨울학기',
}

const TERM_LABELS_EN: Record<TermCode, string> = {
  SPRING: 'Spring',
  SUMMER: 'Summer',
  FALL: 'Fall',
  WINTER: 'Winter',
}

/**
 * AcademicTerm을 사람이 읽을 수 있는 라벨로 변환
 * ko: "2026년 1학기"
 * en: "2026 Spring"
 */
export function formatTermLabel(term: AcademicTerm, locale: string): string {
  if (locale === 'en') {
    return `${term.year} ${TERM_LABELS_EN[term.termCode]}`
  }
  return `${term.year}년 ${TERM_LABELS_KO[term.termCode]}`
}
