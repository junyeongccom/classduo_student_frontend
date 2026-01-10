# 환경 변수 설정 가이드

## 📋 개요

프론트엔드 개발을 시작하기 전에 환경 변수를 설정해야 합니다.

## 🔧 설정 방법

### 1. `.env.local` 파일 생성

프로젝트 루트(`frontend/`)에 `.env.local` 파일을 생성하세요:

```bash
# frontend 폴더에서
touch .env.local
```

### 2. 환경 변수 추가
!
`.env.local` 파일에 다음 내용을 복사하여 붙여넣으세요:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# Supabase Configuration (Optional)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### 3. 값 수정

- `NEXT_PUBLIC_API_URL`: 백엔드 서버 주소 (기본값: `http://localhost:8000`)
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL (팀원에게 문의)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase Anon Key (팀원에게 문의)

## ⚠️ 주의사항

### Git에 커밋하지 마세요!

`.env.local` 파일은 **절대로 Git에 커밋하면 안 됩니다**. 이미 `.gitignore`에 포함되어 있습니다:

```gitignore
# .gitignore
.env*.local
.env
```

### 팀원과 공유 방법

1. **Slack/Discord**: 비공개 메시지로 전달
2. **1Password/LastPass**: 팀 공유 Vault 사용
3. **환경 변수 관리 도구**: Vercel, Railway 등

## 🔍 환경 변수 확인

개발 서버 실행 후 브라우저 콘솔에서 확인:

```javascript
console.log(process.env.NEXT_PUBLIC_API_URL)
// 출력: http://localhost:8000
```

## 🚀 다음 단계

환경 변수 설정이 완료되었다면:

1. 백엔드 서버 실행:
   ```bash
   cd ../backend
   docker-compose up -d
   ```

2. 프론트엔드 개발 서버 실행:
   ```bash
   npm run dev
   ```

3. 브라우저에서 확인:
   ```
   http://localhost:3000
   ```

## 📝 참고

- Next.js 환경 변수 문서: https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
- `NEXT_PUBLIC_` 접두사가 붙은 변수만 브라우저에서 접근 가능합니다.

