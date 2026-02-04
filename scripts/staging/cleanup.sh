#!/bin/bash
# =============================================================================
# GCP Staging 환경 리소스 정리
# =============================================================================
# Terraform이 모든 Resource를 관리하므로 terraform destroy만으로 정리한다.
# 수동 helm uninstall, kubectl delete는 불필요하다.
# =============================================================================

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TERRAFORM_DIR="${PROJECT_ROOT}/terraform/environments/gcp-staging"

echo "=== GCP Staging 환경 리소스 정리 ==="
echo ""

# Terraform State에서 관리 중인 Resource 요약
cd "$TERRAFORM_DIR"

echo -e "${YELLOW}삭제 대상 (Terraform 관리 Resource):${NC}"
echo "  - GKE Cluster + Node Pools"
echo "  - NGINX Ingress Controller (Helm Release + Static IP)"
echo "  - ArgoCD (Helm Release + Namespace + Root Application)"
echo "  - Cloud SQL (PostgreSQL)"
echo "  - Memorystore (Redis)"
echo "  - Cloud Storage Bucket"
echo "  - Artifact Registry"
echo "  - Cloud Build Triggers"
echo "  - VPC Network + Subnets + Cloud NAT"
echo "  - Secret Manager Secrets"
echo "  - Service Accounts + IAM Bindings"
echo ""

echo -e "${RED}이 작업은 되돌릴 수 없습니다.${NC}"
read -p "모든 Staging 리소스를 삭제하시겠습니까? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "취소되었습니다."
    exit 0
fi

echo ""
echo "--- terraform destroy ---"
terraform destroy

echo ""
echo -e "${GREEN}=== 리소스 정리 완료 ===${NC}"
echo ""
echo "남아있는 리소스 확인:"
GCP_PROJECT=$(grep 'project_id' terraform.tfvars | head -1 | sed 's/.*= *"\(.*\)"/\1/')
GCP_REGION=$(grep 'region' terraform.tfvars | head -1 | sed 's/.*= *"\(.*\)"/\1/')
echo "  gcloud compute instances list --project=$GCP_PROJECT"
echo "  gcloud sql instances list --project=$GCP_PROJECT"
echo "  gcloud redis instances list --region=$GCP_REGION --project=$GCP_PROJECT"
echo "  gcloud compute addresses list --project=$GCP_PROJECT"
