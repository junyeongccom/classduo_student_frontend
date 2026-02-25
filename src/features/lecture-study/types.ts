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

/** lecture_content_summaries 요약 섹션 (통합 요약) */
export interface ContentSummarySection {
  title: string
  bullets: string[]
  tables?: ContentSummaryTable[]
  source_pages: number[]
  source_chunks: number[]
}

/** 요약 섹션 내 테이블 */
export interface ContentSummaryTable {
  title?: string | null
  headers: string[]
  rows: string[][]
}

/** lecture_content_summaries 통합 요약 */
export interface ContentSummary {
  overview: string
  sections: ContentSummarySection[]
  recent_issues?: string[]
  exam_points?: string[]
}
