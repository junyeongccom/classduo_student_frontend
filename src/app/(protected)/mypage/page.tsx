'use client'

import { useAuth } from '@/features/auth'
import { Button } from '@/shared/components/ui'
import { User, Mail, School, LogOut } from 'lucide-react'

export default function MyPage() {
  const { user, logout } = useAuth()

  return (
    <div className="flex h-screen flex-col">
      <div className="flex-1 p-6">
        <h1 className="mb-6 text-xl font-bold text-gray-900">프로필</h1>

        {user ? (
          <div className="max-w-md space-y-6">
            {/* 프로필 정보 */}
            <div className="rounded-lg border border-gray-200 p-6">
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
                  <User className="h-8 w-8 text-primary-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{user.full_name}</h2>
                  <p className="text-sm text-gray-500">{user.role}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">{user.email}</span>
                  {user.is_email_verified && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-600">
                      인증됨
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <School className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">{user.school}</span>
                </div>
              </div>
            </div>

            {/* 액션 버튼들 */}
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                프로필 수정
              </Button>
              <Button variant="outline" className="w-full justify-start">
                비밀번호 변경
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-red-500 hover:bg-red-50 hover:text-red-600"
                onClick={logout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                로그아웃
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            사용자 정보를 불러오는 중...
          </div>
        )}
      </div>
    </div>
  )
}


