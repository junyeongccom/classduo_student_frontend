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

/**
 * 세션 생성 (HTTP 202) — 다중 회차 지원.
 * 신규 엔드포인트 `POST /customize-quiz/sessions` 로 `lecture_ids` 전송.
 * 단일 회차 선택도 길이 1 배열(`[lectureId]`)로 호출하면 된다.
 */
export async function createSession(
  lectureIds: string[],
  typeCounts: Record<string, number>,
  language: string = 'ko',
) {
  return apiRequest<SessionCreateResponse>('/customize-quiz/sessions', {
    method: 'POST',
    auth: true,
    body: { lecture_ids: lectureIds, type_counts: typeCounts, language },
  })
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
