# GitHub에서 프로젝트 실행하기

## 🚀 방법 1: GitHub Codespaces (추천)

### 장점
- 브라우저에서 바로 실행 가능
- 별도 설치 불필요
- 모든 의존성 자동 설정

### 실행 방법
1. GitHub 리포지터리 페이지에서 초록색 "Code" 버튼 클릭
2. "Codespaces" 탭 선택
3. "Create codespace on main" 클릭
4. Codespace가 열리면 터미널에서 다음 명령어 실행:

```bash
# 환경 변수 설정 (필수!)
cp .env.example .env
# .env 파일을 편집하여 Supabase 정보 입력

# 데이터베이스 설정
npm run db:push

# 개발 서버 실행
npm run dev
```

5. 포트 5000이 자동으로 포워딩되어 브라우저에서 접속 가능

## 🌐 방법 2: GitHub Pages (정적 배포)

### 설정 방법
1. 리포지터리 Settings → Pages 이동
2. Source를 "GitHub Actions"로 설정
3. 환경 변수 설정:
   - Settings → Secrets and variables → Actions
   - 다음 시크릿 추가:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`

### 제한사항
- 정적 사이트이므로 서버 기능 제한
- 데이터베이스 연결 불가
- 프론트엔드만 실행 가능

## 🔧 방법 3: Replit (현재 설정됨)

### 실행 방법
1. [replit.com/@bssonggm/PerformanceTracker](https://replit.com/@bssonggm/PerformanceTracker) 접속
2. "Fork" 버튼 클릭하여 복사본 생성
3. 환경 변수 설정 후 실행

## 📱 방법 4: 로컬 실행

### 필수 요구사항
- Node.js 18+
- Supabase 계정

### 실행 방법
```bash
# 저장소 클론
git clone https://github.com/bssong66/PerformanceTracker.git
cd PerformanceTracker

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일 편집

# 데이터베이스 설정
npm run db:push

# 개발 서버 실행
npm run dev
```

## 🔐 환경 변수 설정

### Supabase 설정
1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. 프로젝트 설정에서 다음 정보 복사:
   - Project URL
   - anon public key
   - service_role key

### .env 파일 예시
```env
# Supabase 설정
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# 데이터베이스
DATABASE_URL=your_database_url

# 세션
SESSION_SECRET=your_session_secret
```

## 🐛 자주 발생하는 문제

### 1. 환경 변수 누락
- `.env` 파일이 제대로 설정되었는지 확인
- Supabase 프로젝트가 활성화되어 있는지 확인

### 2. 데이터베이스 연결 오류
- `npm run db:push` 명령어로 스키마 적용
- DATABASE_URL이 올바른지 확인

### 3. 포트 충돌
- 다른 애플리케이션이 5000번 포트를 사용 중인지 확인
- `npm run dev` 실행 시 다른 포트 사용 가능

## 📞 도움이 필요하신가요?

- [빠른 시작 가이드](QUICK_START_KO.md) 참고
- [Supabase 설정 가이드](SUPABASE_SETUP.md) 참고
- Issues에 문제 보고
