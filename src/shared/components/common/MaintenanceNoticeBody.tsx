/**
 * @file MaintenanceNoticeBody.tsx
 * @description 서비스 장애 사과 공지 본문 (ko/en) — 인증화면 별도 카드 + 로그인 후 모달 공용
 * @module shared/components/common
 * @dependencies next-intl
 */
'use client'

import { useLocale } from 'next-intl'

const KO = {
  title:
    '[Aplus] 생명과학의 세계 에이플러스 일시적 서비스 오류에 대해 진심으로 사과드립니다.',
  paragraphs: [
    '안녕하세요, Aplus 운영팀입니다.',
    '6월 21일 오후 9시 20분경 일부 학습 기능에서 일시적인 오류가 발생하였고, 긴급 수정 작업으로 서비스를 정상적으로 이용 가능하게 빠르게 조치하였습니다.',
    '학생분들께서 안심하고 학습에 집중하실 수 있도록 운영팀 모두 서비스 안정성에 더욱 만전을 기하겠습니다.',
    '내일 시험, 그동안 준비하신 만큼 좋은 결과 있으시길 진심으로 응원하겠습니다. 다시 한번 깊이 사과드립니다.',
  ],
  signature: 'Aplus 운영팀 드림',
}

const EN = {
  title:
    '[Aplus] We sincerely apologize for the temporary service error on Aplus for The World of Bio Science.',
  paragraphs: [
    'Hello, this is the Aplus Operations Team.',
    'At around 9:20 PM on June 21, a temporary error occurred in some learning features. We promptly carried out emergency fixes and restored the service so that it could be used normally again.',
    'Our entire operations team will continue to do our utmost to ensure service stability, so that students can study with confidence and focus on their learning.',
    'We sincerely wish you the best of luck on tomorrow’s exam and hope your efforts lead to great results.',
    'Once again, we deeply apologize for the inconvenience.',
  ],
  signature: 'Sincerely,\nThe Aplus Operations Team',
}

export function MaintenanceNoticeBody() {
  const locale = useLocale()
  const c = locale === 'en' ? EN : KO

  return (
    <div className="space-y-3 text-left">
      <h3 className="text-sm font-bold leading-snug text-gray-900 dark:text-gray-100">
        {c.title}
      </h3>
      <div className="space-y-2.5 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
        {c.paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        <p className="whitespace-pre-line font-medium text-gray-700 dark:text-gray-200">
          {c.signature}
        </p>
      </div>
    </div>
  )
}
