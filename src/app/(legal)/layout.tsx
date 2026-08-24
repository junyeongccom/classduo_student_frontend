/**
 * @file layout.tsx
 * @description 약관·처리방침 등 법적 문서 페이지 공통 레이아웃 (인증 불필요)
 * @module app/(legal)
 * @dependencies 없음
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-white dark:bg-gray-950">
      <main className="mx-auto max-w-3xl px-5 py-10">{children}</main>
    </div>
  )
}
