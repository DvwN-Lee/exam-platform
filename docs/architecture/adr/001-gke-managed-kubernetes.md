# ADR-001: GKE Managed Kubernetes 선택

## 상태 (Status)

`승인됨`

## 일자 (Date)

2025-03-15

## 상황 (Context)

Exam Platform은 Django Backend와 React Frontend를 Container 기반으로 운영해야 하며, 다음 요구사항이 존재한다.

- 환경별(Dev/Staging/Production) 격리된 Deployment 필요
- Auto-Scaling, Self-Healing 등 운영 자동화 필요
- GCP Managed Service(Cloud SQL, Memorystore, Secret Manager)와의 통합 필요
- Private Network 환경에서의 보안 운영 필요

Container Orchestration Platform으로 GKE, EKS, 자체 Kubernetes, Cloud Run 등을 검토했다.

## 결정 (Decision)

**GKE(Google Kubernetes Engine) Managed Kubernetes**를 Container Orchestration Platform으로 채택한다.

- Private Cluster 모드로 운영 (Node에 Public IP 미할당)
- `e2-standard-2` Machine Type, Node 1~5개(Staging) / 1~10개(Production) Auto-Scaling
- Workload Identity로 GCP IAM 연동
- Shielded GKE Node 사용 (Secure Boot + Integrity Monitoring)
- Network Policy Engine으로 Calico 사용

## 이유 (Rationale)

### 검토 대안

| 대안 | 장점 | 단점 |
|------|------|------|
| **GKE** | GCP Native 통합, Managed Control Plane, Workload Identity | 비용 (Control Plane + Node) |
| **Cloud Run** | Serverless, 관리 부담 최소 | Multi-Container 구성 제한, Network Policy 미지원 |
| **자체 Kubernetes** | 완전한 제어 | Control Plane 운영 부담, 보안 패치 직접 관리 |
| **EKS** | AWS 생태계 | 기존 GCP 인프라와 불일치, Cross-Cloud 복잡성 |

### 선택 사유

- **GCP Native 통합**: Cloud SQL(Private IP), Memorystore, Secret Manager, Artifact Registry와 VPC 내부에서 직접 통신 가능
- **Workload Identity**: Service Account Key 파일 없이 GCP API 접근 가능하여 Credential 관리 부담 제거
- **Private Cluster**: Node에 External IP를 할당하지 않아 공격 표면 최소화
- **Managed Control Plane**: Kubernetes API Server 운영, 버전 업그레이드를 Google이 관리

## 결과 (Consequences)

### 긍정적 결과

- GCP Managed Service와 Private IP 기반 직접 통신으로 Network Latency 최소화
- Workload Identity를 통해 Credential File 없는 보안 아키텍처 구현
- Node Pool Auto-Scaling으로 부하에 따른 자동 확장/축소
- `REGULAR` Release Channel로 안정적인 Kubernetes 버전 자동 업그레이드

### 부정적 결과 / 트레이드오프

- GKE Control Plane 비용 발생 (Autopilot 미사용 시 고정 비용)
- GCP 종속성 증가 (Workload Identity, Private IP 등 GCP 고유 기능 의존)
- Private Cluster 특성상 외부에서 `kubectl` 접근 시 추가 설정 필요 (Master Authorized Networks)

## 참고 자료 (References)

- [Architecture Overview - Section 5.1](../README.md)
- `terraform/modules/gke/`: GKE Cluster Terraform Module
- `terraform/modules/gcp-vpc/`: VPC, Subnet, NAT 구성
