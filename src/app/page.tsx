import { redirect } from 'next/navigation'

export default function Home() {
  // 메인 페이지 접근 시 대시보드로 리다이렉트
  // 로그인 안 되어 있으면 (protected) layout에서 자동으로 로그인 페이지로 보냄
  redirect('/dashboard/ai-tutor')
}


