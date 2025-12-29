# OnlineExam Frontend

온라인 시험 관리 시스템의 React 기반 Frontend 애플리케이션.

## 기술 스택

- **Framework**: React 19 + TypeScript 5.x
- **Build Tool**: Vite 7.x
- **Routing**: TanStack Router
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **UI Components**: shadcn/ui + Tailwind CSS
- **Charts**: Recharts
- **Animation**: Framer Motion
- **Toast**: Sonner
- **HTTP Client**: Axios

## 개발 환경 설정

### 필수 요구사항

- Node.js 20+
- npm 10+

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (http://localhost:5173)
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 미리보기
npm run preview
```

## 프로젝트 구조

```
frontend/
├── src/
│   ├── api/              # API 클라이언트 및 엔드포인트
│   ├── components/       # 재사용 UI 컴포넌트
│   │   ├── animation/    # Framer Motion 애니메이션
│   │   ├── auth/         # 인증 관련 컴포넌트
│   │   ├── layout/       # 레이아웃 컴포넌트
│   │   └── ui/           # shadcn/ui 컴포넌트
│   ├── constants/        # 상수 정의
│   │   ├── examination.ts
│   │   ├── question.ts
│   │   ├── theme.ts
│   │   └── time.ts
│   ├── features/         # 페이지별 기능 모듈
│   │   ├── analytics/    # 분석 대시보드
│   │   ├── auth/         # 로그인/회원가입
│   │   ├── dashboard/    # 메인 대시보드
│   │   ├── examinations/ # 시험 관리 (교사)
│   │   ├── exams/        # 시험 응시 (학생)
│   │   ├── profile/      # 프로필 관리
│   │   ├── questions/    # 문제 관리
│   │   ├── settings/     # 설정
│   │   ├── students/     # 학생 관리
│   │   └── testpapers/   # 시험지 관리
│   ├── stores/           # Zustand 상태 관리
│   ├── types/            # TypeScript 타입 정의
│   ├── utils/            # 유틸리티 함수
│   ├── App.tsx           # 라우팅 설정
│   └── index.css         # 글로벌 스타일
├── public/
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## 주요 기능

### 교사 (Teacher)

- **대시보드**: 통계, 차트, 최근 활동
- **문제 관리**: CRUD, 공유, 필터링
- **시험지 관리**: 문제 구성, 배점 설정
- **시험 관리**: 일정, 학생 등록, 결과 조회
- **학생 관리**: 목록 조회, 시험 등록
- **분석**: 성적 통계, 추이 분석

### 학생 (Student)

- **대시보드**: 통계, 예정 시험, 최근 성적
- **시험 목록**: 응시 가능 시험 조회
- **시험 응시**: 실시간 답안 저장, 제출
- **성적 조회**: 결과 상세, 오답 확인

## 코드 품질

### TypeScript

```bash
# 타입 검사
npx tsc --noEmit
```

### ESLint

```bash
# Lint 검사
npm run lint

# Lint 자동 수정
npm run lint -- --fix
```

### 빌드 검증

```bash
# 프로덕션 빌드 테스트
npm run build
```

## 주요 개선 사항 (Phase 1-4)

### Phase 1: 상수 추출
- 하드코딩된 값을 `constants/` 디렉터리로 분리
- 차트 색상, 라벨 등 재사용 가능한 상수화

### Phase 2: 코드 품질
- `alert()` 호출을 `sonner` Toast로 교체 (19개 파일)
- TypeScript `any` 타입 제거

### Phase 3: 성능 최적화
- CSS `transition: all` 최적화
- LocalStorage 에러 핸들링 (Private Browsing 지원)
- `useCallback`, `useMemo` 적용

### Phase 4: Animation
- Framer Motion 기반 페이지 전환 애니메이션
- 카드 hover 효과, 리스트 stagger 애니메이션

## 환경 변수

```bash
# .env.local
VITE_API_URL=http://localhost:8000/api/v1
```

## 빌드 정보

- **Bundle Size**: ~1,148 KB (gzip: 338 KB)
- **TypeScript**: No errors
- **Build Time**: ~2.6s

## 관련 문서

- [Backend README](../examonline/README.md)
- [Troubleshooting Guide](../examonline/docs/troubleshooting.md)
