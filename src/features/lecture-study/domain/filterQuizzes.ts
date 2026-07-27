/**
 * @file filterQuizzes.ts
 * @description 회차 퀴즈 목록의 클라이언트 필터(인지유형·문제유형·즐겨찾기·슬라이드 페이지)와 풀이 범위 계산 순수 함수
 * @module features/lecture-study/domain
 * @dependencies services/instructorQuizService (타입만)
 */

import type {
  InstructorQuizItem,
  InstructorQuizType,
} from '../services/instructorQuizService'

/**
 * 섹션 노출 순서 — 신규 4유형(2026-07 개편) 우선, 레거시 유형은 뒤에.
 * 레거시 유형은 기존 미재생성 회차 호환을 위해 계속 유지한다.
 */
export const TYPE_ORDER: InstructorQuizType[] = [
  // 신규 4유형: 용어암기 → 개념이해 → 분석과적용 → 판단과설계
  'TERM_MEMORY',
  'CONCEPT',
  'ANALYSIS_APPLY',
  'JUDGE_DESIGN',
  // 레거시 — 기존 미재생성 회차 호환 (재생성 전까지 계속 노출)
  'DEF_TO_TERM',
  'TERM_TO_DEF',
  'STRUCTURE_OBJ',
  'MISCONCEPTION',
]

/** 문제 유형(객관식/서술형) */
export type QuizAnswerFormat = 'multiple_choice' | 'essay'

/** 풀이 범위 모드 — selected: 선별 N문항만, all: 전체 */
export type QuizScopeMode = 'selected' | 'all'

/** '선별 풀기' 모드에서 노출하는 최대 문항 수 */
export const SELECTED_SCOPE_LIMIT = 20

/** 선택 가능한 문제 유형 (칩 노출 순서) */
export const ANSWER_FORMAT_ORDER: QuizAnswerFormat[] = ['multiple_choice', 'essay']

/**
 * answer_format 이 비어 있는 레거시 로우에서 서술형으로 취급할 인지유형.
 * StudentQuizCard 의 isEssay 판정과 동일 기준을 유지해야 한다.
 */
const ESSAY_FALLBACK_TYPES: InstructorQuizType[] = ['ANALYSIS_APPLY', 'JUDGE_DESIGN']

export interface QuizFilterState {
  /** 인지유형 (빈 배열 = 전체) */
  types: InstructorQuizType[]
  /** 문제유형 (빈 배열 = 전체) */
  formats: QuizAnswerFormat[]
  /** 즐겨찾기한 문항만 */
  bookmarkedOnly: boolean
  /** 자료 슬라이드 페이지 번호 (빈 배열 = 전체) */
  pages: number[]
}

export const EMPTY_QUIZ_FILTER: QuizFilterState = {
  types: [],
  formats: [],
  bookmarkedOnly: false,
  pages: [],
}

export interface QuizTypeSection {
  type: InstructorQuizType
  items: InstructorQuizItem[]
}

export interface QuizSectionsResult {
  /** 유형별 섹션 (비어 있는 섹션은 포함하지 않음) */
  sections: QuizTypeSection[]
  /** 필터를 통과한 문항 수 (풀이 범위 제한 이전) */
  filteredCount: number
  /** 실제 노출되는 문항 수 (풀이 범위 제한 이후) */
  visibleCount: number
}

/**
 * 문항의 문제유형 판정 — answer_format 우선, 없으면 quiz_type 폴백.
 * (StudentQuizCard 의 isEssay 판정과 동일 기준)
 */
export function resolveQuizFormat(quiz: InstructorQuizItem): QuizAnswerFormat {
  if (quiz.answer_format === 'essay') return 'essay'
  if (ESSAY_FALLBACK_TYPES.includes(quiz.quiz_type)) return 'essay'
  return 'multiple_choice'
}

/** 문항이 참조하는 자료 슬라이드 페이지 번호 (유효한 숫자만) */
function getSourcePages(quiz: InstructorQuizItem): number[] {
  const pages = quiz.source?.source_pages ?? []
  return pages.filter((p) => Number.isFinite(p))
}

/** 실제 존재하는 인지유형만 TYPE_ORDER 순서로 반환 */
export function getAvailableQuizTypes(
  quizzes: readonly InstructorQuizItem[],
): InstructorQuizType[] {
  const present = new Set(quizzes.map((q) => q.quiz_type))
  return TYPE_ORDER.filter((type) => present.has(type))
}

/** 실제 존재하는 문제유형만 반환 */
export function getAvailableQuizFormats(
  quizzes: readonly InstructorQuizItem[],
): QuizAnswerFormat[] {
  const present = new Set(quizzes.map(resolveQuizFormat))
  return ANSWER_FORMAT_ORDER.filter((format) => present.has(format))
}

/** 문항들이 실제 참조하는 슬라이드 페이지 번호를 중복 제거 + 오름차순으로 반환 */
export function getAvailableSourcePages(
  quizzes: readonly InstructorQuizItem[],
): number[] {
  const pageSet = new Set<number>()
  for (const quiz of quizzes) {
    for (const page of getSourcePages(quiz)) pageSet.add(page)
  }
  return Array.from(pageSet).sort((a, b) => a - b)
}

/** 필터가 하나라도 걸려 있는지 */
export function isQuizFilterActive(filter: QuizFilterState): boolean {
  return (
    filter.types.length > 0 ||
    filter.formats.length > 0 ||
    filter.pages.length > 0 ||
    filter.bookmarkedOnly
  )
}

/** 적용된 필터 조건 개수 (뱃지 표시용) */
export function countActiveQuizFilters(filter: QuizFilterState): number {
  return (
    filter.types.length +
    filter.formats.length +
    filter.pages.length +
    (filter.bookmarkedOnly ? 1 : 0)
  )
}

/** 다중 선택 토글 헬퍼 — 포함되어 있으면 제거, 아니면 추가 */
export function toggleFilterValue<T>(values: readonly T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((v) => v !== value)
    : [...values, value]
}

/**
 * 단일 문항의 필터 통과 여부.
 * 필터 종류 간에는 AND, 같은 필터 안의 다중 선택은 OR 로 판정한다.
 */
export function matchesQuizFilter(
  quiz: InstructorQuizItem,
  filter: QuizFilterState,
  bookmarkSet: ReadonlySet<string>,
): boolean {
  if (filter.types.length > 0 && !filter.types.includes(quiz.quiz_type)) return false
  if (filter.formats.length > 0 && !filter.formats.includes(resolveQuizFormat(quiz))) return false
  if (filter.bookmarkedOnly && !bookmarkSet.has(quiz.quiz_id)) return false
  if (filter.pages.length > 0) {
    const pages = getSourcePages(quiz)
    if (!pages.some((page) => filter.pages.includes(page))) return false
  }
  return true
}

/** 필터를 통과한 문항만 원본 순서대로 반환 */
export function filterQuizzes(
  quizzes: readonly InstructorQuizItem[],
  filter: QuizFilterState,
  bookmarkSet: ReadonlySet<string>,
): InstructorQuizItem[] {
  return quizzes.filter((quiz) => matchesQuizFilter(quiz, filter, bookmarkSet))
}

/** TYPE_ORDER 순서로 유형별 그룹화 (빈 그룹 제외) */
export function groupQuizzesByType(
  quizzes: readonly InstructorQuizItem[],
): QuizTypeSection[] {
  const sections: QuizTypeSection[] = []
  for (const type of TYPE_ORDER) {
    const items = quizzes.filter((quiz) => quiz.quiz_type === type)
    if (items.length > 0) sections.push({ type, items })
  }
  return sections
}

/**
 * 필터 + 풀이 범위를 적용한 최종 섹션 목록.
 * 'selected' 모드는 화면 노출 순서(TYPE_ORDER 기준) 기준 앞 SELECTED_SCOPE_LIMIT 문항만 남긴다(결정론적).
 */
export function buildQuizSections(
  quizzes: readonly InstructorQuizItem[],
  filter: QuizFilterState,
  bookmarkSet: ReadonlySet<string>,
  scope: QuizScopeMode,
): QuizSectionsResult {
  const filtered = filterQuizzes(quizzes, filter, bookmarkSet)
  const ordered = groupQuizzesByType(filtered).flatMap((section) => section.items)
  const visible =
    scope === 'selected' ? ordered.slice(0, SELECTED_SCOPE_LIMIT) : ordered

  return {
    sections: groupQuizzesByType(visible),
    filteredCount: filtered.length,
    visibleCount: visible.length,
  }
}
