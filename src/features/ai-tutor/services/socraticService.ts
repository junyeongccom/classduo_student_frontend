/**
 * @file socraticService.ts
 * @description 소크라 문답 모드 API — 주제 목록/세션 시작/점수 상태/리더보드 조회
 * @module features/ai-tutor
 * @dependencies shared/lib/api (apiRequest)
 */
import { apiRequest } from '@/shared/lib/api'
import {
  SocraticTopic,
  SocraticStartResponse,
  SocraticStateResponse,
  SocraticLeaderboardResponse,
} from '../types'

export const socraticService = {
  /**
   * 강의 회차의 소크라 문답 주제 목록 조회
   */
  async fetchTopics(lectureId: string): Promise<{ data: SocraticTopic[] | null; error: any }> {
    const { data, error } = await apiRequest<{ topics: SocraticTopic[] }>(
      `/ai-tutor/lectures/${lectureId}/socratic/topics`,
      { auth: true }
    )
    return { data: data ? data.topics : null, error }
  },

  /**
   * 세션 내 소크라 문답 시작 (주제 선택)
   */
  async startSession(
    sessionId: string,
    topicId: string
  ): Promise<{ data: SocraticStartResponse | null; error: any }> {
    return apiRequest<SocraticStartResponse>(
      `/ai-tutor/sessions/${sessionId}/socratic/start`,
      {
        method: 'POST',
        body: { topic_id: topicId },
        auth: true,
      }
    )
  },

  /**
   * 세션의 소크라 문답 현재 점수 상태 조회
   */
  async fetchState(sessionId: string): Promise<{ data: SocraticStateResponse | null; error: any }> {
    return apiRequest<SocraticStateResponse>(
      `/ai-tutor/sessions/${sessionId}/socratic/state`,
      { auth: true }
    )
  },

  /**
   * 과목 단위 소크라 문답 리더보드 조회
   */
  async fetchLeaderboard(
    courseId: string,
    limit: number = 20
  ): Promise<{ data: SocraticLeaderboardResponse | null; error: any }> {
    return apiRequest<SocraticLeaderboardResponse>(
      `/ai-tutor/socratic/courses/${courseId}/leaderboard?limit=${limit}`,
      { auth: true }
    )
  },
}
