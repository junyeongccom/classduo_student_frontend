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
  lectures: LectureApiItem[]
}

export interface RecordingApiItem {
  recording_id: string
  job_id: string | null
  status: string
  duration_seconds: number | null
  created_at: string | null
  updated_at: string | null
}

export interface RecordingListApiResponse {
  lecture_id: string
  recordings: RecordingApiItem[]
  total_count: number
}

export const lectureService = {
  getLectures: (courseId: string) => {
    if (!isUUID(courseId)) {
      return Promise.resolve({ data: null, error: { message: 'Invalid courseId format' } })
    }
    return apiRequest<LectureListApiResponse>(`/courses/${courseId}/lectures`, {
      method: 'GET',
      auth: true,
    })
  },

  getRecordings: (lectureId: string) => {
    if (!isUUID(lectureId)) {
      return Promise.resolve({ data: null, error: { message: 'Invalid lectureId format' } })
    }
    return apiRequest<RecordingListApiResponse>(`/recordings/audio/lectures/${lectureId}`, {
      method: 'GET',
      auth: true,
    })
  },
}
