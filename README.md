# Performance Tracker

개인 목표 설정 및 생산성 관리를 위한 웹 애플리케이션

## 🌟 주요 기능

- **Foundation**: 개인 미션 및 핵심 가치 설정
- **Annual Goals**: 연간 목표 추적 및 관리
- **Project Management**: 다단계 프로젝트 관리 (계획, 실행, 결과)
- **Task Scheduling**: 작업 일정 관리
- **Calendar View**: 캘린더 기반 이벤트 관리
- **Habit Tracking**: 습관 추적 및 기록
- **Reviews**: 일간/주간/월간 회고 작성
- **Time Blocks**: 시간 블록 스케줄링

## 🚀 빠른 시작

### 필수 요구사항

- Node.js >= 18.0.0
- npm 또는 yarn
- Supabase 계정

### 설치 및 실행

1. **저장소 클론**
   ```bash
   git clone <repository-url>
   cd PerformanceTracker
   ```

2. **의존성 설치**
   ```bash
   npm install
   ```

3. **Supabase 설정** ⭐ 중요!

   상세 가이드: [docs/QUICK_START_KO.md](docs/QUICK_START_KO.md)

   간단 요약:
   - [Supabase](https://supabase.com)에서 프로젝트 생성
   - `.env` 파일 설정 (`.env.example` 참고)
   - 데이터베이스 스키마 적용: `npm run db:push`

4. **개발 서버 실행**
   ```bash
   npm run dev
   ```

   브라우저에서 http://localhost:5000 접속

## 📁 프로젝트 구조

```
├── client/src/          # React 프론트엔드
│   ├── components/      # 재사용 가능한 UI 컴포넌트
│   ├── pages/          # 페이지 컴포넌트
│   ├── hooks/          # 커스텀 React 훅
│   └── lib/            # 클라이언트 유틸리티
├── server/             # Express 백엔드
│   ├── routes.ts       # API 라우트
│   ├── db.ts          # 데이터베이스 연결
│   ├── storage.ts     # 데이터베이스 추상화 계층
│   └── supabase.ts    # Supabase 설정
├── shared/            # 공유 코드
│   └── schema.ts      # 데이터베이스 스키마
├── config/            # 설정 파일
├── migrations/        # 데이터베이스 마이그레이션
└── docs/             # 📚 문서
```

## 🛠️ 기술 스택

### Frontend
- React 18
- TypeScript
- Wouter (라우팅)
- TanStack Query (서버 상태 관리)
- Radix UI (UI 컴포넌트)
- Tailwind CSS (스타일링)

### Backend
- Express.js (TypeScript)
- Passport.js (인증)
- Drizzle ORM (데이터베이스)

### Database & Storage
- Supabase PostgreSQL
- Supabase Storage (파일 업로드)

### Build Tools
- Vite (빌드 도구)
- tsx (TypeScript 실행)

## 📚 문서

### Supabase 설정 (필수!)
- [빠른 시작 가이드](docs/QUICK_START_KO.md) - 5분 안에 시작하기
- [완전한 설정 가이드](docs/SUPABASE_SETUP.md) - 상세한 설정 방법
- [마이그레이션 요약](docs/MIGRATION_SUMMARY_KO.md) - 변경 사항 요약

### 개발 가이드
- [CLAUDE.md](CLAUDE.md) - 전체 아키텍처 및 개발 가이드
- [변경 내역](docs/CHANGES.md) - Supabase 마이그레이션 변경 사항

## 🔧 주요 명령어

### 개발
```bash
npm run dev          # 개발 서버 실행 (HMR)
npm run build        # 프로덕션 빌드
npm start            # 프로덕션 서버 실행
```

### 데이터베이스
```bash
npm run db:generate  # 마이그레이션 생성
npm run db:migrate   # 마이그레이션 실행
npm run db:push      # 스키마 직접 푸시 (개발 환경)
npm run db:studio    # Drizzle Studio 실행
```

## ⚙️ 환경 변수

`.env.example` 파일을 참고하여 `.env` 파일을 생성하세요.

필수 환경 변수:
- `SUPABASE_URL` - Supabase 프로젝트 URL
- `SUPABASE_SERVICE_ROLE_KEY` - 서버 측 관리자 키
- `VITE_SUPABASE_URL` - 클라이언트 측 프로젝트 URL
- `VITE_SUPABASE_ANON_KEY` - 클라이언트 측 공개 키
- `DATABASE_URL` - PostgreSQL 연결 문자열 (Connection Pooling)
- `SESSION_SECRET` - 세션 암호화 키

자세한 내용: [docs/QUICK_START_KO.md](docs/QUICK_START_KO.md)

## 🔐 인증

- Session 기반 인증 (express-session)
- Passport.js를 통한 로컬 인증
- 세션은 PostgreSQL에 저장

## 📦 배포

### 프로덕션 빌드
```bash
npm run build
npm start
```

### 체크리스트
- [ ] 모든 환경 변수 설정
- [ ] Supabase 프로젝트 설정 완료
- [ ] 데이터베이스 마이그레이션 적용
- [ ] Supabase Storage bucket 생성
- [ ] `.env` 파일 보안 확인 (절대 커밋하지 않기!)

## 🐛 트러블슈팅

일반적인 문제는 다음 문서를 참고하세요:
- [빠른 시작 가이드 - 자주 발생하는 오류](docs/QUICK_START_KO.md#-자주-발생하는-오류)
- [완전한 설정 가이드 - 트러블슈팅](docs/SUPABASE_SETUP.md#6-트러블슈팅)

## 📝 라이선스

MIT

## 🤝 기여

Issues와 Pull Requests는 언제나 환영합니다!
