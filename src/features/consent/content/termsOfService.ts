/**
 * @file termsOfService.ts
 * @description 서비스 이용약관 본문 데이터 (정본: backend docs/legal/terms-of-service_2026-09-01.md)
 * @module features/consent
 * @dependencies LegalDocument
 */
import type { LegalDocumentProps } from '../components/legal/LegalDocument'

export const TERMS_VERSION = '2026-09-01'

const DRAFT_KO = '⚠️ 법률검토 전 초안입니다. 실제 서비스 게시 전 법률 자문을 받아야 합니다.'
const DRAFT_EN = '⚠️ Draft pending legal review. Legal counsel must review this before public release.'

export const TERMS_KO: LegalDocumentProps = {
  title: '서비스 이용약관',
  effectiveLabel: `시행일: 2026년 9월 1일 · 버전 ${TERMS_VERSION}`,
  draftWarning: DRAFT_KO,
  articles: [
    {
      heading: '제1조 (목적)',
      paragraphs: [
        '이 약관은 주식회사 클래스듀오(이하 "회사")가 제공하는 학습 지원 서비스 "클래스듀오"(이하 "서비스")의 이용에 관하여 회사와 이용자 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.',
      ],
    },
    {
      heading: '제2조 (정의)',
      list: [
        '"서비스"란 회사가 제공하는 학습 콘텐츠 열람, 문항 풀이, AI 튜터 대화 등 학습 지원 기능 일체를 말합니다.',
        '"이용자"란 이 약관에 동의하고 서비스를 이용하는 자를 말합니다.',
        '"계정"이란 이용자 식별과 서비스 이용을 위하여 이용자가 설정한 이메일 주소와 비밀번호의 조합을 말합니다.',
        '"학습 활동 기록"이란 이용자가 서비스를 이용하는 과정에서 생성되는 문항 풀이 이력, AI 튜터 대화 이력, 콘텐츠 열람 기록 등을 말합니다.',
      ],
    },
    {
      heading: '제3조 (약관의 효력 및 변경)',
      paragraphs: [
        '① 이 약관은 서비스 화면에 게시함으로써 효력이 발생합니다.',
        '② 회사는 관련 법령을 위배하지 않는 범위에서 이 약관을 변경할 수 있으며, 변경 시 시행 7일 전부터 서비스 내에 공지합니다. 이용자에게 불리한 변경의 경우 30일 전에 공지합니다.',
        '③ 이용자가 변경된 약관에 동의하지 않는 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.',
      ],
    },
    {
      heading: '제4조 (서비스의 내용)',
      paragraphs: ['① 회사는 다음의 서비스를 제공합니다.'],
      list: [
        '강의 콘텐츠 기반의 학습 자료 제공',
        '학습 문항의 생성·제공 및 자동 채점',
        'AI 튜터를 통한 질의응답 및 학습 대화',
        '학습 활동 현황의 이용자 본인 제공',
      ],
      note:
        '② 회사는 서비스의 내용을 변경할 수 있으며, 변경 시 그 내용을 서비스 내에 공지합니다. ③ 서비스는 소속 대학과의 계약에 따라 제공되며, 계약 기간의 종료와 함께 서비스 제공이 종료될 수 있습니다. 이 경우 회사는 종료 예정일을 사전에 공지합니다.',
    },
    {
      heading: '제5조 (이용계약의 성립)',
      paragraphs: [
        '① 이용계약은 이용자가 이 약관과 개인정보 처리방침에 동의하고 회원가입을 신청한 후 회사가 이를 승낙함으로써 성립합니다.',
        '② 회사는 다음의 경우 이용 신청을 승낙하지 않거나 사후에 이용계약을 해지할 수 있습니다.',
      ],
      list: [
        '소속 대학이 발급한 이메일 주소가 아닌 경우',
        '타인의 정보를 도용하거나 허위 정보를 기재한 경우',
        '만 14세 미만인 경우',
      ],
    },
    {
      heading: '제6조 (회원의 의무)',
      paragraphs: ['① 이용자는 다음의 행위를 하여서는 안 됩니다.'],
      list: [
        '계정을 타인에게 양도·대여하거나 공유하는 행위',
        '서비스를 통해 제공되는 학습 콘텐츠를 무단으로 복제·배포·전송하는 행위',
        '자동화된 수단을 이용하여 비정상적으로 서비스에 접근하거나 대량의 요청을 발생시키는 행위',
        '서비스의 정상적인 운영을 방해하는 행위',
        '타인의 명예를 훼손하거나 불쾌감을 주는 내용을 입력하는 행위',
      ],
      note:
        '② 이용자는 계정 정보를 스스로 관리할 책임이 있으며, 관리 소홀로 발생한 손해에 대해 회사는 책임지지 않습니다.',
    },
    {
      heading: '제7조 (서비스 이용의 제한)',
      paragraphs: [
        '① 회사는 이용자가 제6조를 위반한 경우 사전 통지 후 서비스 이용을 제한할 수 있습니다. 다만 긴급한 경우에는 이용을 먼저 제한한 후 통지할 수 있습니다.',
        '② 회사는 서비스의 안정적 운영을 위하여 이용자별 일정 기간 내 요청 횟수를 제한할 수 있습니다.',
      ],
    },
    {
      heading: '제8조 (게시물의 관리)',
      paragraphs: [
        '① 이용자가 서비스에 입력한 질문·답변 등의 내용에 대한 책임은 해당 이용자에게 있습니다.',
        '② 회사는 이용자가 입력한 내용이 관련 법령이나 이 약관을 위반하는 경우 이를 삭제하거나 노출을 제한할 수 있습니다.',
      ],
    },
    {
      heading: '제9조 (지식재산권)',
      paragraphs: [
        '① 서비스에 포함된 학습 콘텐츠, 소프트웨어, 디자인 등에 대한 지식재산권은 회사 또는 정당한 권리자에게 귀속됩니다.',
        '② 이용자는 서비스를 이용함으로써 얻은 정보를 회사의 사전 승낙 없이 복제·전송·출판·배포하거나 영리 목적으로 이용할 수 없습니다.',
        '③ 이용자가 서비스에 입력한 내용에 대한 권리는 이용자에게 있으며, 회사는 서비스 제공 및 개선의 범위에서만 이를 이용합니다.',
      ],
    },
    {
      heading: '제10조 (면책조항)',
      paragraphs: [
        '① 회사는 천재지변, 정전, 기간통신사업자의 서비스 중단 등 불가항력으로 인하여 서비스를 제공할 수 없는 경우 책임이 면제됩니다.',
        '② 회사는 AI 튜터가 생성한 응답의 정확성·완전성을 보증하지 않습니다. AI가 생성한 학습 자료 및 문항은 학습 보조 수단이며, 이용자는 이를 교재·강의 등 원 자료와 대조하여 확인할 책임이 있습니다. 회사는 AI 응답에 의존하여 발생한 학업상 결과에 대해 책임지지 않습니다.',
        '③ 회사는 이용자의 귀책사유로 인한 서비스 이용 장애에 대해 책임지지 않습니다.',
      ],
    },
    {
      heading: '제11조 (준거법 및 관할)',
      paragraphs: [
        '① 이 약관의 해석 및 회사와 이용자 간의 분쟁에는 대한민국 법령을 적용합니다.',
        '② 서비스 이용과 관련한 분쟁에 대한 소송은 민사소송법상의 관할법원에 제기합니다.',
      ],
    },
  ],
  footer: '부칙 — 이 약관은 2026년 9월 1일부터 시행합니다.',
}

export const TERMS_EN: LegalDocumentProps = {
  title: 'Terms of Service',
  effectiveLabel: `Effective: September 1, 2026 · Version ${TERMS_VERSION}`,
  draftWarning: DRAFT_EN,
  articles: [
    {
      heading: 'Article 1 (Purpose)',
      paragraphs: [
        'These Terms govern the rights, obligations, and responsibilities between ClassDuo Inc. ("the Company") and users of the learning support service "ClassDuo" (the "Service").',
      ],
    },
    {
      heading: 'Article 2 (Definitions)',
      list: [
        '"Service" means all learning support features provided by the Company, including content viewing, question solving, and AI tutor conversations.',
        '"User" means a person who agrees to these Terms and uses the Service.',
        '"Account" means the combination of email address and password set by the user for identification and use of the Service.',
        '"Learning activity records" means question-solving history, AI tutor conversation history, content viewing records, and similar data generated while using the Service.',
      ],
    },
    {
      heading: 'Article 3 (Effect and Amendment of Terms)',
      paragraphs: [
        '(1) These Terms take effect upon being posted within the Service.',
        '(2) The Company may amend these Terms within the limits of applicable law, announcing any amendment in the Service at least 7 days before it takes effect, or at least 30 days in advance where the amendment is unfavorable to users.',
        '(3) A user who does not agree to the amended Terms may stop using the Service and delete their account.',
      ],
    },
    {
      heading: 'Article 4 (Scope of the Service)',
      paragraphs: ['(1) The Company provides the following.'],
      list: [
        'Learning materials based on lecture content',
        'Generation and delivery of practice questions with automatic grading',
        'Question answering and learning dialogue through the AI tutor',
        'Presentation of the user’s own learning activity status',
      ],
      note:
        '(2) The Company may change the contents of the Service and will announce such changes within the Service. (3) The Service is provided under a contract with the user’s university and may terminate when that contract ends. The Company will announce the planned termination date in advance.',
    },
    {
      heading: 'Article 5 (Formation of the Use Agreement)',
      paragraphs: [
        '(1) The use agreement is formed when the user agrees to these Terms and the Privacy Policy, applies for membership, and the Company accepts the application.',
        '(2) The Company may refuse an application or terminate the agreement afterwards in the following cases.',
      ],
      list: [
        'The email address is not one issued by the user’s university',
        'The user has misappropriated another person’s information or provided false information',
        'The user is under 14 years of age',
      ],
    },
    {
      heading: 'Article 6 (User Obligations)',
      paragraphs: ['(1) Users must not do any of the following.'],
      list: [
        'Transfer, lend, or share their account with others',
        'Reproduce, distribute, or transmit learning content provided through the Service without authorization',
        'Access the Service abnormally by automated means or generate a large volume of requests',
        'Interfere with the normal operation of the Service',
        'Enter content that defames others or causes offense',
      ],
      note:
        '(2) Users are responsible for managing their own account credentials, and the Company is not liable for damage arising from negligent management.',
    },
    {
      heading: 'Article 7 (Restrictions on Use)',
      paragraphs: [
        '(1) Where a user violates Article 6, the Company may restrict use of the Service after prior notice. In urgent cases the Company may restrict use first and give notice afterwards.',
        '(2) The Company may limit the number of requests per user within a given period to maintain stable operation of the Service.',
      ],
    },
    {
      heading: 'Article 8 (Management of Submitted Content)',
      paragraphs: [
        '(1) Users are responsible for the content of questions, answers, and other material they enter into the Service.',
        '(2) The Company may delete or restrict the display of entered content that violates applicable law or these Terms.',
      ],
    },
    {
      heading: 'Article 9 (Intellectual Property)',
      paragraphs: [
        '(1) Intellectual property rights in the learning content, software, and design included in the Service belong to the Company or the rightful holder.',
        '(2) Users may not reproduce, transmit, publish, distribute, or commercially exploit information obtained through the Service without the Company’s prior consent.',
        '(3) Rights in content entered by users belong to those users; the Company uses such content only to the extent necessary to provide and improve the Service.',
      ],
    },
    {
      heading: 'Article 10 (Disclaimer)',
      paragraphs: [
        '(1) The Company is exempt from liability where it cannot provide the Service due to force majeure, including natural disaster, power failure, or interruption of telecommunications services.',
        '(2) The Company does not warrant the accuracy or completeness of responses generated by the AI tutor. AI-generated materials and questions are study aids; users are responsible for verifying them against original sources such as textbooks and lectures. The Company is not liable for academic outcomes arising from reliance on AI responses.',
        '(3) The Company is not liable for service disruptions attributable to the user.',
      ],
    },
    {
      heading: 'Article 11 (Governing Law and Jurisdiction)',
      paragraphs: [
        '(1) The laws of the Republic of Korea apply to the interpretation of these Terms and to disputes between the Company and users.',
        '(2) Lawsuits regarding disputes related to use of the Service shall be brought before the court having jurisdiction under the Civil Procedure Act.',
      ],
    },
  ],
  footer: 'Addendum — These Terms take effect on September 1, 2026.',
}
