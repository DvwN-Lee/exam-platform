# Auth (인증)

## 개요

사용자 인증 기능. 학생/교사 역할 기반 로그인 및 회원가입을 지원한다.

## 구조

```
features/auth/
├── LoginPage.tsx     # 로그인 페이지
└── RegisterPage.tsx  # 회원가입 페이지
```

## 컴포넌트

### LoginPage

로그인 폼을 제공한다. 역할 선택 UI는 없으며 RegisterPage에서만 역할을 선택한다.

#### 주요 기능

- 아이디/비밀번호 입력
- 로그인 유지 옵션 (remember 체크박스)
- 소셜 로그인 버튼 (Google, Kakao) - 준비 중
- 회원가입 페이지 이동
- 비밀번호 찾기 (준비 중)

#### 폼 검증 Schema

```typescript
const loginSchema = z.object({
  username: z.string().min(1, '아이디를 입력해주세요'),
  password: z.string().min(1, 'Password를 입력해주세요'),
  remember: z.boolean(),
})
```

### RegisterPage

회원가입 폼을 제공한다. 역할에 따라 필수 입력 필드가 다르다.

#### 주요 기능

- 역할 선택 (학생/교사)
- 기본 정보 입력 (아이디, 이메일, 닉네임, 비밀번호)
- 비밀번호 확인
- 학생 전용: 학생 이름
- 교사 전용: 교사 이름, 담당 과목 선택
- `FIELD_ORDER` 기준 첫 번째 에러만 표시하는 `firstErrorField` 패턴 적용

#### 폼 검증 Schema

```typescript
const registerSchema = z
  .object({
    username: z
      .string()
      .min(USERNAME_MIN_LENGTH, `아이디는 ${USERNAME_MIN_LENGTH}자 이상이어야 합니다`)
      .regex(/^[a-zA-Z0-9_]+$/, '아이디는 영문, 숫자, 밑줄(_)만 사용 가능합니다'),
    email: z.string().email('올바른 이메일 주소를 입력해주세요'),
    nick_name: z.string().min(NICKNAME_MIN_LENGTH, `닉네임은 ${NICKNAME_MIN_LENGTH}자 이상이어야 합니다`),
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Password는 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다`),
    password2: z.string(),
    user_type: z.enum(['student', 'teacher']),
    student_name: z.string().optional(),
    teacher_name: z.string().optional(),
    subject_id: z.number().optional(),
  })
  .refine((data) => data.password === data.password2, {
    message: 'Password가 일치하지 않습니다',
    path: ['password2'],
  })
  // + student_name, teacher_name, subject_id 조건부 검증 refine
```

## API 연동

### 로그인

```
POST /auth/token/
```

**Request:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "access": "jwt_access_token",
  "user": {
    "id": 1,
    "username": "string",
    "email": "string",
    "nick_name": "string",
    "user_type": "student" | "teacher"
  }
}
```

> Refresh Token은 HttpOnly Cookie로 전송된다. 토큰 갱신은 `POST /auth/token/refresh/`로 수행한다.

### 회원가입

```
POST /auth/register/
```

**Request:**
```json
{
  "username": "string",
  "password": "string",
  "password2": "string",
  "email": "string",
  "nick_name": "string",
  "user_type": "student" | "teacher",
  "student_name": "string",
  "teacher_name": "string",
  "subject_id": 1
}
```

## 애니메이션

### 적용된 효과

| 요소 | 효과 |
|------|------|
| 전체 카드 | FadeIn + SlideUp |
| 폼 요소 | Stagger 순차 등장 |
| 역할 선택 버튼 (RegisterPage) | whileHover scale, whileTap scale |
| 소셜 로그인 버튼 (LoginPage) | whileHover y 이동 |
| 일러스트 아이콘 | Floating 애니메이션 |
| 기능 리스트 | Stagger 순차 등장 |

### 코드 예시

```tsx
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: STAGGER.fast,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.normal, ease: EASING.easeOut },
  },
}
```

## 라우팅

| 경로 | 컴포넌트 | 접근 조건 |
|------|----------|-----------|
| `/login` | LoginPage | 비로그인 사용자 |
| `/register` | RegisterPage | 비로그인 사용자 |

## 인증 상태 관리

Zustand `authStore`를 사용하여 인증 상태를 관리한다. `persist` 미들웨어를 통해 `user` 정보를 LocalStorage에 보존한다.

```typescript
interface AuthStore extends AuthState {
  setAuth: (user: User, accessToken: string) => void
  setUser: (user: User) => void
  setTokens: (accessToken: string) => void
  logout: () => void
  initializeAuth: () => Promise<void>
}
```

### 주요 동작

- `setAuth`: 로그인 시 user, accessToken 설정
- `initializeAuth`: 앱 초기화 시 LocalStorage token으로 인증 복원. user가 없으면 `GET /users/me/`로 복원 시도
- `logout`: token 삭제 및 상태 초기화
