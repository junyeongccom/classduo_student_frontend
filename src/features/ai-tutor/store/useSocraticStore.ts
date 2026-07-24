/**
 * @file useSocraticStore.ts
 * @description 소크라 문답 모드 상태 — 활성 주제/5축 점수/캐릭터 피드백/리더보드/패널
 * @module features/ai-tutor
 * @dependencies zustand
 */
import { create } from 'zustand'
import type { SocraticTopic, SocraticAxisScores, SocraticScoreEvent, SocraticLeaderboardEntry } from '../types'

const ZERO: SocraticAxisScores = { concept: 0, example: 0, logic: 0, self_awareness: 0, exploration: 0 }

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
  setActiveTopic: (t: SocraticTopic | null) => void
  applyScoreEvent: (e: SocraticScoreEvent) => void
  setLeaderboard: (entries: SocraticLeaderboardEntry[]) => void
  togglePanel: () => void
  reset: () => void
}

export const useSocraticStore = create<SocraticState>((set) => ({
  activeTopic: null, axisScores: ZERO, totalScore: 0,
  lastDeltas: null, lastPraise: '', lastSuggestion: '',
  abuseWarning: false, mastered: false, leaderboard: [], isPanelOpen: false,
  setActiveTopic: (t) => set({ activeTopic: t, isPanelOpen: t != null, axisScores: ZERO, totalScore: 0, lastDeltas: null, lastPraise: '', lastSuggestion: '', abuseWarning: false, mastered: false }),
  applyScoreEvent: (e) => set({ axisScores: e.axis_scores, totalScore: e.total_score, lastDeltas: e.applied_deltas, lastPraise: e.praise, lastSuggestion: e.suggestion, abuseWarning: e.abuse, mastered: e.mastered }),
  setLeaderboard: (entries) => set({ leaderboard: entries }),
  togglePanel: () => set((s) => ({ isPanelOpen: !s.isPanelOpen })),
  reset: () => set({ activeTopic: null, axisScores: ZERO, totalScore: 0, lastDeltas: null, lastPraise: '', lastSuggestion: '', abuseWarning: false, mastered: false, isPanelOpen: false }),
}))
