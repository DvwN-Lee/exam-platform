# ExamOnline UI Mockups

온라인 시험 시스템의 현대적인 UI/UX 디자인 목업입니다.

## Design System

### Color Palette (Emerald Theme)

| 색상 | Hex Code | 용도 |
|------|----------|------|
| Primary | `#10B981` | 주요 액션, 브랜드 색상 |
| Primary Dark | `#059669` | Hover 상태, 강조 |
| Primary Light | `#34D399` | 보조 강조, Gradient |
| Background | `#F0FDF4` | 페이지 배경 (Light mode) |
| Surface | `#FFFFFF` | 카드, 패널 배경 |
| Text | `#1F2937` | 주요 텍스트 |
| Text Secondary | `#6B7280` | 보조 텍스트 |
| Success | `#22C55E` | 성공, 합격 |
| Warning | `#F59E0B` | 경고, 주의 |
| Error | `#EF4444` | 오류, 불합격 |

### Typography

- **Primary Font**: Noto Sans KR (한글)
- **Secondary Font**: Poppins (영문, 숫자)
- **Font Weights**: 400 (Regular), 500 (Medium), 600 (Semi-bold), 700 (Bold)

### Design Features

- **Rounded Corners**: 8px ~ 24px (컴포넌트 크기에 따라)
- **Shadows**: 3단계 (sm, md, lg)
- **Card-based Layout**: 모든 주요 컨텐츠는 카드 형태
- **Responsive Design**: 모바일, 태블릿, 데스크톱 대응
- **Hover Effects**: 모든 인터랙티브 요소에 적용
- **Smooth Transitions**: 0.3s ease

## Mockup Pages

### 1. Landing Page (`01-landing-page.html`)

**주요 섹션:**
- Navigation Bar (고정 헤더)
- Hero Section (서비스 소개, CTA)
- Features Grid (6개 주요 기능)
- Statistics Section (사용자 통계)
- Call-to-Action Section
- Footer

**디자인 특징:**
- 플로팅 애니메이션이 적용된 Hero Card
- 그라디언트 배경
- Hover 시 카드 lift-up 효과
- 통계 섹션 그라디언트 배경

### 2. Student Dashboard (`02-student-dashboard.html`)

**주요 섹션:**
- Fixed Sidebar Navigation
- 통계 카드 (3개)
- 예정된 시험 목록
- 최근 성적 차트
- 학습 진행률

**디자인 특징:**
- 카드 기반 레이아웃
- 진행률 바 애니메이션
- D-day 배지
- 바 차트 시각화
- 반응형 그리드

### 3. Exam Interface (`03-exam-interface.html`)

**주요 섹션:**
- Sticky Header (시험 정보, 타이머)
- Question Navigator (문제 번호 그리드)
- Question Content (문제, 선택지)
- Progress Indicator
- Navigation Buttons

**디자인 특징:**
- 타이머 강조 표시
- 문제 상태 시각화 (현재/답변완료/미답변)
- 라디오 버튼 커스터마이징
- Hover 시 선택지 슬라이드 효과
- 진행률 실시간 표시

### 4. Teacher Dashboard (`04-teacher-dashboard.html`)

**주요 섹션:**
- Fixed Sidebar Navigation
- 통계 카드 (4개)
- 최근 시험 결과 테이블
- 최근 활동 타임라인
- 점수 분포 차트

**디자인 특징:**
- 통계 카드 배경 장식 요소
- 테이블 hover 효과
- 배지 컴포넌트 (상태, 합격률)
- 수평 바 차트
- 활동 아이콘

## Component Library

### Buttons

```css
.btn-primary     /* 주요 액션 */
.btn-secondary   /* 보조 액션 */
.btn-outline     /* 아웃라인 스타일 */
.btn-link        /* 링크 스타일 */
```

### Cards

```css
.card           /* 기본 카드 */
.stat-card      /* 통계 카드 */
.feature-card   /* 기능 소개 카드 */
.exam-card      /* 시험 정보 카드 */
```

### Badges

```css
.badge.success   /* 성공/합격 */
.badge.warning   /* 경고/주의 */
.badge.primary   /* 일반 정보 */
```

### Progress Bars

```css
.progress-bar-bg    /* 배경 */
.progress-bar-fill  /* 채워진 부분 (그라디언트) */
```

### Charts

```css
.chart-bars         /* 바 차트 */
.chart-bar-fill     /* 수평 바 차트 */
```

## How to View

1. 브라우저에서 각 HTML 파일을 직접 열어 확인
2. 반응형 디자인 확인: 브라우저 개발자 도구 (F12)에서 디바이스 모드 전환
3. Light mode 기준으로 제작 (Dark mode는 Phase 3 구현 시 적용)

## Implementation Notes

### React 구현 시 고려사항

1. **컴포넌트 분리**
   - Button, Card, Badge 등 재사용 가능한 컴포넌트로 분리
   - Layout 컴포넌트 (Header, Sidebar, Footer)
   - Page 컴포넌트 (Dashboard, ExamInterface 등)

2. **스타일링**
   - Tailwind CSS로 전환 (CSS 변수는 tailwind.config.js에 정의)
   - shadcn/ui 컴포넌트 활용
   - CSS-in-JS 대신 유틸리티 클래스 사용

3. **애니메이션**
   - Framer Motion 라이브러리 사용
   - Hover 상태는 Tailwind의 hover: 변형 사용
   - 페이지 전환 애니메이션 추가

4. **상태 관리**
   - TanStack Query로 서버 상태 관리
   - Zustand로 클라이언트 상태 관리 (테마, 사이드바 등)

5. **아이콘**
   - 현재 이모지 사용 중 → React Icons 또는 Lucide Icons로 교체
   - 일관된 아이콘 스타일 유지

## Next Steps

1. **Dark Mode 디자인**
   - Dark 모드 색상 팔레트 정의
   - 테마 전환 토글 구현

2. **추가 화면 디자인**
   - 로그인/회원가입 페이지
   - 문제 관리 페이지
   - 성적 상세 페이지
   - 설정 페이지

3. **React 구현**
   - 컴포넌트 라이브러리 구축
   - API 연동
   - 라우팅 설정

4. **접근성 개선**
   - ARIA 레이블 추가
   - 키보드 네비게이션 지원
   - 스크린 리더 최적화

## Design References

- **교육 플랫폼**: Coursera, Udemy
- **대시보드**: Linear, Vercel Dashboard
- **색상 시스템**: Tailwind CSS Emerald Palette
- **컴포넌트**: shadcn/ui, Radix UI
