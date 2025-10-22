# Supabase Setup Guide

이 가이드는 Performance Tracker 애플리케이션을 Supabase 데이터베이스와 연결하는 방법을 설명합니다.

## 📋 목차
1. [Supabase 프로젝트 생성](#1-supabase-프로젝트-생성)
2. [환경 변수 설정](#2-환경-변수-설정)
3. [데이터베이스 연결 확인](#3-데이터베이스-연결-확인)
4. [스키마 마이그레이션](#4-스키마-마이그레이션)
5. [Storage 설정 (파일 업로드)](#5-storage-설정)
6. [트러블슈팅](#6-트러블슈팅)

---

## 1. Supabase 프로젝트 생성

### 1.1 Supabase 계정 생성
1. [Supabase](https://supabase.com) 웹사이트 방문
2. "Start your project" 클릭하여 회원가입/로그인
3. GitHub, Google 계정으로 간편 가입 가능

### 1.2 새 프로젝트 생성
1. Dashboard에서 "New Project" 클릭
2. 프로젝트 정보 입력:
   - **Name**: 프로젝트 이름 (예: performance-tracker)
   - **Database Password**: 강력한 비밀번호 생성 (저장 필수!)
   - **Region**: 가장 가까운 지역 선택 (예: Northeast Asia (Seoul))
   - **Pricing Plan**: Free tier 선택 가능
3. "Create new project" 클릭
4. 프로젝트 생성 완료까지 약 2분 대기

---

## 2. 환경 변수 설정

### 2.1 Supabase 연결 정보 확인

프로젝트가 생성되면 Dashboard에서 필요한 정보를 확인합니다:

#### Project Settings → API
1. **Project URL**: `https://xxxxx.supabase.co`
2. **API Keys**:
   - `anon` `public` key: 클라이언트에서 사용
   - `service_role` key: 서버에서 사용 (절대 노출 금지!)

#### Project Settings → Database
1. **Connection string** 탭에서:
   - **Connection pooling** 선택
   - **Mode**: Transaction 선택
   - **Connection string** 복사

   형식 예시:
   ```
   postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres
   ```

### 2.2 .env 파일 설정

프로젝트 루트에 `.env` 파일 생성 또는 수정:

```env
# Supabase Configuration
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database Configuration (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres

# Session Configuration
SESSION_SECRET=your-random-secret-key-here
```

#### 중요 사항:
- `[PROJECT_REF]`: Supabase 프로젝트 참조 ID (URL에서 확인)
- `[PASSWORD]`: 프로젝트 생성 시 설정한 데이터베이스 비밀번호
- `[REGION]`: 선택한 지역 (예: ap-northeast-2)
- **Connection pooling** 사용 (포트 6543)
- **Transaction mode** 권장 (Drizzle ORM 호환성)

### 2.3 환경 변수 보안
- `.env` 파일을 `.gitignore`에 추가 (이미 추가되어 있음)
- `.env.example` 파일에 변수 이름만 저장 (값 제외)
- 절대 `SERVICE_ROLE_KEY`를 클라이언트 코드에 노출하지 않기

---

## 3. 데이터베이스 연결 확인

### 3.1 연결 테스트

```bash
# Drizzle Studio로 연결 확인
npm run db:studio
```

브라우저가 열리고 데이터베이스 테이블을 확인할 수 있으면 연결 성공!

### 3.2 연결 오류 해결

**오류: "getaddrinfo ENOTFOUND"**
- DATABASE_URL 확인
- Connection pooling 사용 확인 (포트 6543)
- 지역(region) 확인

**오류: "password authentication failed"**
- 비밀번호 확인
- 특수문자가 있다면 URL 인코딩 필요

**오류: "SSL connection required"**
- 코드에 SSL 설정 이미 추가됨 (server/db.ts)

---

## 4. 스키마 마이그레이션

### 4.1 현재 스키마를 Supabase에 적용

```bash
# 1. 마이그레이션 파일 생성 (스키마 변경 시)
npm run db:generate

# 2. 마이그레이션 실행
npm run db:migrate

# 또는 직접 푸시 (개발 환경)
npm run db:push
```

### 4.2 기존 데이터 마이그레이션

기존 PostgreSQL에서 Supabase로 데이터 이동:

```bash
# 1. 기존 DB에서 데이터 덤프
pg_dump -h old-host -U username -d database > backup.sql

# 2. Supabase에 복원
psql "postgresql://postgres.[PROJECT_REF]:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres" < backup.sql
```

**주의**: Direct connection (포트 5432) 사용

### 4.3 Supabase Dashboard에서 확인

1. Dashboard → Table Editor
2. 생성된 테이블 목록 확인
3. 각 테이블의 데이터 확인 가능

---

## 5. Storage 설정 (파일 업로드)

### 5.1 Storage Bucket 생성

1. Dashboard → Storage
2. "New bucket" 클릭
3. Bucket 설정:
   - **Name**: `performance-tracker-files` (또는 원하는 이름)
   - **Public bucket**: 체크 해제 (비공개)
   - **File size limit**: 50MB (기본값)
   - **Allowed MIME types**: 필요시 제한
4. "Create bucket" 클릭

### 5.2 Storage Policies 설정

보안을 위해 RLS (Row Level Security) 정책 설정:

```sql
-- 인증된 사용자만 자신의 파일 업로드 가능
CREATE POLICY "Users can upload their own files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'performance-tracker-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 인증된 사용자는 자신의 파일만 조회 가능
CREATE POLICY "Users can view their own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'performance-tracker-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 인증된 사용자는 자신의 파일만 삭제 가능
CREATE POLICY "Users can delete their own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'performance-tracker-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### 5.3 코드 설정 확인

파일 업로드 코드는 이미 구현되어 있음:
- `server/supabaseStorage.ts`: 파일 업로드 로직
- `client/src/lib/supabase.ts`: 클라이언트 설정

---

## 6. 트러블슈팅

### 6.1 일반적인 문제

#### 연결 타임아웃
- **원인**: 방화벽 또는 네트워크 제한
- **해결**: VPN 비활성화, 다른 네트워크 시도

#### Pool 연결 오류
- **원인**: 너무 많은 동시 연결
- **해결**: Connection pooling 사용 (포트 6543)

#### 인증 오류
- **원인**: 잘못된 API 키 또는 비밀번호
- **해결**: Supabase Dashboard에서 재확인

### 6.2 데이터베이스 연결 디버깅

```typescript
// server/db.ts에 디버깅 코드 추가
console.log('Connecting to:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));
```

### 6.3 Storage 업로드 오류

**오류: "Bucket not found"**
- Bucket 이름 확인
- Bucket이 생성되었는지 확인

**오류: "Permission denied"**
- RLS 정책 확인
- 인증 상태 확인

**오류: "File size limit exceeded"**
- Bucket 설정에서 크기 제한 확인
- Multer 설정 확인 (현재 50MB)

### 6.4 마이그레이션 오류

**오류: "relation already exists"**
```bash
# 마이그레이션 초기화
npm run db:push
```

**오류: "permission denied for schema public"**
- Supabase Dashboard → SQL Editor:
```sql
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
```

---

## 7. 프로덕션 체크리스트

배포 전 확인사항:

- [ ] 모든 환경 변수 설정 완료
- [ ] DATABASE_URL에 정확한 connection pooling URL 사용
- [ ] Storage bucket 생성 및 RLS 정책 설정
- [ ] 마이그레이션 성공적으로 완료
- [ ] 애플리케이션 정상 작동 확인
- [ ] .env 파일 절대 커밋하지 않기
- [ ] Supabase Dashboard에서 데이터 백업 설정
- [ ] Rate limiting 및 quota 확인

---

## 8. 추가 리소스

- [Supabase 공식 문서](https://supabase.com/docs)
- [Drizzle ORM with Supabase](https://orm.drizzle.team/docs/get-started-postgresql#supabase)
- [Supabase Storage 가이드](https://supabase.com/docs/guides/storage)
- [Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)

---

## 9. 지원

문제 발생 시:
1. [Supabase Discord](https://discord.supabase.com) 커뮤니티 질문
2. [GitHub Issues](https://github.com/supabase/supabase/issues) 검색
3. 프로젝트 README의 트러블슈팅 섹션 참고
