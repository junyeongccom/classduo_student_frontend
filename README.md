# ClassDuo Frontend

ClassDuo 학습 플랫폼의 프론트엔드 애플리케이션입니다.

## 🛠 기술 스택

### Core
- **Framework**: Next.js 15.1.0 (App Router)
- **Language**: TypeScript 5.x
- **React**: 18.3.1

### UI & Styling
- **CSS Framework**: Tailwind CSS 3.4.0
- **Icons**: Lucide React 0.363.0
- **Utility**: clsx, tailwind-merge

### State Management & Forms
- **Global State**: Zustand 4.5.0
- **Form Management**: React Hook Form 7.51.0
- **Validation**: Zod 3.22.4 + @hookform/resolvers 3.3.4

### Development Tools
- **Linter**: ESLint 9 + eslint-config-next
- **PostCSS**: autoprefixer

## 📁 프로젝트 구조

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # 인증 관련 페이지 (Route Group)
│   │   ├── (protected)/       # 로그인 필요 페이지 (Route Group)
│   │   ├── layout.tsx         # Root Layout
│   │   └── page.tsx           # Home Page
│   │
│   ├── features/              # 기능별 모듈
│   │   └── auth/              # 인증 기능
│   │       ├── api/           # API 호출
│   │       ├── components/    # 컴포넌트
│   │       ├── hooks/         # Custom Hooks
│   │       ├── store/         # Zustand Store
│   │       └── types.ts       # TypeScript 타입
│   │
│   └── shared/                # 공통 모듈
│       ├── components/        # 공통 컴포넌트
│       │   ├── common/        # 레이아웃 컴포넌트
│       │   └── ui/            # UI 컴포넌트
│       ├── constants/         # 상수
│       ├── hooks/             # 공통 Hooks
│       ├── lib/               # 유틸리티 함수
│       └── styles/            # 전역 스타일
│
├── public/                    # 정적 파일
├── .next/                     # Next.js 빌드 결과
└── node_modules/              # 의존성 패키지
```

## 🚀 시작하기

### 1. 패키지 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env.local` 파일 생성:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. 개발 서버 실행
```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

### 4. 빌드
```bash
npm run build
npm start
```

## 🔑 주요 기능

### 인증 (Authentication)
- 로그인/회원가입 모달
- JWT 토큰 기반 인증
- 이메일 인증
- 자동 로그인 (저장된 계정)

### 레이아웃
- 사이드바 (접기/펼치기)
- 상단 탭 네비게이션
- 반응형 디자인

### 페이지
- AI 튜터 (답변, 수업노트, 강의자료)
- 50초 복습/예습
- 과제 보조
- 시험 준비
- 마이페이지

## 📡 API 연동

백엔드 API: `http://localhost:8000`

### 주요 엔드포인트
- `POST /auth/signup` - 회원가입
- `POST /auth/login` - 로그인
- `GET /auth/me` - 사용자 정보 조회
- `POST /auth/resend-verification` - 인증 메일 재전송

## 🎨 디자인 시스템

### 색상
- Primary: `#46CD74` (초록색)
- Gray Scale: Tailwind 기본 팔레트

### 폰트
- Sans: Pretendard, -apple-system, BlinkMacSystemFont

## 📝 코딩 컨벤션

### 파일 명명
- 컴포넌트: PascalCase (예: `LoginModal.tsx`)
- 유틸리티: camelCase (예: `utils.ts`)
- 상수: UPPER_SNAKE_CASE (예: `API_ENDPOINTS`)

### 컴포넌트 구조
```typescript
'use client' // Client Component인 경우

import { ... } from '...'

// 타입 정의
interface Props { ... }

// 컴포넌트
export function ComponentName({ ... }: Props) {
  // hooks
  // handlers
  // render
}
```

### State Management
- **Global State**: Zustand (인증, 사용자 정보)
- **Local State**: useState
- **Form State**: React Hook Form

## 🔧 유용한 명령어

```bash
# 개발 서버
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 실행
npm start

# Linting
npm run lint
```

## 🤝 협업 가이드

### Git Workflow
1. 기능 브랜치 생성: `feature/기능명`
2. 작업 후 커밋
3. Pull Request 생성
4. 코드 리뷰 후 머지

### 브랜치 전략
- `main`: 프로덕션
- `develop`: 개발
- `feature/*`: 기능 개발

## 📚 참고 문서

- [Next.js 문서](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Hook Form](https://react-hook-form.com/)
- [Zustand](https://github.com/pmndrs/zustand)
- [Zod](https://zod.dev/)

## 🐛 트러블슈팅

### CORS 에러
백엔드에서 `http://localhost:3000` 허용 필요

### 환경 변수 인식 안 됨
- `.env.local` 파일 확인
- `NEXT_PUBLIC_` 접두사 확인
- 개발 서버 재시작

## 📞 문의

문제가 있거나 질문이 있으면 팀에 문의해주세요.

