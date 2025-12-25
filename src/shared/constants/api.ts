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
  },
  
  // Recording (추후 사용)
  RECORDING: {
    CREATE_JOB: '/recordings/audio/jobs',
    GET_STATUS: (jobId: string) => `/recordings/audio/jobs/${jobId}/status`,
    GET_TRANSCRIPT: (jobId: string) => `/recordings/audio/jobs/${jobId}/transcript`,
  },

  // Health
  HEALTH: '/health',
} as const


