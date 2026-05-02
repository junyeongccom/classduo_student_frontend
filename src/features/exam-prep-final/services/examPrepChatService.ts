/**
 * @file examPrepChatService.ts
 * @description 핵심테스트(core/mid/final) 풀이 챗봇 API — POST /exam-prep-chat/chat, GET /exam-prep-chat/chat/history/{testId}
 * @module features/exam-prep-final/services
 * @dependencies shared/lib/api
 *
 * 콘텐츠 학습 채팅(`/contents-study/chat`)과 별도 엔드포인트·별도 DB 테이블.
 */

import { apiRequest } from '@/shared/lib/api'

// ── DTO ──

/** 챗봇 호출 시 함께 보내는 현재 문항 메타데이터 */
export interface ExamPrepQuizContextPayload {
  /** 1-based 문항 순번 */
  seq: number
  /** 표시용 라벨 (예: "핵심1", "중간테스트2", "최종테스트") */
  test_label?: string
  stem: string
  options: string[]
  /** 정답 인덱스(0~3) 문자열 — LLM 컨텍스트로 전달, 정답 노출 가드는 프롬프트에서 처리 */
  answer: string
  explanation: Record<string, string>
  hint?: string | null
}

export interface ExamPrepChatResponseDto {
  answer: string
}

export interface ExamPrepChatMessageDto {
  id?: string | null
  role: 'user' | 'assistant'
  content: string
  quiz_context?: ExamPrepQuizContextPayload | null
  created_at?: string | null
}

export interface ExamPrepChatHistoryResponseDto {
  messages: ExamPrepChatMessageDto[]
}

// ── API ──

/** 핵심테스트 챗봇 1턴 송수신 */
export async function examPrepChat(
  args: {
    question: string
    testId: string
    /** 현재 풀고 있는 문항의 source_lecture_id (RAG 컨텍스트용, 선택) */
    lectureId?: string | null
    quizContext?: ExamPrepQuizContextPayload
  },
): Promise<{ data: ExamPrepChatResponseDto | null; error: string | null }> {
  const result = await apiRequest<ExamPrepChatResponseDto>('/exam-prep-chat/chat', {
    method: 'POST',
    auth: true,
    body: {
      question: args.question,
      test_id: args.testId,
      lecture_id: args.lectureId ?? null,
      ...(args.quizContext && { quiz_context: args.quizContext }),
    },
  })
  if (result.error) {
    return { data: null, error: result.error.message }
  }
  return { data: result.data ?? null, error: null }
}

/** 핵심테스트 챗봇 히스토리 조회 (test_id + user_id 단위 최근 N건) */
export async function examPrepChatHistory(
  testId: string,
): Promise<{ data: ExamPrepChatHistoryResponseDto | null; error: string | null }> {
  const result = await apiRequest<ExamPrepChatHistoryResponseDto>(
    `/exam-prep-chat/chat/history/${testId}`,
    { auth: true },
  )
  if (result.error) {
    return { data: null, error: result.error.message }
  }
  return { data: result.data ?? null, error: null }
}
