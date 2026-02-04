#!/bin/bash
# =============================================================================
# GCP Staging 환경 전체 배포 자동화
# =============================================================================
# Terraform이 모든 Infrastructure 및 Kubernetes Resource를 관리한다.
# 수동 Helm install, kubectl apply 등의 개별 작업은 불필요하다.
#
# 배포 순서:
#   1. Prerequisites 확인 (도구, 인증, API)
#   2. Terraform Init / Plan / Apply (Infrastructure + K8s 전체)
#   3. GKE kubeconfig 설정
#   4. 배포 검증
# =============================================================================

set -euo pipefail

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TERRAFORM_DIR="${PROJECT_ROOT}/terraform/environments/gcp-staging"

# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------
log_step() {
    local step_num=$1
    local total=$2
    local desc=$3
    echo ""
    echo -e "${BLUE}[Step ${step_num}/${total}] ${desc}${NC}"
    echo -e "${BLUE}$(printf '%.0s-' {1..60})${NC}"
}

log_ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_err()  { echo -e "${RED}[ERROR]${NC} $1"; }

TOTAL_STEPS=4

echo -e "${BLUE}=====================================================================${NC}"
echo -e "${BLUE}   GCP Staging 환경 배포 (Terraform IaC)${NC}"
echo -e "${BLUE}=====================================================================${NC}"

# ---------------------------------------------------------------------------
# Step 1: Prerequisites 확인
# ---------------------------------------------------------------------------
log_step 1 $TOTAL_STEPS "Prerequisites 확인"

REQUIRED_TOOLS=("gcloud" "kubectl" "helm" "terraform")
MISSING_TOOLS=()

for tool in "${REQUIRED_TOOLS[@]}"; do
    if command -v "$tool" &> /dev/null; then
        log_ok "$tool 설치됨"
    else
        log_err "$tool 미설치"
        MISSING_TOOLS+=("$tool")
    fi
done

if [ ${#MISSING_TOOLS[@]} -ne 0 ]; then
    log_err "다음 도구를 설치하세요: ${MISSING_TOOLS[*]}"
    exit 1
fi

# GCP 인증 확인
if gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | grep -q "@"; then
    ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)")
    log_ok "GCP 인증: $ACTIVE_ACCOUNT"
else
    log_warn "GCP 로그인이 필요합니다."
    gcloud auth login
    gcloud auth application-default login
fi

# Application Default Credentials 확인
if [ ! -f "$HOME/.config/gcloud/application_default_credentials.json" ]; then
    log_warn "Application Default Credentials를 설정합니다."
    gcloud auth application-default login
fi

log_ok "Prerequisites 확인 완료"

# ---------------------------------------------------------------------------
# Step 2: Terraform 배포
# ---------------------------------------------------------------------------
log_step 2 $TOTAL_STEPS "Terraform Infrastructure 배포"

cd "$TERRAFORM_DIR"
echo "작업 디렉토리: $TERRAFORM_DIR"

# Terraform 초기화
echo ""
echo "--- terraform init ---"
terraform init -input=false

# Plan 생성
echo ""
echo "--- terraform plan ---"
terraform plan -out=tfplan

# 사용자 확인
echo ""
read -p "위 Plan을 적용하시겠습니까? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "배포를 취소합니다."
    exit 0
fi

# Apply 실행
echo ""
echo "--- terraform apply ---"
terraform apply tfplan
rm -f tfplan

log_ok "Terraform 배포 완료"

# ---------------------------------------------------------------------------
# Step 3: GKE kubeconfig 설정
# ---------------------------------------------------------------------------
log_step 3 $TOTAL_STEPS "GKE kubeconfig 설정"

GKE_CLUSTER=$(terraform output -raw gke_cluster_name 2>/dev/null)
GCP_REGION=$(terraform output -raw 2>/dev/null || echo "asia-northeast3")
GCP_PROJECT=$(terraform output -json 2>/dev/null | jq -r '.vpc_network_id.value // empty' | cut -d'/' -f2 || echo "")

# terraform.tfvars에서 직접 읽기 (fallback)
if [ -z "$GCP_PROJECT" ]; then
    GCP_PROJECT=$(grep 'project_id' terraform.tfvars | head -1 | sed 's/.*= *"\(.*\)"/\1/')
fi
GCP_REGION=$(grep 'region' terraform.tfvars | head -1 | sed 's/.*= *"\(.*\)"/\1/')

gcloud container clusters get-credentials "$GKE_CLUSTER" \
    --region "${GCP_REGION}-a" \
    --project "$GCP_PROJECT"

log_ok "kubeconfig 설정 완료 (Cluster: $GKE_CLUSTER)"

# ---------------------------------------------------------------------------
# Step 4: 배포 검증
# ---------------------------------------------------------------------------
log_step 4 $TOTAL_STEPS "배포 검증"

bash "${SCRIPT_DIR}/verify-deployment.sh"

# ---------------------------------------------------------------------------
# 배포 요약
# ---------------------------------------------------------------------------
echo ""
echo -e "${BLUE}=====================================================================${NC}"
echo -e "${GREEN}   배포 완료${NC}"
echo -e "${BLUE}=====================================================================${NC}"
echo ""

cd "$TERRAFORM_DIR"
EXTERNAL_IP=$(terraform output -raw ingress_static_ip 2>/dev/null || echo "N/A")

echo "--- Terraform Outputs ---"
echo "  GKE Cluster:    $(terraform output -raw gke_cluster_name 2>/dev/null || echo 'N/A')"
echo "  Cloud SQL IP:   $(terraform output -raw cloudsql_private_ip 2>/dev/null || echo 'N/A')"
echo "  Redis Host:     $(terraform output -raw redis_host 2>/dev/null || echo 'N/A')"
echo "  Registry URL:   $(terraform output -raw registry_url 2>/dev/null || echo 'N/A')"
echo "  Ingress IP:     $EXTERNAL_IP"
echo ""

if [ "$EXTERNAL_IP" != "N/A" ]; then
    echo "접속 방법:"
    echo "  1. /etc/hosts에 추가:"
    echo "     echo \"$EXTERNAL_IP staging.examonline.com\" | sudo tee -a /etc/hosts"
    echo ""
    echo "  2. 브라우저에서 접속:"
    echo "     http://staging.examonline.com"
fi
echo ""
echo "리소스 확인:"
echo "  kubectl get all -n exam-platform-staging"
echo ""
echo "정리 방법:"
echo "  bash ${SCRIPT_DIR}/cleanup.sh"
