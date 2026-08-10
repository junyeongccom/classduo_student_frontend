/**
 * @file types.ts
 * @description 회차별 학습 도메인 타입 정의
 * @module features/lecture-study
 * @dependencies 없음
 */

export type LeftPanelTab = 'materials' | 'recordings'

export type LectureStudyTab = 'summary' | 'quiz' | 'game'

export interface Lecture {
  id: string
  course_id: string
  title: string | null
  lecture_number: number | null
  date: string | null
  week_number: number | null
  session_number: number | null
  has_recordings: boolean | null
  has_materials: boolean | null
  has_content: boolean
  essence_7words: string | null
}

export interface LectureMaterial {
  id: string
  title: string | null
  original_pdf_path: string | null
  status: string
  signed_url?: string | null
}

export interface RecordingChunkSummary {
  chunk_index: number
  start_time: number | null
  end_time: number | null
  title: string | null
  content: string | null
}

export interface Recording {
  id: string
  lecture_id: string
  status: string
  chunk_summaries: RecordingChunkSummary[]
}

export interface GameInfo {
  id: string
  name: string
  description: string
  minWords: number
  icon: string
}

/** 출처 근거 문장 인용 — text 는 청크 표시 본문(요약)의 부분 문자열 (하이라이팅용) */
export interface SourceQuote {
  chunk: number
  text: string
}

/** lecture_content_summaries 요약 섹션 (통합 요약) */
export interface ContentSummarySection {
  title: string
  bullets: string[]
  tables?: ContentSummaryTable[]
  source_pages: number[]
  source_chunks: number[]
  /** 청크별 근거 문장 (서버 결정론 부착, 구버전 요약에는 없음) */
  source_quotes?: SourceQuote[]
}

/** 요약 섹션 내 테이블 */
export interface ContentSummaryTable {
  title?: string | null
  headers: string[]
  rows: string[][]
}

/** 교수자가 수업에서 다룬 섹션 (녹음 유래) */
export interface ContentSummaryCoreSection extends ContentSummarySection {
  easy_explanation: string
  lecture_seconds: number
  time_share_pct: number
  emphasis_cues: string[]
}

/** 강의자료에만 있고 수업에서 다루지 않은 섹션 */
export interface ContentSummarySupplementarySection extends ContentSummarySection {
  easy_explanation: string
}

/** lecture_content_summaries 통합 요약 */
export interface ContentSummary {
  overview: string
  /** 하위호환 평탄화 배열 — core+supplementary 가 비어 있는 구버전 요약에서만 렌더에 쓴다 */
  sections: ContentSummarySection[]
  core_sections: ContentSummaryCoreSection[]
  supplementary_sections: ContentSummarySupplementarySection[]
  recent_issues?: string[]
  exam_points?: string[]
}
