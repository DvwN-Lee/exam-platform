# Examinations (시험 일정 관리)

## 개요

시험 일정 관리 기능. 교사가 시험지를 기반으로 시험 일정을 생성하고 학생을 등록한다.

## 구조

```
features/examinations/
├── ExaminationListPage.tsx      # 시험 목록
├── ExaminationDetailPage.tsx    # 시험 상세
├── ExaminationForm.tsx          # 시험 생성/수정 폼
├── EnrolledStudentsSection.tsx  # 등록 학생 섹션
└── StudentSelectModal.tsx       # 학생 선택 모달
```

## 시험 상태

| 상태 | 조건 | 표시 |
|------|------|------|
| `upcoming` | 현재 시간 < 시작 시간 | 예정 (파란색) |
| `ongoing` | 시작 시간 <= 현재 시간 <= 종료 시간 | 진행중 (녹색) |
| `completed` | 현재 시간 > 종료 시간 | 완료 (회색) |

## 컴포넌트

### ExaminationListPage

시험 목록을 카드 형태로 표시한다.

#### 주요 기능

- 시험 목록 조회
- 상태별 필터링
- 이름 검색
- 정렬 (시작일순/종료일순)

#### 역할별 표시

- **교사**: 본인이 생성한 시험 + 공개 시험
- **학생**: 등록된 시험 + 공개 시험

### ExaminationDetailPage

시험 상세 정보를 표시한다.

#### 표시 정보

- 시험 이름, 상태
- 시험지 정보
- 시작/종료 시간
- 생성자, 생성일
- 문제 목록
- 등록 학생 (교사 전용)

#### 역할별 액션

- **교사**: 수정, 게시하기 버튼
- **학생**: 시험 응시하기 버튼 (진행 중인 경우)

### ExaminationForm

시험 생성 및 수정 폼.

#### 폼 필드

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `exam_name` | text | O | 시험 이름 |
| `testpaper_id` | select | O | 시험지 선택 |
| `start_time` | datetime | O | 시작 시간 |
| `end_time` | datetime | O | 종료 시간 |
| `is_public` | checkbox | X | 공개 여부 |

#### 폼 검증

```typescript
const examinationSchema = z.object({
  exam_name: z.string().min(1, '시험 이름을 입력해주세요'),
  testpaper_id: z.number().min(1, '시험지를 선택해주세요'),
  start_time: z.string().min(1, '시작 시간을 입력해주세요'),
  end_time: z.string().min(1, '종료 시간을 입력해주세요'),
  is_public: z.boolean(),
}).refine((data) => new Date(data.end_time) > new Date(data.start_time), {
  message: '종료 시간은 시작 시간보다 이후여야 합니다',
  path: ['end_time'],
})
```

### EnrolledStudentsSection

시험에 등록된 학생 목록을 표시하고 관리한다.

#### 주요 기능

- 등록된 학생 목록 표시
- 학생 추가 (모달)
- 학생 제거

### StudentSelectModal

학생 선택을 위한 모달.

#### 주요 기능

- 학생 검색
- 체크박스로 다중 선택
- 선택 완료 시 등록

## API 연동

### 시험 목록 조회

```
GET /api/v1/examinations/
```

### 시험 상세 조회

```
GET /api/v1/examinations/{id}/
```

### 시험 생성

```
POST /api/v1/examinations/
```

**Request:**
```json
{
  "exam_name": "중간고사",
  "testpaper_id": 1,
  "start_time": "2024-01-15T09:00:00Z",
  "end_time": "2024-01-15T10:30:00Z",
  "is_public": false
}
```

### 시험 게시

```
POST /api/v1/examinations/{id}/publish/
```

### 학생 등록

```
POST /api/v1/examinations/{id}/enroll/
```

**Request:**
```json
{
  "student_ids": [1, 2, 3]
}
```

### 학생 등록 해제

```
DELETE /api/v1/examinations/{id}/unenroll/{student_id}/
```

## 데이터 타입

```typescript
interface Examination {
  id: number
  exam_name: string
  testpaper: TestPaper
  start_time: string
  end_time: string
  is_public: boolean
  creat_user: User
  created_at: string
}

type ExaminationStatus = 'upcoming' | 'ongoing' | 'completed'
```

## 애니메이션

| 요소 | 효과 |
|------|------|
| 목록 카드 | Stagger + 호버 |
| 상세 섹션 | FadeIn delay |
| 문제 목록 | Stagger |
| 학생 목록 | Stagger |

## 라우팅

| 경로 | 컴포넌트 | 설명 |
|------|----------|------|
| `/examinations` | ExaminationListPage | 목록 |
| `/examinations/:id` | ExaminationDetailPage | 상세 |
| `/examinations/new` | ExaminationForm | 생성 |
| `/examinations/:id/edit` | ExaminationForm | 수정 |
