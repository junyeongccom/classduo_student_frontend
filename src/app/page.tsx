import { redirect } from 'next/navigation'

export default function Home() {
  // 메인 페이지 접근 시 대시보드로 리다이렉트
  // 로그인 안 되어 있으면 (protected) layout에서 자동으로 로그인 페이지로 보냄
    // '/dashboard/ai-tutor' 로 보내면 next.config 의 redirects 체인
  // (/dashboard/:path* → /studyspace/:path* → ai-tutor→feedback) 을 타고
  // 엉뚱하게 /studyspace/feedback 으로 떨어진다.
  redirect('/studyspace/home')
}


