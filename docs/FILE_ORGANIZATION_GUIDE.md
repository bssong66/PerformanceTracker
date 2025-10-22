# 📁 파일 정리 가이드

이 문서는 PerformanceTracker 프로젝트의 파일 구조와 정리 방법을 설명합니다.

## 🗂️ **폴더 구조**

```
PerformanceTracker/
├── 📁 config/                    # 설정 파일들
│   ├── components.json           # UI 컴포넌트 설정
│   ├── drizzle.config.ts         # 데이터베이스 ORM 설정
│   ├── package.json              # 프로젝트 의존성
│   ├── package-lock.json         # 의존성 잠금 파일
│   ├── postcss.config.js         # PostCSS 설정
│   ├── tailwind.config.ts        # Tailwind CSS 설정
│   ├── tsconfig.json             # TypeScript 설정
│   └── vite.config.ts            # Vite 빌드 도구 설정
│
├── 📁 docs/                      # 문서 파일들
│   ├── data-integrity-report.md  # 데이터 무결성 리포트
│   ├── mobile-optimization-report.md # 모바일 최적화 리포트
│   ├── replit.md                 # Replit 관련 문서
│   └── FILE_ORGANIZATION_GUIDE.md # 이 파일
│
├── 📁 tests/                     # 테스트 및 디버그 파일들
│   ├── temp_debug.js             # 임시 디버그 파일
│   ├── test-calendar-integrity.js # 캘린더 무결성 테스트
│   ├── test-calendar-mobile.js   # 캘린더 모바일 테스트
│   ├── test-dashboard-integrity.js # 대시보드 무결성 테스트
│   ├── test-data-integrity.js    # 데이터 무결성 테스트
│   ├── test-db-integrity.js      # 데이터베이스 무결성 테스트
│   ├── test-mobile-css-analysis.js # 모바일 CSS 분석
│   ├── test-mobile-performance-analysis.js # 모바일 성능 분석
│   ├── test-project-functionality.js # 프로젝트 기능 테스트
│   ├── test-project-integrity.js # 프로젝트 무결성 테스트
│   └── test-project-mobile.js    # 프로젝트 모바일 테스트
│
├── 📁 backup/                    # 백업 파일들
│   └── .replit                   # Replit 설정 파일 (백업)
│
├── 📁 env/                       # 환경 설정 파일들
│   └── (환경 변수 파일들)
│
├── 📁 client/                    # React 프론트엔드
│   ├── index.html
│   └── src/
│       ├── components/           # React 컴포넌트들
│       ├── hooks/                # 커스텀 훅들
│       ├── lib/                  # 유틸리티 라이브러리
│       ├── pages/                # 페이지 컴포넌트들
│       └── ...
│
├── 📁 server/                    # Express 백엔드
│   ├── db.ts                     # 데이터베이스 연결
│   ├── index.ts                  # 서버 진입점
│   ├── routes.ts                 # API 라우트
│   ├── storage.ts                # 데이터 저장소
│   └── ...
│
├── 📁 shared/                    # 공유 스키마 및 타입
│   └── schema.ts                 # 데이터베이스 스키마
│
├── 📁 uploads/                   # 업로드된 파일들
│   └── daily-reflections/        # 일일 성찰 파일들
│
└── 📁 attached_assets/           # 첨부된 에셋 파일들
    └── (이미지 및 기타 파일들)
```

## 📋 **파일 분류 기준**

### **config/ 폴더**
- 프로젝트 설정 파일들
- 빌드 도구 설정
- 의존성 관리 파일들
- 개발 환경 설정

### **docs/ 폴더**
- 모든 .md 파일들
- 프로젝트 문서
- 리포트 및 분석 문서
- 가이드 문서

### **tests/ 폴더**
- 모든 테스트 파일들
- 디버그 파일들
- 성능 분석 스크립트들
- 무결성 검사 스크립트들

### **backup/ 폴더**
- 백업 파일들
- 이전 버전 파일들
- 더 이상 사용하지 않는 설정 파일들

### **env/ 폴더**
- 환경 변수 파일들
- 설정 예시 파일들

## 🔧 **파일 이동 후 업데이트된 참조**

### **vite.config.ts 경로 변경**
```typescript
// server/vite.ts에서
import viteConfig from "../config/vite.config";
```

## 📝 **파일 정리 규칙**

1. **새로운 설정 파일 추가시**: `config/` 폴더에 배치
2. **새로운 문서 작성시**: `docs/` 폴더에 배치
3. **새로운 테스트 작성시**: `tests/` 폴더에 배치
4. **백업 파일 생성시**: `backup/` 폴더에 배치
5. **환경 설정 파일**: `env/` 폴더에 배치

## 🚀 **개발 워크플로우**

### **설정 파일 수정**
```bash
# config 폴더에서 설정 파일 수정
cd config/
# package.json, vite.config.ts 등 수정
```

### **문서 작성**
```bash
# docs 폴더에 새 문서 추가
cd docs/
# 새로운 .md 파일 생성
```

### **테스트 실행**
```bash
# tests 폴더에서 테스트 실행
cd tests/
node test-*.js
```

## ⚠️ **주의사항**

1. **경로 참조**: 파일을 이동한 후 해당 파일을 참조하는 다른 파일들의 경로를 업데이트해야 합니다.
2. **빌드 설정**: config 폴더의 파일들이 올바른 위치에서 참조되는지 확인하세요.
3. **환경 변수**: env 폴더의 파일들이 .gitignore에 포함되어 있는지 확인하세요.

## 🔄 **정리 완료 상태**

✅ **완료된 작업들:**
- [x] config/ 폴더에 설정 파일들 이동
- [x] docs/ 폴더에 .md 파일들 이동
- [x] tests/ 폴더에 테스트 파일들 이동
- [x] backup/ 폴더에 .replit 파일 이동
- [x] vite.config.ts 경로 참조 업데이트

---

**프로젝트 파일들이 체계적으로 정리되었습니다! 🎉**
