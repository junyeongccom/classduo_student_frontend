/**
 * @file useSocraticStore.ts
 * @description 소크라 문답 모드 상태 — 활성 주제/5축 점수/캐릭터 피드백/리더보드/패널
 * @module features/ai-tutor
 * @dependencies zustand
 */
import { create } from 'zustand'
import type {
  SocraticTopic,
  SocraticAxisScores,
  SocraticScoreEvent,
  SocraticStageEvent,
  SocraticProgressEvent,
  SocraticCheckpointResult,
  SocraticStageOutlineItem,
  SocraticLeaderboardEntry,
} from '../types'

const ZERO: SocraticAxisScores = { clarity: 0, accuracy: 0, relevance: 0, depth: 0, reflection: 0 }

interface SocraticState {
  activeTopic: SocraticTopic | null
  axisScores: SocraticAxisScores
  totalScore: number
  lastDeltas: SocraticAxisScores | null
  lastPraise: string
  lastSuggestion: string
  abuseWarning: boolean
  mastered: boolean
  leaderboard: SocraticLeaderboardEntry[]
  isPanelOpen: boolean
  // 유형 4개(용어암기→개념이해→분석과적용→판단과설계) 순차 진행.
  // v5부터 유형당 문항이 1~3개라 stageTotal 은 4~8 가변이다.
  // currentStage === stageTotal 이면 전 단계 통과. stageTotal 0 = 단계 없는 옛 주제.
  currentStage: number
  stageTotal: number
  // v5: 유형별 문항 개요 — 패널이 "용어암기 1/2" 를 그리는 근거. 구 응답에서는 빈 배열(→4노드 폴백).
  stageOutline: SocraticStageOutlineItem[]
  // v4: root→scaffold→retry_root→fallback 세부 진행 상태
  phase: 'root' | 'scaffold' | 'retry_root' | 'fallback'
  scaffoldDepth: number
  // v5: 현재 유형의 디딤돌 깊이 한계(2 또는 3). 0 = 미상/종료 → 패널이 기존 2로 폴백.
  maxScaffoldDepth: number
  // v5: 이제 답해야 할 문항의 유형 정보. 종료 상태·구 응답에서는 null/0.
  checkpointType: string | null
  checkpointLabel: string | null
  typeIndex: number
  typeTotal: number
  ahaCount: number
  checkpointResults: SocraticCheckpointResult[]
  // aha(깨달음) 연출을 표시한 메시지 id 목록 — 중복 연출 방지
  ahaMessageIds: string[]
  setActiveTopic: (t: SocraticTopic | null) => void
  applyScoreEvent: (e: SocraticScoreEvent) => void
  applyStageEvent: (e: SocraticStageEvent) => void
  applyProgressEvent: (e: SocraticProgressEvent) => void
  markAhaMessage: (id: string) => void
  setStage: (currentStage: number, stageTotal: number, stageOutline?: SocraticStageOutlineItem[]) => void
  setLeaderboard: (entries: SocraticLeaderboardEntry[]) => void
  togglePanel: () => void
  reset: () => void
}

const EMPTY_PROGRESS = {
  axisScores: ZERO, totalScore: 0, lastDeltas: null, lastPraise: '', lastSuggestion: '',
  abuseWarning: false, mastered: false, currentStage: 0, stageTotal: 0,
  stageOutline: [] as SocraticStageOutlineItem[],
  phase: 'root' as const, scaffoldDepth: 0, maxScaffoldDepth: 0,
  checkpointType: null, checkpointLabel: null, typeIndex: 0, typeTotal: 0,
  ahaCount: 0, checkpointResults: [] as SocraticCheckpointResult[],
  ahaMessageIds: [] as string[],
}

export const useSocraticStore = create<SocraticState>((set) => ({
  activeTopic: null, ...EMPTY_PROGRESS, leaderboard: [], isPanelOpen: false,
  setActiveTopic: (t) => set({
    ...EMPTY_PROGRESS,
    activeTopic: t,
    isPanelOpen: t != null,
    stageTotal: t?.stage_total ?? 0,
    stageOutline: t?.stage_outline ?? [],
  }),
  applyScoreEvent: (e) => set((s) => ({
    axisScores: e.axis_scores ?? s.axisScores,
    totalScore: e.total_score,
    lastDeltas: e.applied_deltas ?? s.lastDeltas,
    lastPraise: e.praise,
    lastSuggestion: e.suggestion,
    abuseWarning: e.abuse,
    mastered: e.mastered,
  })),
  applyStageEvent: (e) => set({ currentStage: e.current_stage, stageTotal: e.stage_total }),
  // v5 신규 필드는 전부 additive라 구 백엔드에서는 undefined로 들어온다.
  // 또 문답이 끝난 상태(checkpoint_index === checkpoint_total)에서는 서버가 null/0을 보낸다 —
  // 두 경우 모두 0/null로 눕히고, 표시 폴백은 패널이 담당한다(stageOutline은 주제에서 온 값이라 보존).
  applyProgressEvent: (e) => set({
    currentStage: e.checkpoint_index,
    stageTotal: e.checkpoint_total,
    totalScore: e.total_score,
    mastered: e.mastered,
    phase: e.phase,
    scaffoldDepth: e.scaffold_depth,
    maxScaffoldDepth: e.max_scaffold_depth ?? 0,
    checkpointType: e.checkpoint_type ?? null,
    checkpointLabel: e.checkpoint_label ?? null,
    typeIndex: e.type_index ?? 0,
    typeTotal: e.type_total ?? 0,
    ahaCount: e.aha_count,
    checkpointResults: e.checkpoint_results,
  }),
  markAhaMessage: (id) => set((s) => (
    s.ahaMessageIds.includes(id) ? s : { ahaMessageIds: [...s.ahaMessageIds, id] }
  )),
  // 세션 복원 경로. outline은 서버가 주면 덮어쓰고, 없으면(구 백엔드) 기존 값을 유지한다.
  setStage: (currentStage, stageTotal, stageOutline) => set(
    stageOutline && stageOutline.length > 0
      ? { currentStage, stageTotal, stageOutline }
      : { currentStage, stageTotal },
  ),
  setLeaderboard: (entries) => set({ leaderboard: entries }),
  togglePanel: () => set((s) => ({ isPanelOpen: !s.isPanelOpen })),
  reset: () => set({ ...EMPTY_PROGRESS, activeTopic: null, isPanelOpen: false }),
}))
