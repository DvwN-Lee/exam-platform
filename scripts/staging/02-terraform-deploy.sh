#!/bin/bash
# =============================================================================
# Terraform Infrastructure 배포 (단독 실행용)
# =============================================================================
# 전체 배포는 deploy-all.sh를 사용한다.
# 이 스크립트는 Terraform만 단독 실행할 때 사용한다.
# =============================================================================

set -euo pipefail

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TERRAFORM_DIR="${PROJECT_ROOT}/terraform/environments/gcp-staging"

echo "=== Terraform Infrastructure 배포 ==="
echo ""

cd "$TERRAFORM_DIR"
echo "작업 디렉토리: $TERRAFORM_DIR"
echo ""

# Terraform 초기화
echo "--- terraform init ---"
terraform init -input=false
echo ""

# Plan 생성
echo "--- terraform plan ---"
terraform plan -out=tfplan
echo ""

# 사용자 확인
read -p "위 Plan을 적용하시겠습니까? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "배포를 취소합니다."
    rm -f tfplan
    exit 0
fi

# Apply 실행
echo ""
echo "--- terraform apply ---"
terraform apply tfplan
rm -f tfplan
echo ""

# Outputs 출력
echo "--- Terraform Outputs ---"
echo "  GKE Cluster:    $(terraform output -raw gke_cluster_name 2>/dev/null || echo 'N/A')"
echo "  Cloud SQL IP:   $(terraform output -raw cloudsql_private_ip 2>/dev/null || echo 'N/A')"
echo "  Redis Host:     $(terraform output -raw redis_host 2>/dev/null || echo 'N/A')"
echo "  Registry URL:   $(terraform output -raw registry_url 2>/dev/null || echo 'N/A')"
echo "  Ingress IP:     $(terraform output -raw ingress_static_ip 2>/dev/null || echo 'N/A')"
echo ""

echo -e "${GREEN}=== Terraform 배포 완료 ===${NC}"
