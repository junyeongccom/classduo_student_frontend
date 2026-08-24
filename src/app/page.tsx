import { redirect } from 'next/navigation'

export default function Home() {
  // 메인 페이지 접근 시 강좌 목록으로 리다이렉트.
  // 로그인 안 되어 있으면 (protected) 의 AuthGuard 가 로그인/가입 모달을 띄운다.
  //
  // 과거엔 '/dashboard/ai-tutor' 로 보냈으나 next.config 의 redirects 체인이
  // /dashboard/:path* → /studyspace/:path* → (ai-tutor→feedback) 로 이어지면서
  // 존재하지 않는 '/studyspace/feedback' 에 도달해 루트 접근이 404 가 됐다.
  redirect('/studyspace/home')
}


