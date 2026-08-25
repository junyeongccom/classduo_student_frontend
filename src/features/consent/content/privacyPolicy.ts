/**
 * @file privacyPolicy.ts
 * @description 개인정보 처리방침 본문 데이터 (정본: backend docs/legal/privacy-policy_2026-09-01.md)
 * @module features/consent
 * @dependencies LegalDocument
 */
import type { LegalDocumentProps } from '../components/legal/LegalDocument'

export const PRIVACY_VERSION = '2026-09-01'

const DRAFT_KO = '⚠️ 법률검토 전 초안입니다. 실제 서비스 게시 전 법률 자문을 받아야 합니다.'
const DRAFT_EN = '⚠️ Draft pending legal review. Legal counsel must review this before public release.'

export const PRIVACY_KO: LegalDocumentProps = {
  title: '개인정보 처리방침',
  effectiveLabel: `시행일: 2026년 9월 1일 · 버전 ${PRIVACY_VERSION}`,
  draftWarning: DRAFT_KO,
  intro:
    '주식회사 클래스듀오(이하 "회사")는 「개인정보 보호법」 등 관련 법령을 준수하며, 이용자의 개인정보를 보호하기 위해 다음과 같이 개인정보 처리방침을 수립·공개합니다.',
  articles: [
    {
      heading: '제1조 (총칙)',
      paragraphs: [
        '① 이 방침은 회사가 제공하는 학습 지원 서비스 "클래스듀오"(이하 "서비스")를 이용하는 이용자의 개인정보 처리에 적용됩니다.',
        '② 회사는 이용자의 동의 없이 이 방침에 명시된 목적 외의 용도로 개인정보를 이용하거나 제3자에게 제공하지 않습니다.',
      ],
    },
    {
      heading: '제2조 (수집하는 개인정보 항목 및 수집 방법)',
      paragraphs: ['① 회사는 서비스 제공을 위해 다음 개인정보를 수집합니다.'],
      table: {
        headers: ['구분', '항목', '수집 시점'],
        rows: [
          ['필수', '이름, 이메일 주소, 비밀번호', '회원가입 시'],
          [
            '자동 수집',
            '학습 활동 기록(문항 풀이 이력, AI 튜터 대화 내용, 학습 콘텐츠 열람 기록, 접속 일시), 접속 IP 주소, 브라우저·기기 정보',
            '서비스 이용 과정',
          ],
        ],
      },
      note:
        '② 회사는 회원가입 화면에서 이용자가 직접 입력하는 방식과, 서비스 이용 과정에서 자동으로 생성·수집되는 방식으로 개인정보를 수집합니다. ③ 회사는 만 14세 미만 아동의 개인정보를 수집하지 않으며, 회원가입 시 만 14세 이상임을 확인합니다.',
    },
    {
      heading: '제3조 (개인정보의 처리 목적)',
      paragraphs: ['회사는 다음의 목적으로 개인정보를 처리합니다.'],
      list: [
        '회원 식별 및 본인 확인, 회원 관리',
        '학습 지원 서비스 제공 — 학습 콘텐츠 제공, 문항 생성 및 채점, AI 튜터 응답 생성',
        '학습 이력 저장 및 이용자 본인에 대한 학습 현황 제공',
        '서비스 운영 및 개선, 장애 대응, 부정 이용 방지',
        '공지사항 전달 등 서비스 관련 안내',
      ],
    },
    {
      heading: '제4조 (개인정보의 보유 및 이용 기간)',
      paragraphs: [
        '① 회사는 개인정보 처리 목적이 달성되면 지체 없이 해당 개인정보를 파기합니다.',
        '② 회원 정보는 회원 탈퇴 시까지 보유하며, 탈퇴 시 지체 없이 파기합니다. 다만 다음의 경우 해당 기간까지 보관합니다.',
      ],
      table: {
        headers: ['보관 항목', '보관 기간', '근거'],
        rows: [
          ['부정 이용 기록', '1년', '부정 이용 방지'],
          ['동의 기록(동의 항목·일시·버전)', '회원 탈퇴 시까지', '동의 사실 입증'],
        ],
      },
      note: '③ 관계 법령에 따라 보존이 필요한 경우 해당 법령이 정한 기간 동안 보관합니다.',
    },
    {
      heading: '제5조 (개인정보의 처리 위탁)',
      paragraphs: ['① 회사는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리 업무를 위탁하고 있습니다.'],
      table: {
        headers: ['수탁자', '위탁 업무', '처리 항목'],
        rows: [
          ['Amazon Web Services, Inc.', '애플리케이션 서버 운영', '서비스 이용 과정에서 처리되는 정보'],
          ['Supabase, Inc.', '데이터베이스·인증·파일 저장소 운영', '계정 정보, 학습 활동 기록'],
          ['OpenAI, L.L.C.', '학습 콘텐츠 임베딩 생성, AI 응답 생성(대체 경로)', '학습 콘텐츠 및 이용자 질문 텍스트'],
          ['Google LLC', 'AI 응답 생성, 강의 음성의 텍스트 변환', '이용자 질문 텍스트, 강의 녹음 음성'],
          ['Vercel Inc.', '웹 프론트엔드 호스팅', '접속 로그'],
          ['Resend, Inc.', '인증·안내 이메일 발송', '이메일 주소'],
        ],
      },
      note:
        '② 회사는 위탁계약 체결 시 개인정보의 안전한 관리에 관한 사항을 계약서에 명시하고, 수탁자가 이를 준수하는지 감독합니다. ③ 위탁 업무의 내용이나 수탁자가 변경될 경우 이 방침을 통해 공개합니다.',
    },
    {
      heading: '제6조 (교육성과 분석 및 연구 목적의 이용)',
      paragraphs: [
        '① 본 조에 따른 개인정보의 이용은 선택 사항입니다. 이용자가 동의하지 않더라도 서비스 이용에 어떠한 제한도 없으며, 동의 후에도 언제든지 철회할 수 있습니다.',
        '② 회사는 이용자가 동의한 경우, 다음의 정보를 교육성과 분석 및 학술 연구 목적으로 이용할 수 있습니다. 1. 서비스 내 학습 활동 기록 — 문항 풀이 이력 및 정오답, AI 튜터 대화 이력, 학습 콘텐츠 열람 기록, 학습 활동의 일시 및 빈도 2. 소속 대학이 제공하는 학사 정보 중 분석에 필요한 최소한의 정보 — 소속 단과대학, 수강 구분, 학업 성취도',
        '③ 제2항에 따른 이용의 목적은 다음과 같습니다. 1. 학습자의 서비스 이용 유형 분석 및 학습 성과와의 관련성 연구 2. 학습 지원 기능의 교육적 효과 검증 및 서비스 개선 3. 연구 결과의 학술 논문·학술대회 발표 등 학술적 공표',
        '④ 제2항에 따라 이용되는 정보는 가명처리 또는 익명처리를 거친 후 분석되며, 연구 결과의 공표 시에는 개인을 식별할 수 있는 정보가 포함되지 않습니다.',
        '⑤ 회사는 「개인정보 보호법」 제28조의2에 따라, 가명처리된 정보를 통계작성, 과학적 연구, 공익적 기록보존 등의 목적으로 정보주체의 동의 없이 처리할 수 있습니다. 이 경우에도 회사는 특정 개인을 알아보기 위한 목적으로 가명정보를 처리하지 않으며, 처리 과정에서 특정 개인을 알아볼 수 있는 정보가 생성된 경우 즉시 처리를 중지하고 회수·파기합니다.',
        '⑥ 이용자는 서비스 내 마이페이지에서 본 조에 따른 동의 여부를 언제든지 확인하고 변경할 수 있습니다.',
        '⑦ 본 조에 따른 동의 여부, 동의 일시, 동의한 방침의 버전은 동의 사실 입증을 위해 기록·보관됩니다.',
      ],
    },
    {
      heading: '제7조 (개인정보의 국외 이전)',
      paragraphs: ['① 회사는 서비스 제공을 위해 다음과 같이 개인정보를 국외로 이전합니다.'],
      table: {
        headers: ['이전받는 자', '이전 국가', '이전 항목', '이전 목적', '이전 일시 및 방법', '보유·이용 기간'],
        rows: [
          ['OpenAI, L.L.C.', '미국', '학습 콘텐츠 및 이용자 질문 텍스트', '임베딩 생성, AI 응답 생성', '서비스 이용 시 네트워크를 통한 전송', '처리 목적 달성 시까지'],
          ['Google LLC', '미국', '이용자 질문 텍스트, 강의 녹음 음성', 'AI 응답 생성, 음성의 텍스트 변환', '서비스 이용 시 네트워크를 통한 전송', '처리 목적 달성 시까지'],
          ['Supabase, Inc.', '미국(데이터 보관: 대한민국 서울 리전)', '계정 정보, 학습 활동 기록', '데이터베이스·인증·저장소 운영', '서비스 이용 시 네트워크를 통한 전송', '회원 탈퇴 시까지'],
          ['Vercel Inc.', '미국', '접속 로그', '웹 프론트엔드 호스팅', '서비스 접속 시 네트워크를 통한 전송', '처리 목적 달성 시까지'],
          ['Resend, Inc.', '미국', '이메일 주소', '인증·안내 이메일 발송', '이메일 발송 시 네트워크를 통한 전송', '처리 목적 달성 시까지'],
        ],
      },
      note:
        '② 이용자는 개인정보의 국외 이전에 동의하지 않을 권리가 있습니다. 다만 위 이전은 서비스의 핵심 기능 제공에 필수적이므로, 동의하지 않을 경우 서비스 이용이 제한될 수 있습니다.',
    },
    {
      heading: '제8조 (개인정보의 파기 절차 및 방법)',
      paragraphs: [
        '① 회사는 개인정보 보유 기간이 경과하거나 처리 목적이 달성된 경우 지체 없이 해당 개인정보를 파기합니다.',
        '② 전자적 파일 형태의 개인정보는 복구·재생이 불가능한 방법으로 영구 삭제하며, 출력물 형태의 개인정보는 분쇄하거나 소각합니다.',
      ],
    },
    {
      heading: '제9조 (정보주체의 권리·의무 및 행사 방법)',
      paragraphs: ['① 이용자는 언제든지 다음의 권리를 행사할 수 있습니다.'],
      list: [
        '개인정보 열람 요구',
        '오류 등이 있을 경우 정정 요구',
        '삭제 요구',
        '처리 정지 요구',
        '선택적 동의의 철회',
      ],
      note:
        '② 권리 행사는 서비스 내 마이페이지 또는 제11조의 개인정보 보호책임자에게 서면·이메일로 요청할 수 있으며, 회사는 지체 없이 조치합니다. ③ 이용자가 개인정보의 오류에 대한 정정을 요청한 경우, 회사는 정정을 완료할 때까지 해당 개인정보를 이용하거나 제공하지 않습니다.',
    },
    {
      heading: '제10조 (개인정보의 안전성 확보 조치)',
      paragraphs: ['회사는 개인정보의 안전성 확보를 위해 다음의 조치를 취하고 있습니다.'],
      list: [
        '관리적 조치 — 개인정보 취급자 최소화 및 접근 권한 관리',
        '기술적 조치 — 비밀번호의 일방향 암호화 저장, 전송 구간 암호화(HTTPS), 데이터베이스 행 수준 접근 제어(RLS) 적용',
        '접근 통제 — 개인정보를 처리하는 시스템에 대한 접근 권한의 부여·변경·말소 관리 및 접속 기록 보관',
      ],
    },
    {
      heading: '제11조 (개인정보 보호책임자)',
      paragraphs: [
        '회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 이용자의 불만 처리 및 피해 구제를 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.',
      ],
      table: {
        headers: ['구분', '내용'],
        rows: [
          ['상호', '주식회사 클래스듀오'],
          ['대표자', '윤건재'],
          ['사업자등록번호', '124-87-60756'],
          ['주소', '서울특별시 성북구 안암로 145, 경영본관동 2층 227호'],
          ['전화', '02-6951-0048'],
          ['개인정보 보호책임자 문의', 'admin@aplus.io.kr'],
        ],
      },
      note:
        '이용자는 개인정보 침해로 인한 구제를 받기 위하여 개인정보분쟁조정위원회(1833-6972), 개인정보침해신고센터(118), 대검찰청 사이버수사과(1301), 경찰청 사이버수사국(182)에 분쟁 해결이나 상담을 신청할 수 있습니다.',
    },
    {
      heading: '제12조 (처리방침의 변경)',
      paragraphs: [
        '① 이 방침은 시행일로부터 적용됩니다.',
        '② 이 방침의 내용이 변경되는 경우 회사는 변경 사항을 시행 7일 전부터 서비스 내 공지사항을 통해 안내합니다. 다만 이용자 권리의 중대한 변경이 있는 경우에는 30일 전에 안내하고, 필요한 경우 이용자의 동의를 다시 받습니다.',
      ],
    },
  ],
}

export const PRIVACY_EN: LegalDocumentProps = {
  title: 'Privacy Policy',
  effectiveLabel: `Effective: September 1, 2026 · Version ${PRIVACY_VERSION}`,
  draftWarning: DRAFT_EN,
  intro:
    'ClassDuo Inc. ("the Company") complies with the Personal Information Protection Act and related laws of the Republic of Korea. This policy explains how your personal data is collected, used, and protected.',
  articles: [
    {
      heading: 'Article 1 (General Provisions)',
      paragraphs: [
        '(1) This policy applies to the processing of personal data of users of the learning support service "ClassDuo" (the "Service").',
        '(2) The Company does not use personal data for purposes other than those stated in this policy, nor provide it to third parties, without the user’s consent.',
      ],
    },
    {
      heading: 'Article 2 (Personal Data Collected and Methods of Collection)',
      paragraphs: ['(1) The Company collects the following personal data to provide the Service.'],
      table: {
        headers: ['Type', 'Items', 'When collected'],
        rows: [
          ['Required', 'Name, university email address, password', 'At sign-up'],
          [
            'Automatically collected',
            'Learning activity records (question-solving history, AI tutor conversations, content viewing records, access timestamps), IP address, browser and device information',
            'While using the Service',
          ],
        ],
      },
      note:
        '(2) Data is collected both through direct entry at sign-up and automatically during use of the Service. (3) The Company does not collect personal data from children under 14 and confirms that users are 14 or older at sign-up.',
    },
    {
      heading: 'Article 3 (Purposes of Processing)',
      paragraphs: ['The Company processes personal data for the following purposes.'],
      list: [
        'User identification, verification, and account management',
        'Providing the learning support service — content delivery, question generation and grading, AI tutor responses',
        'Storing learning history and presenting it to the user',
        'Service operation and improvement, incident response, prevention of misuse',
        'Delivering notices and service-related announcements',
      ],
    },
    {
      heading: 'Article 4 (Retention and Use Period)',
      paragraphs: [
        '(1) The Company destroys personal data without delay once the purpose of processing has been achieved.',
        '(2) Account data is retained until account deletion, except as follows.',
      ],
      table: {
        headers: ['Item', 'Retention period', 'Basis'],
        rows: [
          ['Records of misuse', '1 year', 'Prevention of misuse'],
          ['Consent records (item, timestamp, version)', 'Until account deletion', 'Proof of consent'],
        ],
      },
      note: '(3) Where retention is required by law, data is kept for the period prescribed by that law.',
    },
    {
      heading: 'Article 5 (Outsourcing of Processing)',
      paragraphs: ['(1) The Company outsources personal data processing as follows.'],
      table: {
        headers: ['Processor', 'Outsourced work', 'Items processed'],
        rows: [
          ['Amazon Web Services, Inc.', 'Application server operation', 'Data processed while using the Service'],
          ['Supabase, Inc.', 'Database, authentication, and file storage', 'Account data, learning activity records'],
          ['OpenAI, L.L.C.', 'Embedding generation, AI response generation (fallback path)', 'Learning content and user question text'],
          ['Google LLC', 'AI response generation, speech-to-text of lecture audio', 'User question text, lecture audio recordings'],
          ['Vercel Inc.', 'Web frontend hosting', 'Access logs'],
          ['Resend, Inc.', 'Authentication and notification email delivery', 'Email address'],
        ],
      },
      note:
        '(2) The Company specifies data protection obligations in its outsourcing contracts and supervises compliance. (3) Any change of processor or scope will be disclosed through this policy.',
    },
    {
      heading: 'Article 6 (Use for Educational Outcome Analysis and Research)',
      paragraphs: [
        '(1) Use of personal data under this Article is optional. Declining places no restriction whatsoever on your use of the Service, and consent may be withdrawn at any time.',
        '(2) Where the user consents, the Company may use the following for educational outcome analysis and academic research: 1. In-service learning activity records — question-solving history and correctness, AI tutor conversation history, content viewing records, and the timing and frequency of learning activity; 2. The minimum academic information provided by the user’s university that is necessary for analysis — college, enrollment type, and academic achievement.',
        '(3) The purposes are: 1. analysis of learner usage patterns and their relationship to learning outcomes; 2. verification of the educational effectiveness of learning support features and service improvement; 3. academic publication of research findings, including journal articles and conference presentations.',
        '(4) Data used under paragraph (2) is pseudonymized or anonymized before analysis, and no personally identifiable information is included in published research findings.',
        '(5) Pursuant to Article 28-2 of the Personal Information Protection Act, the Company may process pseudonymized data without the data subject’s consent for statistical purposes, scientific research, or archiving in the public interest. Even so, the Company does not process pseudonymized data for the purpose of identifying a specific individual, and if identifiable information is generated during processing, the Company immediately stops processing and retrieves or destroys such information.',
        '(6) Users may review and change their consent under this Article at any time from the My Page screen.',
        '(7) The consent decision, its timestamp, and the policy version consented to are recorded and retained as proof of consent.',
      ],
    },
    {
      heading: 'Article 7 (Overseas Transfer of Personal Data)',
      paragraphs: ['(1) The Company transfers personal data overseas as follows.'],
      table: {
        headers: ['Recipient', 'Country', 'Items', 'Purpose', 'Timing and method', 'Retention period'],
        rows: [
          ['OpenAI, L.L.C.', 'United States', 'Learning content and user question text', 'Embedding generation, AI response generation', 'Transmitted over the network during use', 'Until the purpose is achieved'],
          ['Google LLC', 'United States', 'User question text, lecture audio recordings', 'AI response generation, speech-to-text', 'Transmitted over the network during use', 'Until the purpose is achieved'],
          ['Supabase, Inc.', 'United States (data stored in the Seoul, Republic of Korea region)', 'Account data, learning activity records', 'Database, authentication, and storage operation', 'Transmitted over the network during use', 'Until account deletion'],
          ['Vercel Inc.', 'United States', 'Access logs', 'Web frontend hosting', 'Transmitted over the network on access', 'Until the purpose is achieved'],
          ['Resend, Inc.', 'United States', 'Email address', 'Authentication and notification email delivery', 'Transmitted over the network when sending email', 'Until the purpose is achieved'],
        ],
      },
      note:
        '(2) You have the right to refuse the overseas transfer of your personal data. However, these transfers are essential to core Service functionality, so refusing may restrict your use of the Service.',
    },
    {
      heading: 'Article 8 (Destruction Procedure and Method)',
      paragraphs: [
        '(1) The Company destroys personal data without delay once the retention period has elapsed or the purpose of processing has been achieved.',
        '(2) Electronic files are permanently deleted by means that make recovery impossible; printed materials are shredded or incinerated.',
      ],
    },
    {
      heading: 'Article 9 (Rights of Data Subjects and How to Exercise Them)',
      paragraphs: ['(1) You may exercise the following rights at any time.'],
      list: [
        'Request access to your personal data',
        'Request correction of errors',
        'Request deletion',
        'Request suspension of processing',
        'Withdraw optional consent',
      ],
      note:
        '(2) Rights may be exercised from My Page or by written or email request to the Data Protection Officer in Article 11, and the Company will act without delay. (3) Where correction is requested, the Company will not use or provide the data until correction is complete.',
    },
    {
      heading: 'Article 10 (Security Measures)',
      paragraphs: ['The Company takes the following measures to secure personal data.'],
      list: [
        'Administrative — minimizing the number of personnel handling personal data and managing access rights',
        'Technical — one-way hashing of passwords, encryption in transit (HTTPS), row-level security (RLS) on the database',
        'Access control — management of granting, changing, and revoking access to systems processing personal data, and retention of access logs',
      ],
    },
    {
      heading: 'Article 11 (Data Protection Officer)',
      paragraphs: [
        'The Company designates the following Data Protection Officer, who is responsible for personal data processing and for handling user complaints and remedies.',
      ],
      table: {
        headers: ['Item', 'Details'],
        rows: [
          ['Company', 'ClassDuo Inc. (주식회사 클래스듀오)'],
          ['Representative', 'Yoon Geonjae'],
          ['Business registration number', '124-87-60756'],
          ['Address', '2F Room 227, Business Main Hall, 145 Anam-ro, Seongbuk-gu, Seoul, Republic of Korea'],
          ['Phone', '+82-2-6951-0048'],
          ['Data Protection Officer contact', 'admin@aplus.io.kr'],
        ],
      },
      note:
        'To seek remedies for privacy infringement you may contact the Personal Information Dispute Mediation Committee (1833-6972), the Privacy Infringement Report Center (118), the Supreme Prosecutors’ Office Cyber Investigation Division (1301), or the National Police Agency Cyber Bureau (182).',
    },
    {
      heading: 'Article 12 (Changes to This Policy)',
      paragraphs: [
        '(1) This policy applies from its effective date.',
        '(2) The Company will announce any change through in-service notices at least 7 days before it takes effect, or at least 30 days in advance where the change materially affects user rights, and will obtain renewed consent where necessary.',
      ],
    },
  ],
}
