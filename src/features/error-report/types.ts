// 오류 신고 관련 타입 정의

// 발생시점 (UI 기능) 선택지 - 학생용
export type OccurrenceContext =
  | 'AI_TUTOR'       // AI 튜터
  | 'REVIEW'         // 복습
  | 'EXAM_PREP'      // 시험대비
  | 'QUIZ'           // 퀴즈
  | 'LOGIN'          // 로그인
  | 'OTHER';         // 기타

export const OCCURRENCE_CONTEXT_LABELS: Record<OccurrenceContext, string> = {
  AI_TUTOR: 'AI 튜터',
  REVIEW: '복습',
  EXAM_PREP: '시험대비',
  QUIZ: '퀴즈',
  LOGIN: '로그인',
  OTHER: '기타',
};

export interface CreateErrorReportRequest {
  // 필수 입력
  content: string;

  // 선택 입력
  occurrence_time?: string;           // ISO 8601 형식
  occurrence_context?: OccurrenceContext;
  related_filename?: string;
  contact?: string;
  attachment_url?: string;
  system_error_message?: string;      // 시스템 에러 로그 (상세 로그)
}

export interface CreateErrorReportResponse {
  report_id: string;
  message: string;
}
