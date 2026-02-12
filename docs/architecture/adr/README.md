# Architecture Decision Records (ADR)

프로젝트의 주요 Architecture 결정을 기록하고 추적하는 문서 체계이다.

---

## ADR 목록

| ADR | 제목 | 상태 | 일자 |
|-----|------|------|------|
| [001](./001-gke-managed-kubernetes.md) | GKE Managed Kubernetes 선택 | 승인됨 | 2025-03-15 |
| [002](./002-django-rest-framework.md) | Django REST Framework Backend Stack | 승인됨 | 2025-03-15 |
| [003](./003-react-tanstack-frontend.md) | React + TanStack Frontend Stack | 승인됨 | 2025-03-15 |
| [004](./004-jwt-httponly-cookie-auth.md) | JWT HttpOnly Cookie 인증 전략 | 승인됨 | 2025-03-15 |
| [005](./005-helm-app-of-apps-pattern.md) | Helm App of Apps Pattern 배포 구조 | 승인됨 | 2025-04-10 |
| [006](./006-external-secrets-gcp-secret-manager.md) | External Secrets + GCP Secret Manager | 승인됨 | 2025-04-10 |

---

## 상태 정의

| 상태 | 설명 |
|------|------|
| **제안됨** | 검토 대기 중인 결정 |
| **승인됨** | 채택되어 적용 중인 결정 |
| **폐기됨** | 채택되지 않은 결정 |
| **대체됨** | 새로운 ADR로 대체된 결정 (대체 ADR 번호 명시) |

---

## 작성 가이드

### 새 ADR 작성 절차

1. `template.md`를 복사하여 `NNN-제목.md` 형식으로 파일 생성
2. 번호(`NNN`)는 기존 최대 번호 + 1을 사용
3. 파일명은 영문 소문자, 단어 구분은 하이픈(`-`) 사용
4. 본문은 한국어로 작성하되, 기술 용어는 영어 원문 유지
5. 작성 후 이 README의 ADR 목록 Table에 항목 추가

### 기존 ADR 변경

- 승인된 ADR은 내용을 직접 수정하지 않는다
- 기존 결정을 변경할 경우, 새 ADR을 작성하고 기존 ADR 상태를 `대체됨`으로 변경
- 기존 ADR에 대체 ADR 번호를 명시

### Template

[ADR Template](./template.md)를 참고한다.
