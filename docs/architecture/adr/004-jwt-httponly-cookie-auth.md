# ADR-004: JWT HttpOnly Cookie 인증 전략

## 상태 (Status)

`승인됨`

## 일자 (Date)

2025-03-15

## 상황 (Context)

Exam Platform은 Django REST Backend + React SPA Frontend 구조로, 다음 인증 요구사항이 존재한다.

- Stateless 인증 (Backend Session 저장소 미사용)
- Token 탈취에 대한 방어 (XSS, CSRF)
- Token 자동 갱신 (사용자 경험 유지)
- Role 기반 접근 제어 (Teacher/Student)

인증 방식으로 Session 기반, JWT LocalStorage, JWT HttpOnly Cookie Hybrid 방식을 검토했다.

## 결정 (Decision)

**JWT + HttpOnly Cookie Hybrid 전략**을 채택한다.

| Token | 저장 위치 | 수명 | 용도 |
|-------|-----------|------|------|
| Access Token | `localStorage` | 15분 | API 요청 시 `Authorization: Bearer` Header |
| Refresh Token | HttpOnly Cookie | 7일 | Access Token 갱신 |

주요 설정:
- Token Rotation: Refresh 시마다 새 Refresh Token 발급
- Blacklist After Rotation: 사용된 Refresh Token 즉시 무효화
- Custom Claims: `user_type`, `nick_name`, `email` 포함
- CSRF Protection: `SameSite=Lax` Cookie + `CsrfViewMiddleware`
- Rate Limiting: 인증 Endpoint에 10 req/min 제한

## 이유 (Rationale)

### 검토 대안

| 대안 | 장점 | 단점 |
|------|------|------|
| **Session 기반** | 서버에서 완전 제어, 즉시 무효화 가능 | Stateful (Session Store 필요), 수평 확장 시 Session 공유 필요 |
| **JWT LocalStorage Only** | 구현 단순, Stateless | Refresh Token도 XSS로 탈취 가능 |
| **JWT HttpOnly Cookie Hybrid** | Refresh Token XSS 방어, Stateless | 구현 복잡, CSRF 방어 별도 필요 |
| **JWT HttpOnly Cookie Only** | 모든 Token XSS 방어 | CSRF 공격 표면 확대, SPA에서 Token 접근 불가 |

### 선택 사유

- **Refresh Token 보호**: HttpOnly Cookie에 저장하여 JavaScript로 접근 불가 -> XSS 공격으로 Refresh Token 탈취 방지
- **Access Token 단기 수명**: 15분으로 설정하여 탈취 시 피해 범위 최소화
- **Token Rotation**: Refresh 요청마다 새로운 Refresh Token을 발급하고 기존 Token을 Blacklist 처리하여, 탈취된 Token의 재사용 차단
- **CSRF 방어**: `SameSite=Lax` 설정으로 Cross-Site 요청에서 Cookie 전송 차단

## 결과 (Consequences)

### 긍정적 결과

- Refresh Token이 JavaScript에서 접근 불가하여 XSS 기반 Token 탈취 방어
- Access Token 15분 만료 + Token Rotation으로 탈취 시 영향 범위 최소화
- Stateless 인증으로 Backend 수평 확장 시 Session 공유 문제 없음
- Axios Interceptor에서 401 응답 시 자동 Refresh -> 사용자 경험 단절 없음

### 부정적 결과 / 트레이드오프

- Access Token이 `localStorage`에 저장되므로 XSS 공격 시 탈취 가능 (단, 15분 수명으로 위험 완화)
- Token Rotation + Blacklist 처리로 인한 DB 조회 오버헤드 발생
- HttpOnly Cookie와 Bearer Token을 동시에 처리하는 Interceptor 로직 복잡성 증가
- Production 환경에서 `Secure` Cookie Flag 필수 (HTTPS 전용)

## 참고 자료 (References)

- [Architecture Overview - Section 3.4](../README.md)
- [Security Architecture](../../security.md)
- `examonline/config/base.py`: SimpleJWT 설정
- `frontend/src/api/client.ts`: Axios Interceptor Token Refresh 구현
