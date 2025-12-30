/**
 * API 엔드포인트 상수
 */
export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    SIGNUP: '/auth/signup',
    LOGIN: '/auth/login',
    ME: '/auth/me',
    RESEND_VERIFICATION: '/auth/resend-verification',
    CHANGE_PASSWORD: '/auth/me/password',
    DELETE_ACCOUNT: '/auth/me',
    UPDATE_PROFILE: '/auth/me',
    RESET_PASSWORD: '/auth/reset-password',
    UPDATE_PASSWORD: '/auth/update-password',
    REFRESH: '/auth/refresh',
  },
  
  // Recording (추후 사용)
  RECORDING: {
    CREATE_JOB: '/recordings/audio/jobs',
    GET_STATUS: (jobId: string) => `/recordings/audio/jobs/${jobId}/status`,
    GET_TRANSCRIPT: (jobId: string) => `/recordings/audio/jobs/${jobId}/transcript`,
  },

  // Review
  REVIEW: {
    GET_LECTURE_LIST: (courseId: string) => `/reviews/courses/${courseId}/lectures`,
    GET_CAROUSEL: (lectureId: string) => `/reviews/lectures/${lectureId}/carousel`,
  },

  // Health
  HEALTH: '/health',
} as const


