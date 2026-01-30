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
    VERIFY_EMAIL: '/auth/verify-email',
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
    GET_LECTURE_KEYWORDS: (lectureId: string) => `/recordings/audio/lectures/${lectureId}/keywords`,
  },

  // Review
  REVIEW: {
    GET_LECTURE_LIST: (courseId: string) => `/courses/${courseId}/lectures`,
    GET_CAROUSEL: (lectureId: string) => `/reviews/lectures/${lectureId}/carousel`,
    GET_REVIEW_ITEMS: (lectureId: string) => `/reviews/lectures/${lectureId}/review-items`,
    CREATE_REVIEW_ITEM: (lectureId: string) => `/reviews/lectures/${lectureId}/review-items`,
    DELETE_REVIEW_ITEMS: (lectureId: string) => `/reviews/lectures/${lectureId}/review-items`,
    DELETE_REVIEW_ITEM: (reviewItemId: string) => `/reviews/review-items/${reviewItemId}`,
    UPDATE_REVIEW_ITEM: (reviewItemId: string) => `/reviews/review-items/${reviewItemId}`,
    IMPORT_KEYWORDS: (lectureId: string) => `/reviews/lectures/${lectureId}/review-items/import-keywords`,
    COMPLETE: (lectureId: string) => `/reviews/lectures/${lectureId}/review/complete`,
    GET_DEFINITION_BUILDER: (lectureId: string) => `/reviews/lectures/${lectureId}/definition-builder`,
  },

  // OX Quiz
  OX_QUIZ: {
    SUBMIT: (lectureId: string) => `/api/lectures/${lectureId}/ox/submit`,
  },

  // Reward
  REWARD: {
    CLAIM: (lectureId: string) => `/api/lectures/${lectureId}/reward/claim`,
  },

  // Health
  HEALTH: '/health',
} as const


