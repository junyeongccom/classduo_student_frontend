/**
 * @file myQuizService.ts
 * @description 커스터마이즈 퀴즈 세션 관리 API 클라이언트
 * @module features/my-quiz/services
 * @dependencies shared/lib/api
 */

import { apiRequest } from '@/shared/lib/api'
import type { QuizSession, SessionDetailResponse, QuizItem } from '../types'

interface SessionListResponse {
  sessions: QuizSession[]
}

interface SessionCreateResponse {
  session_id: string
  status: string
}

/** 세션 목록 조회 */
export async function getSessions() {
  return apiRequest<SessionListResponse>('/customize-quiz/sessions', {
    method: 'GET',
    auth: true,
  })
}

/** 세션 상세 + 퀴즈 목록 조회 */
export async function getSessionDetail(sessionId: string) {
  return apiRequest<SessionDetailResponse>(
    `/customize-quiz/sessions/${encodeURIComponent(sessionId)}`,
    { method: 'GET', auth: true },
  )
}

/** 세션 생성 (HTTP 202) */
export async function createSession(
  lectureId: string,
  quizCount: number,
  quizTypes: string[],
) {
  return apiRequest<SessionCreateResponse>(
    `/customize-quiz/lectures/${encodeURIComponent(lectureId)}/sessions`,
    {
      method: 'POST',
      auth: true,
      body: { quiz_count: quizCount, quiz_types: quizTypes },
    },
  )
}

/** 세션 삭제 */
export async function deleteSession(sessionId: string) {
  return apiRequest<void>(
    `/customize-quiz/sessions/${encodeURIComponent(sessionId)}`,
    { method: 'DELETE', auth: true },
  )
}

/** 세션 제목 수정 */
export async function renameSession(sessionId: string, title: string) {
  return apiRequest<QuizSession>(
    `/customize-quiz/sessions/${encodeURIComponent(sessionId)}`,
    {
      method: 'PATCH',
      auth: true,
      body: { title },
    },
  )
}
