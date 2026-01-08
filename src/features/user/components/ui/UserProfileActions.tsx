'use client'

import { LogOut } from 'lucide-react'
import { Button } from '@/shared/components/ui'

interface UserProfileActionsProps {
  onLogout: () => void
}

export function UserProfileActions({ onLogout }: UserProfileActionsProps) {
  return (
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
        onClick={onLogout}
      >
        <LogOut className="mr-2 h-4 w-4" />
        로그아웃
      </Button>
    </div>
  )
}


