# Performance Tracker 문서

Supabase 데이터베이스 마이그레이션 관련 문서 모음

## 📚 문서 목록

### 🚀 시작하기
- **[QUICK_START_KO.md](QUICK_START_KO.md)** ⭐ 처음 사용자는 여기서 시작!
  - 5분 안에 Supabase 설정하기
  - 단계별 빠른 가이드
  - 자주 발생하는 오류 해결

### 📖 상세 가이드
- **[SUPABASE_SETUP.md](SUPABASE_SETUP.md)**
  - 완전한 Supabase 설정 가이드
  - 데이터베이스 연결 상세 설명
  - Storage 설정 방법
  - RLS 정책 설정
  - 트러블슈팅 가이드

### 📋 마이그레이션 정보
- **[MIGRATION_SUMMARY_KO.md](MIGRATION_SUMMARY_KO.md)**
  - 마이그레이션 작업 요약
  - 완료된 작업 목록
  - 사용자가 해야 할 일
  - 주요 변경 사항

- **[CHANGES.md](CHANGES.md)**
  - 상세한 변경 내역
  - 파일별 변경 사항
  - 기술적 개선 사항
  - 롤백 방법

- **[CLEANUP_SUMMARY.md](CLEANUP_SUMMARY.md)**
  - 프로젝트 정리 완료 보고서
  - 삭제된 파일 및 폴더 목록
  - 코드 변경 사항
  - 최종 프로젝트 구조

## 🎯 어떤 문서를 읽어야 할까요?

### 처음 시작하는 경우
1. [QUICK_START_KO.md](QUICK_START_KO.md) - 5분 빠른 시작
2. [MIGRATION_SUMMARY_KO.md](MIGRATION_SUMMARY_KO.md) - 무엇이 바뀌었는지 확인

### 자세히 알고 싶은 경우
1. [SUPABASE_SETUP.md](SUPABASE_SETUP.md) - 완전한 설정 가이드
2. [CHANGES.md](CHANGES.md) - 모든 변경 사항

### 문제가 발생한 경우
1. [QUICK_START_KO.md](QUICK_START_KO.md) - 자주 발생하는 오류
2. [SUPABASE_SETUP.md](SUPABASE_SETUP.md) - 트러블슈팅 섹션

## 🔗 외부 링크

- [Supabase 공식 문서](https://supabase.com/docs)
- [Drizzle ORM 문서](https://orm.drizzle.team)
- [Supabase Dashboard](https://supabase.com/dashboard)

## 📝 환경 변수 설정

루트 폴더의 `.env.example` 파일을 참고하여 `.env` 파일을 생성하세요.

필요한 환경 변수:
```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
DATABASE_URL=
SESSION_SECRET=
```

자세한 내용은 [QUICK_START_KO.md](QUICK_START_KO.md)를 참고하세요.
