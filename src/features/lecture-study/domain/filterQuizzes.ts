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

/** '선별 풀기' 모드에서 인지유형 1종당 뽑는 문항 수 (4유형 × 5 = SELECTED_SCOPE_LIMIT) */
export const SELECTED_SCOPE_PER_TYPE = 5

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
 * '선별 풀기' 표본 추출 — 인지유형마다 앞에서부터 SELECTED_SCOPE_PER_TYPE 문항씩.
 *
 * 앞에서부터 20개를 그냥 자르면 문항 수가 많은 유형(개념이해 25문항 등)이 앞을 다 차지해
 * 뒤쪽 유형이 한 문제도 안 나온다. 유형별로 고르게 뽑아 4유형을 모두 접하게 한다.
 * 유형별 문항이 5개보다 적으면 있는 만큼만 — 부족분을 다른 유형에서 채우지 않는다
 * (유형 간 균형이 이 모드의 목적이므로 총합이 20 미만이 될 수 있다).
 */
function pickBalancedByType(
  quizzes: readonly InstructorQuizItem[],
): InstructorQuizItem[] {
  const picked: InstructorQuizItem[] = []
  for (const section of groupQuizzesByType(quizzes)) {
    picked.push(...section.items.slice(0, SELECTED_SCOPE_PER_TYPE))
  }
  return picked
}

/**
 * 필터 + 풀이 범위를 적용한 최종 섹션 목록.
 * 'selected' 모드는 인지유형별로 앞 SELECTED_SCOPE_PER_TYPE 문항씩만 남긴다(결정론적).
 */
export function buildQuizSections(
  quizzes: readonly InstructorQuizItem[],
  filter: QuizFilterState,
  bookmarkSet: ReadonlySet<string>,
  scope: QuizScopeMode,
): QuizSectionsResult {
  const filtered = filterQuizzes(quizzes, filter, bookmarkSet)
  const ordered = groupQuizzesByType(filtered).flatMap((section) => section.items)
  const visible = scope === 'selected' ? pickBalancedByType(filtered) : ordered

  return {
    sections: groupQuizzesByType(visible),
    filteredCount: filtered.length,
    visibleCount: visible.length,
  }
}

/* ────────────────────────────────────────────────────────────────
   자료 슬라이드 페이지 ↔ 강의자료 매핑

   퀴즈의 source_pages 는 **여러 자료를 이어붙인 전역 페이지 번호**다.
   (LeftPanelMaterials 가 자료들을 파일명 자연정렬 순으로 concat 해 한 뷰어로 보여주고,
    뷰어 표기도 `현재 / 전체(=합계)` 이므로 번호 자체는 전역이 맞다.)

   문제는 필터에서 번호만 나열하면 "41p" 가 어느 자료의 41쪽인지 알 수 없다는 것.
   그래서 자료별 누적 오프셋으로 구간을 나눠 **자료명 아래에 묶어** 보여준다.
   칩의 숫자는 뷰어와 맞도록 전역 번호를 그대로 쓰고, 자료 내 쪽번호를 함께 곁들인다.
   ──────────────────────────────────────────────────────────────── */

/** 페이지 구간 계산에 필요한 자료 최소 정보 (SnapshotMaterialItem 의 부분집합) */
export interface QuizSourceMaterial {
  material_id: string
  original_filename: string | null
  total_pages: number | null
}

/** 자료 1건 + 그 자료 구간에 속하는 전역 페이지 번호들 */
export interface QuizSourcePageGroup {
  materialId: string
  /** 표시용 자료명 (없으면 호출측에서 폴백 문구 사용) */
  name: string | null
  /** 이 자료의 첫 페이지가 전역에서 갖는 번호 - 1 (= 앞선 자료들의 페이지 합) */
  offset: number
  /** 이 자료 구간에 속한 전역 페이지 번호 (오름차순) */
  pages: number[]
}

/**
 * 강의자료 표시 순서 — LeftPanelMaterials 와 동일 규칙(파일명 자연정렬, 이름 없으면 뒤로).
 * 뷰어의 concat 순서와 어긋나면 페이지 구간이 통째로 밀리므로 반드시 같은 규칙을 쓴다.
 */
export function sortMaterialsForDisplay<T extends QuizSourceMaterial>(materials: readonly T[]): T[] {
  return [...materials].sort((a, b) => {
    const an = a.original_filename ?? ''
    const bn = b.original_filename ?? ''
    if (!an && !bn) return 0
    if (!an) return 1
    if (!bn) return -1
    return an.localeCompare(bn, 'ko', { numeric: true, sensitivity: 'base' })
  })
}

/**
 * 전역 페이지 번호 목록을 자료별 그룹으로 분해한다.
 *
 * @param pages     퀴즈들이 인용한 전역 페이지 번호 (getAvailableSourcePages 결과)
 * @param materials 회차 강의자료 목록 (정렬 전이어도 됨 — 내부에서 표시 순서로 정렬)
 * @returns 페이지가 하나라도 걸린 자료만, 표시 순서대로. 어느 구간에도 속하지 않는
 *          페이지(자료 메타 누락·total_pages 결측 등)는 materialId '' 인 마지막 그룹으로 모은다.
 */
export function buildSourcePageGroups(
  pages: readonly number[],
  materials: readonly QuizSourceMaterial[],
): QuizSourcePageGroup[] {
  const sorted = sortMaterialsForDisplay(materials)
  const ranges: { material: QuizSourceMaterial; start: number; end: number; offset: number }[] = []
  let offset = 0
  for (const material of sorted) {
    const count = material.total_pages ?? 0
    if (count > 0) {
      ranges.push({ material, start: offset + 1, end: offset + count, offset })
      offset += count
    }
  }

  const groups = new Map<string, QuizSourcePageGroup>()
  const orphans: number[] = []
  for (const page of [...pages].sort((a, b) => a - b)) {
    const hit = ranges.find((r) => page >= r.start && page <= r.end)
    if (!hit) {
      orphans.push(page)
      continue
    }
    const existing = groups.get(hit.material.material_id)
    if (existing) {
      existing.pages.push(page)
    } else {
      groups.set(hit.material.material_id, {
        materialId: hit.material.material_id,
        name: hit.material.original_filename,
        offset: hit.offset,
        pages: [page],
      })
    }
  }

  // 표시 순서 = 자료 정렬 순서
  const result: QuizSourcePageGroup[] = []
  for (const range of ranges) {
    const group = groups.get(range.material.material_id)
    if (group) result.push(group)
  }
  if (orphans.length > 0) {
    result.push({ materialId: '', name: null, offset: 0, pages: orphans })
  }
  return result
}
