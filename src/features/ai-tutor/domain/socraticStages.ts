/**
 * @file socraticStages.ts
 * @description 소크라 문답 유형(4종) 상수 + 유형 블록/체크포인트 행/요약 총점 계산 — 점수 패널·인쇄 기록 공용
 * @module features/ai-tutor/domain
 * @dependencies features/ai-tutor/types
 */
import type { SocraticCheckpointResult, SocraticStageOutlineItem } from '../types'

// 문답 진행 유형 4종 — 백엔드 stage_questions 의 유형 블록 순서와 동일해야 한다.
// v5부터 유형은 그대로 4개지만 유형 안의 질문이 1~3개로 가변이다(총 4~8문항).
export const STAGE_KEYS = ['termMemory', 'concept', 'analysisApply', 'judgeDesign'] as const
export type StageKey = (typeof STAGE_KEYS)[number]

// 백엔드 stage type → i18n 키. 서버 label(한국어 고정)보다 i18n 라벨을 우선한다(영어 UI 대응).
export const TYPE_TO_STAGE_KEY: Record<string, StageKey> = {
  TERM_MEMORY: 'termMemory',
  CONCEPT: 'concept',
  ANALYSIS_APPLY: 'analysisApply',
  JUDGE_DESIGN: 'judgeDesign',
}

export type CheckpointMethod = SocraticCheckpointResult['method']

export interface StageBlock {
  key: StageKey
  count: number
  start: number
}

/**
 * 패널·인쇄물에 그릴 유형 블록 4개를 만든다.
 *
 * 1순위는 서버 `stage_outline`(유형/문항수/시작인덱스). 구 백엔드·구 주제라 outline 이 없으면
 * stageTotal 을 유형 4개에 균등 배분해 폴백한다 — stageTotal 이 4면 유형당 1문항이 되어
 * v4 표현과 완전히 같아진다.
 */
export function buildStageBlocks(
  outline: SocraticStageOutlineItem[], stageTotal: number,
): StageBlock[] {
  const fromOutline = outline
    .filter((b) => b && b.count > 0 && TYPE_TO_STAGE_KEY[String(b.type ?? '').toUpperCase()])
    .map((b) => ({
      key: TYPE_TO_STAGE_KEY[String(b.type ?? '').toUpperCase()],
      count: b.count,
      start: b.start_index,
    }))
  if (fromOutline.length > 0) return fromOutline

  // 폴백: 유형별 문항 수를 모르므로 균등 배분(나머지는 앞 유형에). 백엔드 배점 배분과 같은 규칙.
  const total = Math.max(0, stageTotal)
  const base = Math.floor(total / STAGE_KEYS.length)
  const remainder = total % STAGE_KEYS.length
  let cursor = 0
  return STAGE_KEYS.map((key, i) => {
    const count = base + (i < remainder ? 1 : 0)
    const block = { key, count, start: cursor }
    cursor += count
    return block
  }).filter((b) => b.count > 0)
}

/** 인쇄용 체크포인트 한 줄 — 우측 패널이 이미 화면에 노출하는 값만 담는다(내부 판정값 제외). */
export interface SocraticCheckpointRow {
  /** 0-based 체크포인트 인덱스 */
  index: number
  /** 유형 i18n 키. outline·폴백 어느 쪽으로도 유형을 특정 못하면 null */
  stageKey: StageKey | null
  /** 유형 내 순번 (1-based) */
  positionInStage: number
  /** 유형 내 문항 수 */
  stageCount: number
  passed: boolean
  /** 통과 방식. 세션 복원 등으로 결과가 유실됐지만 통과한 경우 null(방식 미상) */
  method: CheckpointMethod | null
  score: number
  aha: boolean
}

/**
 * 체크포인트별 인쇄 행을 만든다.
 *
 * 복원 포함 정상 경로에서는 checkpoint_results 가 전 구간 채워진다(store.restoreProgress).
 * 그래도 결과가 결측인 구 세션이 있을 수 있어, currentStage 보다 앞선 체크포인트는
 * 패널과 같은 규칙으로 "방식 미상 통과"(method null, 0점)로 표시해 미통과로 퇴행시키지 않는다.
 */
export function buildSocraticCheckpointRows(
  outline: SocraticStageOutlineItem[],
  stageTotal: number,
  currentStage: number,
  results: SocraticCheckpointResult[],
): SocraticCheckpointRow[] {
  const total = Math.max(0, stageTotal)
  if (total === 0) return []

  const blocks = buildStageBlocks(outline, total)
  const resultByIndex = new Map<number, SocraticCheckpointResult>(
    results.map((r) => [r.index, r]),
  )

  return Array.from({ length: total }, (_, index) => {
    const block = blocks.find((b) => index >= b.start && index < b.start + b.count)
    const result = resultByIndex.get(index)
    const passed = !!result || index < currentStage
    return {
      index,
      stageKey: block?.key ?? null,
      positionInStage: block ? index - block.start + 1 : 1,
      stageCount: block?.count ?? 1,
      passed,
      method: result?.method ?? null,
      score: Number.isFinite(result?.score) ? Number(result?.score) : 0,
      aha: result?.aha ?? false,
    }
  })
}

/** 요약표 한 벌 — 총점·아하 횟수를 표의 행에서 파생시켜 "합이 총점과 다른" 상태가 생기지 않게 한다. */
export interface SocraticSummary {
  rows: SocraticCheckpointRow[]
  /** Σ(행 점수) − 어뷰징 감점, 바닥 0. 백엔드 compute_total 과 같은 식이다. */
  totalScore: number
  ahaCount: number
}

/**
 * 요약표에 필요한 값을 한 함수에서 만든다.
 *
 * 총점을 서버 값(store.totalScore)에서 따로 가져오면 단계별 점수와 출처가 갈라져
 * "단계 0점 × 4 + 총점 80" 같은 모순이 인쇄물에 그대로 찍힌다. 그래서 총점·아하 횟수를
 * 모두 rows 에서 파생시킨다 — 서버 총점과 같은 식(Σ점수 − 감점, 바닥 0)이라 값도 일치한다.
 */
export function buildSocraticSummary(
  outline: SocraticStageOutlineItem[],
  stageTotal: number,
  currentStage: number,
  results: SocraticCheckpointResult[],
  penalty = 0,
): SocraticSummary {
  const rows = buildSocraticCheckpointRows(outline, stageTotal, currentStage, results)
  const scoreSum = rows.reduce((sum, r) => sum + r.score, 0)
  const penaltyValue = Number.isFinite(penalty) ? Number(penalty) : 0
  return {
    rows,
    totalScore: Math.max(0, scoreSum - penaltyValue),
    ahaCount: rows.filter((r) => r.aha).length,
  }
}
