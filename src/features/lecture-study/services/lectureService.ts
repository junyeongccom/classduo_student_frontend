/**
 * @file lectureService.ts
 * @description 회차 목록 및 회차 상세 API 서비스
 * @module features/lecture-study/services
 * @dependencies shared/lib/api
 */

import { apiRequest } from '@/shared/lib/api'
import { isUUID } from '@/shared/lib/validation'

export interface LectureApiItem {
  lecture_id: string
  lecture_no: number
  title: string | null
  lecture_date: string
  start_time: string | null
  essence_7words: string | null
}

export interface LectureListApiResponse {
  course_id: string
  course_title: string
  section: string | null
  professor_name: string | null
  lectures: LectureApiItem[]
}

export interface RecordingChunkSummaryApi {
  chunk_index: number
  start_time: number | null
  end_time: number | null
  title: string | null
  content: string | null
}

export interface RecordingApiItem {
  recording_id: string
  job_id: string | null
  status: string
  duration_seconds: number | null
  original_filename: string | null
  created_at: string | null
  updated_at: string | null
  chunk_summaries?: RecordingChunkSummaryApi[]
}

export interface RecordingListApiResponse {
  lecture_id: string
  recordings: RecordingApiItem[]
  total_count: number
}

export interface LectureMaterialMappingItem {
  material_id: string
  original_filename: string
  source: string
  created_at: string
}

export interface LectureMaterialMappingsResponse {
  lecture_id: string
  materials: LectureMaterialMappingItem[]
}

export interface MaterialPageItem {
  id: string
  page_number: number
  image_url: string | null
  text_content: string | null
}

export interface MaterialPagesResponse {
  material_id: string
  pages: MaterialPageItem[]
  total_count: number
}

/** input_snapshot_id 기반 강의자료 항목 */
export interface SnapshotMaterialItem {
  material_id: string
  original_filename: string | null
  file_type: string | null
  status: string | null
  total_pages: number | null
  original_pdf_path: string | null
}

/** 녹음본 청크 요약 항목 */
export interface SnapshotChunkSummary {
  chunk_index: number
  start_time: number | null
  end_time: number | null
  title: string | null
  content: string | null
}

/** input_snapshot_id 기반 녹음본 항목 */
export interface SnapshotRecordingItem {
  recording_id: string
  job_id: string | null
  status: string
  step: string | null
  duration_seconds: number | null
  original_filename: string | null
  created_at: string | null
  updated_at: string | null
  chunk_summaries?: SnapshotChunkSummary[]
}

/** GET /content/lectures/{lectureId}/snapshot-selections 응답 */
export interface SnapshotSelectionsResponse {
  input_snapshot_id: string | null
  materials: SnapshotMaterialItem[]
  recordings: SnapshotRecordingItem[]
}

export const lectureService = {
  getLectures: (courseId: string) => {
    if (!isUUID(courseId)) {
      return Promise.resolve({ data: null, error: { error_code: 'INVALID_UUID', message: 'Invalid courseId format' } })
    }
    return apiRequest<LectureListApiResponse>(`/courses/${courseId}/lectures`, {
      method: 'GET',
      auth: true,
    })
  },

  getRecordings: (lectureId: string) => {
    if (!isUUID(lectureId)) {
      return Promise.resolve({ data: null, error: { error_code: 'INVALID_UUID', message: 'Invalid lectureId format' } })
    }
    return apiRequest<RecordingListApiResponse>(`/recordings/audio/lectures/${lectureId}`, {
      method: 'GET',
      auth: true,
    })
  },

  getLectureMaterials: (lectureId: string) => {
    if (!isUUID(lectureId)) {
      return Promise.resolve({ data: null, error: { error_code: 'INVALID_UUID', message: 'Invalid lectureId format' } })
    }
    return apiRequest<LectureMaterialMappingsResponse>(`/materials/mappings/${lectureId}`, {
      method: 'GET',
      auth: true,
    })
  },

  getMaterialPages: (materialId: string) => {
    if (!isUUID(materialId)) {
      return Promise.resolve({ data: null, error: { error_code: 'INVALID_UUID', message: 'Invalid materialId format' } })
    }
    return apiRequest<MaterialPagesResponse>(`/materials/${materialId}/pages`, {
      method: 'GET',
      auth: true,
    })
  },

  /**
   * input_snapshot_id 기반으로 회차에 연결된 강의자료 + 녹음본 목록 조회.
   * lecture_material_mappings / recordings.lecture_id FK 대신
   * lectures.input_snapshot_id → lecture_content_inputs 를 참조한다.
   */
  getSnapshotSelections: (lectureId: string) => {
    if (!isUUID(lectureId)) {
      return Promise.resolve({ data: null, error: { error_code: 'INVALID_UUID', message: 'Invalid lectureId format' } })
    }
    return apiRequest<SnapshotSelectionsResponse>(`/content/lectures/${lectureId}/snapshot-selections`, {
      method: 'GET',
      auth: true,
    })
  },
}
