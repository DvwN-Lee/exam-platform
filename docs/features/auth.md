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

로그인 폼과 역할 선택 UI를 제공한다.

#### 주요 기능

- 역할 선택 (학생/교사)
- 아이디/비밀번호 입력
- 로그인 유지 옵션
- 소셜 로그인 버튼 (Google, Kakao)
- 회원가입 페이지 이동

#### 폼 검증 스키마

```typescript
const loginSchema = z.object({
  username: z.string().min(1, '아이디를 입력해주세요'),
  password: z.string().min(1, 'Password를 입력해주세요'),
})
```

#### 상태 관리

```typescript
const [selectedRole, setSelectedRole] = useState<'student' | 'teacher'>('student')
```

### RegisterPage

회원가입 폼을 제공한다. 역할에 따라 필수 입력 필드가 다르다.

#### 주요 기능

- 역할 선택 (학생/교사)
- 기본 정보 입력 (아이디, 비밀번호, 이메일, 닉네임)
- 비밀번호 확인
- 교사 전용: 담당 과목 선택
- 약관 동의

#### 폼 검증 스키마

```typescript
const registerSchema = z.object({
  username: z.string().min(4, '아이디는 4자 이상이어야 합니다'),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다'),
  password_confirm: z.string(),
  email: z.string().email('올바른 이메일 형식이 아닙니다'),
  nick_name: z.string().min(2, '닉네임은 2자 이상이어야 합니다'),
  subject_id: z.number().optional(),  // 교사 전용
}).refine((data) => data.password === data.password_confirm, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['password_confirm'],
})
```

## API 연동

### 로그인

```
POST /api/v1/users/login/
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
  "refresh": "jwt_refresh_token",
  "user": {
    "id": 1,
    "username": "string",
    "email": "string",
    "nick_name": "string",
    "user_type": "student" | "teacher"
  }
}
```

### 회원가입

```
POST /api/v1/users/register/
```

**Request:**
```json
{
  "username": "string",
  "password": "string",
  "email": "string",
  "nick_name": "string",
  "user_type": "student" | "teacher",
  "subject_id": 1  // 교사 전용
}
```

## 애니메이션

### 적용된 효과

| 요소 | 효과 |
|------|------|
| 전체 카드 | FadeIn + SlideUp |
| 폼 요소 | Stagger 순차 등장 |
| 역할 선택 버튼 | whileHover scale, whileTap scale |
| 소셜 로그인 버튼 | whileHover y 이동 |
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

Zustand `authStore`를 사용하여 인증 상태를 관리한다.

```typescript
interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  setAuth: (user: User, access: string, refresh: string) => void
  logout: () => void
}
```
