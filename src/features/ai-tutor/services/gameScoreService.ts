/**
 * Game Score Service
 * 게임 점수 제출, 리더보드, 닉네임 API 호출
 */
import { apiRequest } from '@/shared/lib/api'

interface ScoreSubmitPayload {
  lecture_id: string
  score: number
  correct_count: number
  wrong_count: number
  skipped_count: number
  elapsed_ms: number
  hmac_hash: string
  nonce: string
  timestamp: number
}

interface ScoreSubmitResponse {
  success: boolean
  score_id?: string
}

export interface LeaderboardEntry {
  rank: number
  nickname?: string
  score: number
  correct_count: number
  wrong_count: number
  skipped_count: number
  is_current_user: boolean
}

interface LeaderboardResponse {
  lecture_id: string
  entries: LeaderboardEntry[]
  user_best: LeaderboardEntry | null
  total_players: number
}

interface NicknameResponse {
  nickname: string | null
}

export const gameScoreService = {
  async submitScore(payload: ScoreSubmitPayload) {
    return apiRequest<ScoreSubmitResponse>('/api/game/scores', {
      method: 'POST',
      body: payload,
      auth: true,
    })
  },

  async getLeaderboard(lectureId: string) {
    return apiRequest<LeaderboardResponse>(`/api/game/leaderboard/${lectureId}`, {
      auth: true,
    })
  },

  async getNickname() {
    return apiRequest<NicknameResponse>('/api/game/nickname', {
      auth: true,
    })
  },

  async setNickname(nickname: string) {
    return apiRequest<NicknameResponse>('/api/game/nickname', {
      method: 'PUT',
      body: { nickname },
      auth: true,
    })
  },
}
