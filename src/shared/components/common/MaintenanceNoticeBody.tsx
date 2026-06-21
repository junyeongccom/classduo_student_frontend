/**
 * @file MaintenanceNoticeBody.tsx
 * @description 서비스 장애 사과 공지 본문 (ko/en) — 인증화면 별도 카드 + 로그인 후 모달 공용
 * @module shared/components/common
 * @dependencies next-intl
 */
'use client'

import { useLocale } from 'next-intl'

const KO = {
  title: '[Aplus] 생명과학의 세계 서비스 접속 장애 발생에 대해 진심으로 사과드립니다',
  paragraphs: [
    '안녕하세요, Aplus 운영팀입니다.',
    '먼저, 시험을 하루 앞둔 가장 중요한 시점에 서비스 이용에 큰 불편을 끼쳐드린 점 진심으로 사과드립니다.',
    '6월 21일 9시경부터 이용자 수가 급격히 증가하면서, 일부 학습 기능에서 일시적인 오류가 발생하였습니다. 많은 분들이 시험을 준비하며 가장 집중해야 할 시기에 학습을 방해해드린 점, 운영팀 모두 무거운 책임을 느끼고 있습니다.',
    '문제를 인지한 직후 긴급 복구 작업을 진행하였으며, 현재 서비스는 정상적으로 이용 가능한 상태입니다.',
    '동일한 문제가 재발하지 않도록 서버 환경을 보강하고 있습니다.',
    '장애 시간 동안 일부 학습 기록이 정상적으로 저장되지 않았을 수 있습니다. 이 부분 다시 한번 양해 부탁드립니다.',
    '학생분들께서 안심하고 학습에 집중하실 수 있도록 서비스 안정성에 더욱 만전을 기하겠습니다.',
    '내일 시험, 그동안 준비하신 만큼 좋은 결과 있으시길 진심으로 응원하겠습니다. 다시 한번 깊이 사과드립니다.',
  ],
  signature: 'Aplus 운영팀 드림',
}

const EN = {
  title:
    '[Aplus] We sincerely apologize for the service disruption on Aplus for The World of Bio Science.',
  paragraphs: [
    'Hello, this is the Aplus Operations Team.',
    'First and foremost, we sincerely apologize for the inconvenience caused at such a critical time, just one day before your exam.',
    'At around 9:00 PM on June 21, a sudden increase in the number of users caused temporary errors in some learning features. We deeply regret that this disruption interfered with your studies at a time when you needed to focus the most, and our entire operations team takes this matter very seriously.',
    'Immediately after identifying the issue, we carried out emergency recovery work, and the service is now operating normally.',
    'To prevent the same issue from occurring again, we are strengthening our server environment.',
    'Please note that some learning records may not have been saved properly during the service disruption. We sincerely ask for your understanding regarding this matter.',
    'We will do our utmost to ensure greater service stability so that students can study with confidence and focus on their learning.',
    'We sincerely wish you the best of luck on tomorrow’s exam and hope your efforts lead to great results.',
    'Once again, we deeply apologize for the inconvenience.',
  ],
  signature: 'Sincerely,\nAplus Operations Team',
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
