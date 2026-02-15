/**
 * @file types.ts
 * @description 회차별 학습 도메인 타입 정의
 * @module features/lecture-study
 * @dependencies 없음
 */

export type LectureStudyTab = 'summary' | 'quiz' | 'game' | 'ai-tutor'
export type LeftPanelTab = 'materials' | 'recordings'

export interface Lecture {
  id: string
  course_id: string
  title: string | null
  lecture_number: number | null
  date: string | null
  week_number: number | null
  session_number: number | null
  has_recordings: boolean
  has_materials: boolean
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

export interface Recording {
  id: string
  lecture_id: string
  summary: string | null
  status: string
}

export interface RecordingChunk {
  id: string
  recording_id: string
  chunk_index: number
  start_time: number | null
  end_time: number | null
  text: string | null
}

export interface GameInfo {
  id: string
  name: string
  description: string
  minWords: number
  icon: string
}
