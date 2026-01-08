import { apiRequest } from '@/shared/lib/api'
import { API_ENDPOINTS } from '@/shared/constants/api'
import {
  SignUpRequest,
  SignUpResponse,
  LoginRequest,
  AuthTokenResponse,
  ResendVerificationRequest,
  UserProfileResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
  DeleteAccountRequest,
  DeleteAccountResponse,
} from '../types'

/**
 * Auth API 함수들
 */
export const authService = {
  /**
   * 회원가입
   */
  signup: (data: SignUpRequest) =>
    apiRequest<SignUpResponse>(API_ENDPOINTS.AUTH.SIGNUP, {
      method: 'POST',
      body: data,
    }),

  /**
   * 로그인
   */
  login: (data: LoginRequest) =>
    apiRequest<AuthTokenResponse>(API_ENDPOINTS.AUTH.LOGIN, {
      method: 'POST',
      body: data,
    }),

  /**
   * 인증 이메일 재전송
   */
  resendVerification: (data: ResendVerificationRequest) =>
    apiRequest<{ message: string }>(API_ENDPOINTS.AUTH.RESEND_VERIFICATION, {
      method: 'POST',
      body: data,
    }),

  /**
   * 내 프로필 조회
   */
  getMe: () =>
    apiRequest<UserProfileResponse>(API_ENDPOINTS.AUTH.ME, {
      method: 'GET',
      auth: true,
    }),

  /**
   * 비밀번호 변경
   */
  changePassword: (data: ChangePasswordRequest) =>
    apiRequest<ChangePasswordResponse>(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
      method: 'PATCH',
      body: data,
      auth: true,
    }),

  /**
   * 프로필 수정
   */
  updateProfile: (data: UpdateProfileRequest) =>
    apiRequest<UpdateProfileResponse>(API_ENDPOINTS.AUTH.UPDATE_PROFILE, {
      method: 'PATCH',
      body: data,
      auth: true,
    }),

  /**
   * 회원 탈퇴
   */
  deleteAccount: (data: DeleteAccountRequest) =>
    apiRequest<DeleteAccountResponse>(API_ENDPOINTS.AUTH.DELETE_ACCOUNT, {
      method: 'DELETE',
      body: data,
      auth: true,
    }),

  /**
   * 토큰 갱신
   */
  refreshToken: (refreshToken: string) =>
    apiRequest<AuthTokenResponse>(API_ENDPOINTS.AUTH.REFRESH, {
      method: 'POST',
      body: { refresh_token: refreshToken },
    }),
}


