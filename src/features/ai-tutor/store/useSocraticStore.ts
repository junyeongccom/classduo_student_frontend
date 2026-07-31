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
  // 4단계 순차 진행 (용어암기→개념이해→분석과적용→판단과설계).
  // currentStage === stageTotal 이면 전 단계 통과. stageTotal 0 = 단계 없는 옛 주제.
  currentStage: number
  stageTotal: number
  // v4: root→scaffold→retry_root→fallback 세부 진행 상태
  phase: 'root' | 'scaffold' | 'retry_root' | 'fallback'
  scaffoldDepth: number
  ahaCount: number
  checkpointResults: SocraticCheckpointResult[]
  // aha(깨달음) 연출을 표시한 메시지 id 목록 — 중복 연출 방지
  ahaMessageIds: string[]
  setActiveTopic: (t: SocraticTopic | null) => void
  applyScoreEvent: (e: SocraticScoreEvent) => void
  applyStageEvent: (e: SocraticStageEvent) => void
  applyProgressEvent: (e: SocraticProgressEvent) => void
  markAhaMessage: (id: string) => void
  setStage: (currentStage: number, stageTotal: number) => void
  setLeaderboard: (entries: SocraticLeaderboardEntry[]) => void
  togglePanel: () => void
  reset: () => void
}

const EMPTY_PROGRESS = {
  axisScores: ZERO, totalScore: 0, lastDeltas: null, lastPraise: '', lastSuggestion: '',
  abuseWarning: false, mastered: false, currentStage: 0, stageTotal: 0,
  phase: 'root' as const, scaffoldDepth: 0, ahaCount: 0, checkpointResults: [] as SocraticCheckpointResult[],
  ahaMessageIds: [] as string[],
}

export const useSocraticStore = create<SocraticState>((set) => ({
  activeTopic: null, ...EMPTY_PROGRESS, leaderboard: [], isPanelOpen: false,
  setActiveTopic: (t) => set({ ...EMPTY_PROGRESS, activeTopic: t, isPanelOpen: t != null, stageTotal: t?.stage_total ?? 0 }),
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
  applyProgressEvent: (e) => set({
    currentStage: e.checkpoint_index,
    stageTotal: e.checkpoint_total,
    totalScore: e.total_score,
    mastered: e.mastered,
    phase: e.phase,
    scaffoldDepth: e.scaffold_depth,
    ahaCount: e.aha_count,
    checkpointResults: e.checkpoint_results,
  }),
  markAhaMessage: (id) => set((s) => (
    s.ahaMessageIds.includes(id) ? s : { ahaMessageIds: [...s.ahaMessageIds, id] }
  )),
  setStage: (currentStage, stageTotal) => set({ currentStage, stageTotal }),
  setLeaderboard: (entries) => set({ leaderboard: entries }),
  togglePanel: () => set((s) => ({ isPanelOpen: !s.isPanelOpen })),
  reset: () => set({ ...EMPTY_PROGRESS, activeTopic: null, isPanelOpen: false }),
}))
