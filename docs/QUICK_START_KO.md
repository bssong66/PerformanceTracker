# Supabase 빠른 시작 가이드

## 🚀 5분 안에 시작하기

### 1단계: Supabase 프로젝트 생성 (2분)

1. https://supabase.com 접속 → 회원가입/로그인
2. "New Project" 클릭
3. 입력:
   - Name: `performance-tracker`
   - Database Password: **강력한 비밀번호 생성 후 저장!**
   - Region: `Northeast Asia (Seoul)` 또는 가까운 지역
4. "Create new project" 클릭 → 2분 대기

### 2단계: 연결 정보 복사 (1분)

#### A. API 정보 가져오기
1. Dashboard → Settings → API
2. 복사할 정보:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...` (긴 문자열)
   - **service_role key**: `eyJhbGc...` (긴 문자열) ⚠️ 절대 공개하지 말것!

#### B. 데이터베이스 URL 가져오기
1. Dashboard → Settings → Database
2. "Connection string" 탭 클릭
3. **"Connection pooling"** 선택 (중요!)
4. Mode: **"Transaction"** 선택
5. 전체 URL 복사: `postgresql://postgres.xxxxx:...`

### 3단계: .env 파일 설정 (1분)

프로젝트 루트에 `.env` 파일 생성/수정:

```env
# 2단계 A에서 복사한 정보
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 2단계 B에서 복사한 URL (Connection Pooling!)
DATABASE_URL=postgresql://postgres.xxxxx:[비밀번호]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres

# 랜덤 문자열 생성
SESSION_SECRET=your-random-secret-key-here
```

⚠️ **주의사항**:
- `DATABASE_URL`에 **1단계에서 설정한 비밀번호** 입력
- **Connection Pooling URL** 사용 (포트 6543)
- `pooler.supabase.com` 확인

### 4단계: 데이터베이스 스키마 적용 (1분)

```bash
# 터미널에서 실행
npm run db:push
```

✅ 성공 메시지가 나오면 완료!

### 5단계: 애플리케이션 실행

```bash
npm run dev
```

브라우저에서 http://localhost:5000 접속

---

## 📋 체크리스트

설정이 제대로 되었는지 확인:

- [ ] Supabase 프로젝트 생성 완료
- [ ] `.env` 파일에 5개 환경 변수 설정
  - [ ] SUPABASE_URL
  - [ ] SUPABASE_SERVICE_ROLE_KEY
  - [ ] VITE_SUPABASE_URL
  - [ ] VITE_SUPABASE_ANON_KEY
  - [ ] DATABASE_URL (Connection Pooling, 포트 6543)
- [ ] `npm run db:push` 성공
- [ ] `npm run dev` 실행되고 오류 없음

---

## 🔧 자주 발생하는 오류

### "getaddrinfo ENOTFOUND"
❌ **원인**: DATABASE_URL이 잘못됨

✅ **해결**:
1. Supabase Dashboard → Settings → Database
2. "Connection string" 탭
3. **"Connection pooling"** 선택 확인
4. Mode: **"Transaction"** 확인
5. URL 다시 복사해서 `.env`에 붙여넣기

### "password authentication failed"
❌ **원인**: 비밀번호가 틀림

✅ **해결**:
1. Supabase Dashboard → Settings → Database
2. "Reset database password" 클릭
3. 새 비밀번호 설정
4. `.env`의 DATABASE_URL에서 비밀번호 부분만 변경
   ```
   postgresql://postgres.xxxxx:[새_비밀번호]@aws...
   ```

### "DATABASE_URL must be set"
❌ **원인**: `.env` 파일을 못 찾음

✅ **해결**:
1. `.env` 파일이 프로젝트 **루트 폴더**에 있는지 확인
2. 파일 이름이 정확히 `.env`인지 확인 (`.env.txt` 아님)
3. 터미널을 재시작하고 다시 실행

---

## 🎯 다음은?

### Storage 설정 (파일 업로드용)
1. Dashboard → Storage
2. "New bucket" 클릭
3. Name: `performance-tracker-files`
4. Public: **체크 해제** (비공개)
5. "Create bucket" 클릭

### 데이터 확인
```bash
# Drizzle Studio로 데이터 관리
npm run db:studio
```

브라우저에서 데이터베이스 테이블을 시각적으로 확인 가능

---

## 📚 더 자세한 정보

- [완전한 설정 가이드](SUPABASE_SETUP.md) - 모든 세부 사항
- [변경 내역](CHANGES.md) - 무엇이 바뀌었는지
- [마이그레이션 요약](MIGRATION_SUMMARY_KO.md) - 요약 정보

---

## 💡 팁

### 환경 변수 확인하기
```bash
# Windows PowerShell
$env:DATABASE_URL

# Windows CMD
echo %DATABASE_URL%

# Git Bash (Windows)
echo $DATABASE_URL
```

### Connection String 형식
```
올바른 형식 (Connection Pooling):
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
                                                                    ^^^^^^             ^^^^
                                                                   pooler              6543

틀린 형식 (Direct Connection):
postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
                                  ^^                           ^^^^
                                  db                           5432
```

### 비밀번호에 특수문자가 있다면
URL 인코딩 필요:
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `&` → `%26`
- `%` → `%25`

예시:
```
비밀번호: my$ecret@123
인코딩: my%24ecret%40123
```

---

## 🆘 도움이 필요하면

1. [SUPABASE_SETUP.md](SUPABASE_SETUP.md) 문서의 트러블슈팅 섹션 확인
2. Supabase Dashboard의 Logs 탭에서 오류 확인
3. 서버 콘솔 로그 확인
4. `.env` 파일의 모든 값이 올바른지 재확인
