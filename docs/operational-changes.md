# Operational Changes Log

> **참고:** 이 문서는 운영 변경 이력을 기록하기 위한 템플릿이다. 프로젝트가 GCP 환경에서 운영된 기간 동안의 주요 변경 사항은 [Architecture Overview](architecture/README.md)와 Git 커밋 이력에서 확인할 수 있다.

GitOps 외부에서 수행된 직접 변경 사항을 추적하는 문서이다.

ArgoCD GitOps로 관리되지 않는 인프라 변경(GCP Console 직접 조작, `kubectl` 수동 명령, Terraform 외부 리소스 수정 등)을 기록하여, 운영 상태와 Git 상태 간 차이를 추적한다.

---

## 기록 기준

다음에 해당하는 변경 사항을 기록한다.

- GCP Console 또는 `gcloud` CLI를 통한 직접 리소스 수정
- `kubectl`로 직접 수행한 Cluster 변경 (Namespace 외 리소스, CRD 설치 등)
- Terraform State 외부에서 수행된 인프라 변경
- Secret Rotation, 인증서 갱신 등 정기 운영 작업
- 장애 대응 중 수행된 긴급 변경

---

## Template

```markdown
### YYYY-MM-DD: [변경 제목]

**환경**: Staging / Production
**구분**: 정기 작업 / 긴급 변경 / 인프라 수정
**수행자**: [이름 또는 ID]

**변경 내용**:
- [변경 사항 상세 기술]

**사유**:
- [변경이 필요했던 이유]

**영향 범위**:
- [영향 받는 서비스, Namespace, 리소스]

**원복 필요 여부**: 예 / 아니오
**GitOps 반영 여부**: 반영 완료 / 반영 예정 / 해당 없음
```

---

## 변경 이력

(아래에 시간 역순으로 기록한다)

<!-- 예시:
### 2025-04-15: Cloud SQL Maintenance Window 수동 설정

**환경**: Production
**구분**: 인프라 수정
**수행자**: idongju

**변경 내용**:
- Cloud SQL Instance의 Maintenance Window를 일요일 03:00 KST로 수동 설정

**사유**:
- Terraform Module에 Maintenance Window 옵션이 미구현 상태에서 긴급 설정 필요

**영향 범위**:
- Production Cloud SQL Instance

**원복 필요 여부**: 아니오
**GitOps 반영 여부**: Terraform 반영 예정
-->
