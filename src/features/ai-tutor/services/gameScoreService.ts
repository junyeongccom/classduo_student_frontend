/**
 * @file gameScoreService.ts
 * @description 달리기 게임 점수 제출 및 랭킹 조회 서비스
 * @module features/ai-tutor/services
 * @dependencies shared/lib/api, shared/constants/api
 */
import { apiRequest } from '@/shared/lib/api'
import { API_ENDPOINTS } from '@/shared/constants/api'

interface ScoreSubmitPayload {
  score: number
  correct_count: number
  wrong_count: number
  skipped_count: number
}

interface ScoreSubmitResponse {
  id: string
  rank: number
}

export interface RankingEntry {
  rank: number
  user_id: string
  display_name?: string | null
  score: number
  correct_count?: number | null
  wrong_count?: number | null
  skipped_count?: number | null
  achieved_at: string
}

interface MyBestRecord {
  rank: number
  score: number
  achieved_at: string
}

interface RankingResponse {
  rankings: RankingEntry[]
  my_best: MyBestRecord | null
}

interface NicknameResponse {
  nickname: string | null
}

export const gameScoreService = {
  async submitScore(lectureId: string, payload: ScoreSubmitPayload) {
    return apiRequest<ScoreSubmitResponse>(
      API_ENDPOINTS.GAME.SUBMIT_RUNNING(lectureId),
      {
        method: 'POST',
        body: payload,
        auth: true,
      },
    )
  },

  async getRankings(lectureId: string, limit: number = 10) {
    return apiRequest<RankingResponse>(
      `${API_ENDPOINTS.GAME.RANKINGS_RUNNING(lectureId)}?limit=${limit}`,
      {
        auth: true,
      },
    )
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
