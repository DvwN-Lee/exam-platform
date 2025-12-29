# Animation System

## 개요

Framer Motion 기반의 애니메이션 시스템을 구현하여 전체 UI/UX를 모던하고 인터랙티브하게 개선했다.

## 기술 스택

- **Framer Motion** v12.x - React 애니메이션 라이브러리
- **Recharts** 내장 애니메이션 - 차트 렌더링 애니메이션

## 디렉토리 구조

```
frontend/src/
├── lib/animations/
│   ├── index.ts          # 통합 export
│   ├── transitions.ts    # 타이밍 상수 (DURATION, EASING, STAGGER)
│   ├── variants.ts       # 재사용 가능한 애니메이션 variants
│   └── hooks.ts          # 커스텀 애니메이션 hooks
│
└── components/animation/
    ├── index.ts              # 통합 export
    ├── MotionWrapper.tsx     # 페이지 전환 wrapper
    ├── StaggerContainer.tsx  # Stagger 컨테이너
    ├── StaggerItem.tsx       # Stagger 아이템
    ├── AnimatedCard.tsx      # 호버/탭 카드
    ├── FadeIn.tsx            # 단순 페이드인
    └── AnimatedProgress.tsx  # 프로그레스 바 애니메이션
```

## 애니메이션 상수

### DURATION (초 단위)

| 상수 | 값 | 용도 |
|------|-----|------|
| `instant` | 0.1 | 즉각적인 피드백 |
| `fast` | 0.2 | 빠른 전환 |
| `normal` | 0.3 | 기본 전환 |
| `slow` | 0.5 | 강조 전환 |
| `slower` | 0.8 | 페이지 전환 |
| `chart` | 0.8 | 차트 애니메이션 |

### EASING (Material Design 기반)

| 상수 | 값 | 용도 |
|------|-----|------|
| `easeOut` | `[0.0, 0.0, 0.2, 1]` | 진입 애니메이션 |
| `easeIn` | `[0.4, 0.0, 1, 1]` | 퇴장 애니메이션 |
| `easeInOut` | `[0.4, 0.0, 0.2, 1]` | 양방향 전환 |
| `spring` | `{ stiffness: 300, damping: 30 }` | 탄성 효과 |

### STAGGER (초 단위)

| 상수 | 값 | 용도 |
|------|-----|------|
| `fast` | 0.05 | 빠른 순차 등장 |
| `normal` | 0.1 | 기본 순차 등장 |
| `slow` | 0.15 | 느린 순차 등장 |

## 적용 페이지

### Dashboard

- **TeacherDashboard**: 통계 카드 stagger, 차트 애니메이션, 테이블 row stagger
- **StudentDashboard**: 진행 중 시험 카드, 최근 결과 리스트 stagger

### Auth Pages

- **LoginPage**: 폼 요소 순차 등장, 역할 선택 버튼 호버/탭 효과, 일러스트레이션 floating 애니메이션
- **RegisterPage**: 동일한 패턴 적용

### List Pages

- **QuestionListPage**: 테이블 row stagger 애니메이션
- **TestPaperListPage**: 카드 그리드 stagger
- **ExaminationListPage**: 카드 stagger + 호버 효과
- **ExamListPage**: 시험 카드 stagger
- **ExamResultsListPage**: 결과 리스트 stagger

### Detail/Form Pages

- **QuestionDetailPage**: 섹션별 FadeIn
- **QuestionForm**: 폼 필드 순차 등장, 선택지 AnimatePresence
- **TestPaperDetailPage**: 문제 목록 stagger
- **ExaminationDetailPage**: 정보 카드 FadeIn, 문제 목록 stagger

### Layout

- **DashboardLayout**: MotionWrapper 페이지 전환
- **Sidebar**: 메뉴 아이템 stagger, active indicator `layoutId` 공유 애니메이션

## 사용 예시

### 기본 FadeIn

```tsx
import { FadeIn } from '@/components/animation'

<FadeIn delay={0.1}>
  <Card>내용</Card>
</FadeIn>
```

### Stagger 리스트

```tsx
import { StaggerContainer, StaggerItem } from '@/components/animation'

<StaggerContainer>
  {items.map((item) => (
    <StaggerItem key={item.id}>
      <Card>{item.name}</Card>
    </StaggerItem>
  ))}
</StaggerContainer>
```

### 호버 효과 카드

```tsx
import { motion } from 'framer-motion'
import { cardHoverVariants } from '@/lib/animations'

<motion.div
  initial="rest"
  whileHover="hover"
  variants={cardHoverVariants}
>
  <Card>호버 시 상승 효과</Card>
</motion.div>
```

### 차트 애니메이션

```tsx
<PieChart>
  <Pie
    isAnimationActive={true}
    animationDuration={800}
    animationEasing="ease-out"
  />
</PieChart>
```

## 성능 고려사항

1. **will-change 최소화**: Framer Motion이 자동으로 GPU 가속 처리
2. **AnimatePresence**: 조건부 렌더링 시 exit 애니메이션 지원
3. **layoutId**: Sidebar active indicator에 사용하여 부드러운 위치 전환
4. **차트 애니메이션**: Tooltip 지연 방지를 위해 hover 시 애니메이션 비활성화 고려

## 관련 파일

- `frontend/package.json` - framer-motion 의존성
- `frontend/src/lib/animations/` - 애니메이션 유틸리티
- `frontend/src/components/animation/` - 래퍼 컴포넌트
