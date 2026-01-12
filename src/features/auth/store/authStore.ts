import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { 
  AuthState, 
  AuthActions, 
  UserProfileResponse, 
  AuthTokenResponse,
  AuthError 
} from '../types'
import { TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/shared/lib/utils'
import { resetSupabaseClient, startTokenRefreshTimer, stopTokenRefreshTimer } from '@/shared/lib/supabase'

type AuthStore = AuthState & AuthActions

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      // State
      user: null,
      isAuthenticated: typeof window !== 'undefined' ? !!localStorage.getItem(TOKEN_KEY) : false,
      isLoading: true,
      error: null,

      // Actions
      setUser: (user: UserProfileResponse | null) => 
        set({ user, isAuthenticated: !!user }),

      setLoading: (isLoading: boolean) => 
        set({ isLoading }),

      setError: (error: AuthError | null) => 
        set({ error }),

      login: (tokens: AuthTokenResponse) => {
        // 토큰 저장
        if (typeof window !== 'undefined') {
          localStorage.setItem(TOKEN_KEY, tokens.access_token)
          localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token)
        }
        set({ isAuthenticated: true, error: null })
        // Supabase 클라이언트 초기화
        resetSupabaseClient()
        // 토큰 갱신 타이머 시작
        startTokenRefreshTimer()
      },

      logout: () => {
        // 토큰 삭제
        if (typeof window !== 'undefined') {
          localStorage.removeItem(TOKEN_KEY)
          localStorage.removeItem(REFRESH_TOKEN_KEY)
        }
        set({ user: null, isAuthenticated: false, error: null })
        // 토큰 갱신 타이머 정리
        stopTokenRefreshTimer()
        // Supabase 클라이언트 초기화 (세션 정리)
        resetSupabaseClient()
      },

      clearError: () => 
        set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user,
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
)


