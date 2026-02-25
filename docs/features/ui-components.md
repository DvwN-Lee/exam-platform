# UI Components

## 개요

재사용 가능한 공통 UI 컴포넌트 모음.

## Loading Components

### LoadingSpinner

원형 스피너 컴포넌트. Lucide `Loader2` 아이콘을 사용한다.

```tsx
import { LoadingSpinner } from '@/components/ui/loading'

<LoadingSpinner size="sm" />  // h-4 w-4
<LoadingSpinner size="md" />  // h-6 w-6 (기본)
<LoadingSpinner size="lg" />  // h-10 w-10
```

### LoadingPage

전체 페이지 로딩 상태 표시.

```tsx
import { LoadingPage } from '@/components/ui/loading'

<LoadingPage />                           // 기본 메시지, fullScreen
<LoadingPage message="불러오는 중..." />   // 커스텀 메시지
<LoadingPage fullScreen={false} />         // 컨테이너 내 로딩
```

## Skeleton

콘텐츠 로딩 플레이스홀더.

```tsx
import { Skeleton } from '@/components/ui/skeleton'

<Skeleton className="h-4 w-[200px]" />
<Skeleton className="h-12 w-full rounded-lg" />
```

## EmptyState

데이터가 없을 때 표시하는 빈 상태 컴포넌트.

```tsx
import { EmptyState } from '@/components/ui/empty-state'
import { FileText } from 'lucide-react'

<EmptyState
  icon={FileText}
  title="문제가 없습니다"
  description="새로운 문제를 추가해보세요"
  action={{
    label: "문제 추가",
    onClick: () => navigate('/questions/new')
  }}
/>

// compact 모드 (텍스트만 표시)
<EmptyState compact title="데이터가 없습니다." />
```

### Props

| Prop | Type | 필수 | 설명 |
|------|------|------|------|
| `icon` | `LucideIcon` | X | 아이콘 컴포넌트 |
| `title` | `string` | O | 제목 |
| `description` | `string` | X | 설명 텍스트 |
| `action` | `{ label, onClick }` | X | 액션 버튼 |
| `compact` | `boolean` | X | compact 모드 (텍스트만 표시, 기본 false) |

## Layout Components

### DashboardLayout

Sidebar와 메인 콘텐츠 영역을 포함하는 레이아웃.

```tsx
import { DashboardLayout } from '@/components/layout/DashboardLayout'

<DashboardLayout>
  <YourPageContent />
</DashboardLayout>
```

### 반응형 동작

| 화면 크기 | Sidebar | Header |
|-----------|---------|--------|
| Desktop (lg+) | 고정 표시 | 숨김 |
| Mobile (<lg) | 오버레이 | MobileHeader 표시 |

### MobileHeader

모바일 환경에서 표시되는 헤더.

- 햄버거 메뉴 버튼 (Sidebar 토글)
- 로고
- 사용자 메뉴

## Table Components

### 기본 사용

```tsx
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>이름</TableHead>
      <TableHead>점수</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {data.map((item) => (
      <TableRow key={item.id}>
        <TableCell>{item.name}</TableCell>
        <TableCell>{item.score}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### getScoreColor

점수(득점률 %)에 따른 색상 클래스 반환.

```tsx
import { getScoreColor } from '@/components/ui/table'

<span className={getScoreColor(85)}>85%</span>
// 85+ : text-green-600 (dark: text-green-400) font-semibold
// 72+ : text-orange-500 (dark: text-orange-400) font-semibold
// 72- : text-red-500 (dark: text-red-400) font-semibold
```

## 스타일 가이드

### Tailwind 클래스 패턴

```tsx
// 카드
className="rounded-lg border bg-card p-6"

// 호버 효과
className="transition-colors hover:bg-accent"

// 텍스트 색상
className="text-foreground"        // 기본
className="text-muted-foreground"  // 보조
className="text-destructive"       // 에러
```

### 색상 팔레트

| 변수 | 용도 |
|------|------|
| `primary` | 주요 액션, 브랜드 색상 |
| `secondary` | 보조 액션 |
| `accent` | 호버, 배경 강조 |
| `muted` | 비활성, 보조 텍스트 |
| `destructive` | 삭제, 에러 |
