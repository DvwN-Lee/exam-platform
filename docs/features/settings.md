# Settings (설정)

## 개요

사용자 설정 기능. 프로필 수정, 비밀번호 변경, 과목 관리(교사 전용)를 지원한다.

## 구조

```
features/settings/
├── SettingsPage.tsx       # 설정 메인 (탭 인터페이스)
├── ProfileSettings.tsx    # 프로필 설정
├── PasswordSettings.tsx   # 비밀번호 설정
└── SubjectSettings.tsx    # 과목 설정 (교사 전용)
```

## 컴포넌트

### SettingsPage

탭 기반 설정 인터페이스.

#### 탭 구성

| 탭 | 컴포넌트 | 접근 권한 |
|----|----------|-----------|
| 프로필 | ProfileSettings | 전체 |
| 비밀번호 | PasswordSettings | 전체 |
| 과목 관리 | SubjectSettings | 교사만 |

```tsx
const tabs = [
  { id: 'profile', label: '프로필', component: ProfileSettings },
  { id: 'password', label: '비밀번호', component: PasswordSettings },
  ...(user?.user_type === 'teacher'
    ? [{ id: 'subjects', label: '과목 관리', component: SubjectSettings }]
    : []),
]
```

### ProfileSettings

프로필 정보 수정.

#### 수정 가능 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| `nick_name` | text | 닉네임 |
| `email` | email | 이메일 |
| `mobile` | text | 휴대폰 번호 |
| `gender` | select | 성별 |

#### 읽기 전용 필드

- 아이디 (username)
- 사용자 유형 (user_type)
- 가입일 (created_at)

### PasswordSettings

비밀번호 변경.

#### 폼 필드

| 필드 | 설명 |
|------|------|
| `current_password` | 현재 비밀번호 |
| `new_password` | 새 비밀번호 |
| `confirm_password` | 새 비밀번호 확인 |

#### 검증

```typescript
const passwordSchema = z.object({
  current_password: z.string().min(1, '현재 비밀번호를 입력해주세요'),
  new_password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다'),
  confirm_password: z.string(),
}).refine((data) => data.new_password === data.confirm_password, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['confirm_password'],
})
```

### SubjectSettings

과목 CRUD (교사 전용).

#### 주요 기능

- 과목 목록 조회
- 과목 추가
- 과목 수정
- 과목 삭제

#### UI 구성

```
┌─────────────────────────────────────────┐
│ 과목 관리                    [+ 추가]    │
├─────────────────────────────────────────┤
│ 수학                        [수정][삭제] │
│ 영어                        [수정][삭제] │
│ 과학                        [수정][삭제] │
└─────────────────────────────────────────┘
```

## API 연동

### 프로필 조회

```
GET /api/v1/users/profile/
```

### 프로필 수정

```
PUT /api/v1/users/profile/
```

**Request:**
```json
{
  "nick_name": "새 닉네임",
  "email": "new@email.com",
  "mobile": "010-1234-5678",
  "gender": "M"
}
```

### 비밀번호 변경

```
POST /api/v1/users/change-password/
```

**Request:**
```json
{
  "current_password": "현재비밀번호",
  "new_password": "새비밀번호"
}
```

### 과목 목록

```
GET /api/v1/subjects/
```

### 과목 생성

```
POST /api/v1/subjects/
```

**Request:**
```json
{
  "subject_name": "과목명"
}
```

### 과목 수정

```
PUT /api/v1/subjects/{id}/
```

### 과목 삭제

```
DELETE /api/v1/subjects/{id}/
```

## 라우팅

| 경로 | 컴포넌트 | 설명 |
|------|----------|------|
| `/settings` | SettingsPage | 설정 메인 |
| `/settings?tab=profile` | - | 프로필 탭 |
| `/settings?tab=password` | - | 비밀번호 탭 |
| `/settings?tab=subjects` | - | 과목 탭 (교사) |
