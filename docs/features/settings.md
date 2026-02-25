# Settings (설정)

## 개요

사용자 설정 기능. 프로필 수정, 비밀번호 변경, 과목 관리(교사 전용), 테마 설정을 지원한다.

## 구조

```
features/settings/
├── SettingsPage.tsx       # 설정 메인 (탭 Interface)
├── ProfileSettings.tsx    # 프로필 설정
├── PasswordSettings.tsx   # 비밀번호 설정
├── SubjectSettings.tsx    # 과목 설정 (교사 전용)
└── ThemeSettings.tsx      # 테마 설정
```

## 컴포넌트

### SettingsPage

탭 기반 설정 Interface.

#### 탭 구성

| 탭 | 컴포넌트 | 접근 권한 |
|----|----------|-----------|
| 프로필 설정 | ProfileSettings | 전체 |
| 비밀번호 변경 | PasswordSettings | 전체 |
| 과목 관리 | SubjectSettings | 교사만 |
| 테마 설정 | ThemeSettings | 전체 |

```tsx
const tabs = [
  { id: 'profile', label: '프로필 설정' },
  { id: 'password', label: '비밀번호 변경' },
  ...(user?.user_type === 'teacher'
    ? [{ id: 'subjects', label: '과목 관리' }]
    : []),
  { id: 'theme', label: '테마 설정' },
]
```

### ProfileSettings

프로필 정보 수정.

#### 수정 가능 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| `nick_name` | text | 닉네임 |
| `email` | email | 이메일 |

#### 읽기 전용 필드

- 아이디 (username)

### PasswordSettings

비밀번호 변경.

#### 폼 필드

| 필드 | 설명 |
|------|------|
| `old_password` | 현재 비밀번호 |
| `new_password` | 새 비밀번호 |
| `new_password2` | 새 비밀번호 확인 |

#### 검증

- 새 비밀번호와 확인 일치 여부
- 최소 `PASSWORD_MIN_LENGTH`자 이상

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

### ThemeSettings

화면 테마(Light/Dark/System) 설정. `ThemeToggle` 컴포넌트를 사용한다.

## API 연동

### 프로필 조회

```
GET /users/me/
```

### 프로필 수정

```
PUT /users/me/
```

**Request:**
```json
{
  "nick_name": "새 닉네임",
  "email": "new@email.com"
}
```

### 비밀번호 변경

```
PUT /users/me/change-password/
```

**Request:**
```json
{
  "old_password": "현재비밀번호",
  "new_password": "새비밀번호",
  "new_password2": "새비밀번호"
}
```

### 과목 목록

```
GET /subjects/
```

### 과목 생성

```
POST /subjects/
```

**Request:**
```json
{
  "subject_name": "과목명"
}
```

### 과목 수정

```
PUT /subjects/{id}/
```

### 과목 삭제

```
DELETE /subjects/{id}/
```

## 라우팅

| 경로 | 컴포넌트 | 설명 |
|------|----------|------|
| `/settings` | SettingsPage | 설정 메인 |
