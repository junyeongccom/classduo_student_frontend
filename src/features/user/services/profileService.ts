import { apiRequest } from '@/shared/lib/api'
import { API_ENDPOINTS } from '@/shared/constants/api'
import {
  SendVerificationCodeRequest,
  SendVerificationCodeResponse,
  VerifyCodeRequest,
  VerifyCodeResponse,
  VerifyAndChangePasswordRequest,
  VerifyAndChangePasswordResponse,
} from '../types'

/**
 * 비밀번호 변경용 인증 코드 전송
 */
export async function sendVerificationCode(
  data: SendVerificationCodeRequest
) {
  return apiRequest<SendVerificationCodeResponse>(
    API_ENDPOINTS.AUTH.PASSWORD_CHANGE_SEND_CODE,
    {
      method: 'POST',
      body: data,
      auth: true,
    }
  )
}

/**
 * 인증 코드 검증
 */
export async function verifyCode(data: VerifyCodeRequest) {
  return apiRequest<VerifyCodeResponse>(
    API_ENDPOINTS.AUTH.PASSWORD_CHANGE_VERIFY_CODE,
    {
      method: 'POST',
      body: data,
      auth: true,
    }
  )
}

/**
 * 인증 코드 검증 및 비밀번호 변경
 */
export async function verifyAndChangePassword(
  data: VerifyAndChangePasswordRequest
) {
  return apiRequest<VerifyAndChangePasswordResponse>(
    API_ENDPOINTS.AUTH.PASSWORD_CHANGE_VERIFY,
    {
      method: 'POST',
      body: data,
      auth: true,
    }
  )
}
