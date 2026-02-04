#!/bin/bash
# =============================================================================
# GCP Staging 환경 배포 검증
# =============================================================================
# Terraform Output을 기반으로 Infrastructure 및 Application 상태를 확인한다.
# =============================================================================

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TERRAFORM_DIR="${PROJECT_ROOT}/terraform/environments/gcp-staging"

echo -e "${BLUE}=== GCP Staging 환경 배포 검증 ===${NC}"
echo ""

# 검증 결과 추적
PASSED=0
FAILED=0
WARNINGS=0

check_pass() { echo -e "${GREEN}[PASS]${NC} $1"; PASSED=$((PASSED + 1)); }
check_fail() { echo -e "${RED}[FAIL]${NC} $1"; FAILED=$((FAILED + 1)); }
check_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; WARNINGS=$((WARNINGS + 1)); }

# ---------------------------------------------------------------------------
# Terraform Output 로드
# ---------------------------------------------------------------------------
echo "--- Terraform Output 로드 ---"
cd "$TERRAFORM_DIR"

GCP_PROJECT=$(grep 'project_id' terraform.tfvars | head -1 | sed 's/.*= *"\(.*\)"/\1/')
GCP_REGION=$(grep 'region' terraform.tfvars | head -1 | sed 's/.*= *"\(.*\)"/\1/')
GKE_CLUSTER=$(terraform output -raw gke_cluster_name 2>/dev/null || echo "")
EXTERNAL_IP=$(terraform output -raw ingress_static_ip 2>/dev/null || echo "")
CLOUDSQL_IP=$(terraform output -raw cloudsql_private_ip 2>/dev/null || echo "")
REDIS_HOST=$(terraform output -raw redis_host 2>/dev/null || echo "")
REGISTRY_URL=$(terraform output -raw registry_url 2>/dev/null || echo "")

if [ -n "$GKE_CLUSTER" ]; then
    check_pass "Terraform Output 로드 성공"
else
    check_fail "Terraform Output 로드 실패 (terraform output 실행 불가)"
    echo "  terraform init을 먼저 실행하세요."
    exit 1
fi
echo ""

# ---------------------------------------------------------------------------
# 1. GCP 인증 확인
# ---------------------------------------------------------------------------
echo "--- GCP 인증 확인 ---"
if gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | grep -q "@"; then
    ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)")
    check_pass "GCP 인증: $ACTIVE_ACCOUNT"
else
    check_fail "GCP 인증 실패"
fi
echo ""

# ---------------------------------------------------------------------------
# 2. GKE Cluster 확인
# ---------------------------------------------------------------------------
echo "--- GKE Cluster 확인 ---"
CLUSTER_LOCATION="${GCP_REGION}-a"
if gcloud container clusters describe "$GKE_CLUSTER" --zone "$CLUSTER_LOCATION" --project "$GCP_PROJECT" &> /dev/null; then
    CLUSTER_STATUS=$(gcloud container clusters describe "$GKE_CLUSTER" --zone "$CLUSTER_LOCATION" --project "$GCP_PROJECT" --format="value(status)")
    if [ "$CLUSTER_STATUS" = "RUNNING" ]; then
        check_pass "GKE Cluster: $GKE_CLUSTER ($CLUSTER_STATUS)"
    else
        check_warn "GKE Cluster: $GKE_CLUSTER ($CLUSTER_STATUS)"
    fi
else
    check_fail "GKE Cluster를 찾을 수 없음: $GKE_CLUSTER"
fi
echo ""

# ---------------------------------------------------------------------------
# 3. kubectl 연결 확인
# ---------------------------------------------------------------------------
echo "--- kubectl 연결 확인 ---"
if kubectl cluster-info &> /dev/null; then
    check_pass "kubectl 연결 성공"
else
    check_fail "kubectl 연결 실패"
    echo "  gcloud container clusters get-credentials $GKE_CLUSTER --zone $CLUSTER_LOCATION --project $GCP_PROJECT"
fi
echo ""

# ---------------------------------------------------------------------------
# 4. Namespace 확인
# ---------------------------------------------------------------------------
echo "--- Namespace 확인 ---"
for ns in argocd ingress-nginx external-secrets exam-platform-staging; do
    if kubectl get namespace "$ns" &> /dev/null; then
        check_pass "Namespace: $ns"
    else
        check_warn "Namespace: $ns (미생성)"
    fi
done
echo ""

# ---------------------------------------------------------------------------
# 5. NGINX Ingress Controller 확인
# ---------------------------------------------------------------------------
echo "--- NGINX Ingress Controller 확인 ---"
INGRESS_SVC_IP=$(kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
if [ -n "$INGRESS_SVC_IP" ]; then
    check_pass "NGINX Ingress Service IP: $INGRESS_SVC_IP"
    if [ -n "$EXTERNAL_IP" ] && [ "$INGRESS_SVC_IP" = "$EXTERNAL_IP" ]; then
        check_pass "Static IP 바인딩 일치: $EXTERNAL_IP"
    elif [ -n "$EXTERNAL_IP" ]; then
        check_warn "Static IP 불일치: Terraform=$EXTERNAL_IP, Actual=$INGRESS_SVC_IP"
    fi
else
    check_warn "NGINX Ingress Service: LoadBalancer IP 미할당"
fi
echo ""

# ---------------------------------------------------------------------------
# 6. ArgoCD 상태 확인
# ---------------------------------------------------------------------------
echo "--- ArgoCD 확인 ---"
if kubectl get namespace argocd &> /dev/null; then
    ARGOCD_RUNNING=$(kubectl get pods -n argocd --no-headers 2>/dev/null | grep -c "Running" || echo 0)
    ARGOCD_TOTAL=$(kubectl get pods -n argocd --no-headers 2>/dev/null | wc -l | tr -d ' ')

    if [ "$ARGOCD_RUNNING" -gt 0 ]; then
        check_pass "ArgoCD Pods: $ARGOCD_RUNNING/$ARGOCD_TOTAL Running"
    else
        check_warn "ArgoCD Pods: $ARGOCD_RUNNING/$ARGOCD_TOTAL Running"
    fi

    # Root App 확인
    if kubectl get application root-app -n argocd &> /dev/null; then
        ROOT_HEALTH=$(kubectl get application root-app -n argocd -o jsonpath='{.status.health.status}' 2>/dev/null || echo "Unknown")
        ROOT_SYNC=$(kubectl get application root-app -n argocd -o jsonpath='{.status.sync.status}' 2>/dev/null || echo "Unknown")
        if [ "$ROOT_HEALTH" = "Healthy" ]; then
            check_pass "Root Application: Health=$ROOT_HEALTH, Sync=$ROOT_SYNC"
        else
            check_warn "Root Application: Health=$ROOT_HEALTH, Sync=$ROOT_SYNC"
        fi
    else
        check_warn "Root Application 미생성"
    fi
else
    check_warn "ArgoCD Namespace 없음"
fi
echo ""

# ---------------------------------------------------------------------------
# 7. External Secrets Operator 확인
# ---------------------------------------------------------------------------
echo "--- External Secrets Operator 확인 ---"
if kubectl get namespace external-secrets &> /dev/null; then
    ESO_RUNNING=$(kubectl get pods -n external-secrets --no-headers 2>/dev/null | grep -c "Running" || echo 0)
    ESO_TOTAL=$(kubectl get pods -n external-secrets --no-headers 2>/dev/null | wc -l | tr -d ' ')

    if [ "$ESO_RUNNING" -gt 0 ]; then
        check_pass "ESO Pods: $ESO_RUNNING/$ESO_TOTAL Running"
    else
        check_warn "ESO Pods: $ESO_RUNNING/$ESO_TOTAL Running"
    fi

    # ClusterSecretStore 확인
    if kubectl get clustersecretstore gcp-secret-manager &> /dev/null; then
        CSS_STATUS=$(kubectl get clustersecretstore gcp-secret-manager -o jsonpath='{.status.conditions[0].status}' 2>/dev/null || echo "Unknown")
        if [ "$CSS_STATUS" = "True" ]; then
            check_pass "ClusterSecretStore: Ready"
        else
            check_warn "ClusterSecretStore: $CSS_STATUS"
        fi
    else
        check_warn "ClusterSecretStore 미생성"
    fi
else
    check_warn "External Secrets Namespace 없음"
fi
echo ""

# ---------------------------------------------------------------------------
# 8. Application Pod 확인
# ---------------------------------------------------------------------------
echo "--- Application Pod 확인 (exam-platform-staging) ---"
if kubectl get namespace exam-platform-staging &> /dev/null; then
    kubectl get pods -n exam-platform-staging --no-headers 2>/dev/null | while IFS= read -r line; do
        POD_NAME=$(echo "$line" | awk '{print $1}')
        POD_STATUS=$(echo "$line" | awk '{print $3}')
        if [ "$POD_STATUS" = "Running" ]; then
            check_pass "Pod: $POD_NAME ($POD_STATUS)"
        else
            check_warn "Pod: $POD_NAME ($POD_STATUS)"
        fi
    done

    # Ingress 확인
    INGRESS_ADDR=$(kubectl get ingress -n exam-platform-staging -o jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
    if [ -n "$INGRESS_ADDR" ]; then
        check_pass "Ingress Address: $INGRESS_ADDR"
    else
        check_warn "Ingress Address: 미할당"
    fi
else
    check_warn "exam-platform-staging Namespace 없음"
fi
echo ""

# ---------------------------------------------------------------------------
# 9. Cloud SQL 확인
# ---------------------------------------------------------------------------
echo "--- Cloud SQL 확인 ---"
DB_INSTANCE_NAME=$(grep 'db_instance_name' "${TERRAFORM_DIR}/terraform.tfvars" | head -1 | sed 's/.*= *"\(.*\)"/\1/')
SQL_FULL_NAME="${DB_INSTANCE_NAME}-staging"
if gcloud sql instances describe "$SQL_FULL_NAME" --project "$GCP_PROJECT" &> /dev/null; then
    SQL_STATUS=$(gcloud sql instances describe "$SQL_FULL_NAME" --project "$GCP_PROJECT" --format="value(state)")
    if [ "$SQL_STATUS" = "RUNNABLE" ]; then
        check_pass "Cloud SQL: $SQL_FULL_NAME ($SQL_STATUS), Private IP: $CLOUDSQL_IP"
    else
        check_warn "Cloud SQL: $SQL_FULL_NAME ($SQL_STATUS)"
    fi
else
    check_fail "Cloud SQL 인스턴스를 찾을 수 없음: $SQL_FULL_NAME"
fi
echo ""

# ---------------------------------------------------------------------------
# 10. Memorystore (Redis) 확인
# ---------------------------------------------------------------------------
echo "--- Memorystore (Redis) 확인 ---"
REDIS_INSTANCE_NAME=$(grep 'redis_instance_name' "${TERRAFORM_DIR}/terraform.tfvars" | head -1 | sed 's/.*= *"\(.*\)"/\1/')
REDIS_FULL_NAME="${REDIS_INSTANCE_NAME}-staging"
if gcloud redis instances describe "$REDIS_FULL_NAME" --region "$GCP_REGION" --project "$GCP_PROJECT" &> /dev/null; then
    REDIS_STATUS=$(gcloud redis instances describe "$REDIS_FULL_NAME" --region "$GCP_REGION" --project "$GCP_PROJECT" --format="value(state)")
    if [ "$REDIS_STATUS" = "READY" ]; then
        check_pass "Redis: $REDIS_FULL_NAME ($REDIS_STATUS), Host: $REDIS_HOST"
    else
        check_warn "Redis: $REDIS_FULL_NAME ($REDIS_STATUS)"
    fi
else
    check_fail "Redis 인스턴스를 찾을 수 없음: $REDIS_FULL_NAME"
fi
echo ""

# ---------------------------------------------------------------------------
# 11. Artifact Registry 확인
# ---------------------------------------------------------------------------
echo "--- Artifact Registry 확인 ---"
if [ -n "$REGISTRY_URL" ]; then
    BACKEND_COUNT=$(gcloud artifacts docker images list "$REGISTRY_URL" --filter="package:backend" --format="value(package)" 2>/dev/null | wc -l | tr -d ' ')
    FRONTEND_COUNT=$(gcloud artifacts docker images list "$REGISTRY_URL" --filter="package:frontend" --format="value(package)" 2>/dev/null | wc -l | tr -d ' ')

    if [ "$BACKEND_COUNT" -gt 0 ]; then
        check_pass "Backend Image: ${BACKEND_COUNT}개"
    else
        check_warn "Backend Image: 없음"
    fi
    if [ "$FRONTEND_COUNT" -gt 0 ]; then
        check_pass "Frontend Image: ${FRONTEND_COUNT}개"
    else
        check_warn "Frontend Image: 없음"
    fi
else
    check_warn "Artifact Registry URL을 Terraform Output에서 가져올 수 없음"
fi
echo ""

# ---------------------------------------------------------------------------
# 12. Health Check
# ---------------------------------------------------------------------------
echo "--- Health Check ---"
if [ -n "$EXTERNAL_IP" ]; then
    if curl -sf --connect-timeout 5 "http://${EXTERNAL_IP}/api/health" > /dev/null 2>&1; then
        check_pass "Backend Health Check 성공 (http://${EXTERNAL_IP}/api/health)"
    else
        check_warn "Backend Health Check 실패 (서비스 준비 중일 수 있음)"
    fi

    if curl -sf --connect-timeout 5 "http://${EXTERNAL_IP}" > /dev/null 2>&1; then
        check_pass "Frontend 접근 성공 (http://${EXTERNAL_IP})"
    else
        check_warn "Frontend 접근 실패"
    fi
else
    check_warn "Health Check 건너뜀 (Ingress Static IP 없음)"
fi
echo ""

# ---------------------------------------------------------------------------
# 검증 결과 요약
# ---------------------------------------------------------------------------
echo -e "${BLUE}$(printf '%.0s=' {1..60})${NC}"
echo -e "${BLUE}검증 결과 요약${NC}"
echo -e "${BLUE}$(printf '%.0s=' {1..60})${NC}"
echo ""
echo -e "  ${GREEN}PASS: $PASSED${NC}"
echo -e "  ${RED}FAIL: $FAILED${NC}"
echo -e "  ${YELLOW}WARN: $WARNINGS${NC}"
echo ""

if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}모든 주요 검증을 통과했습니다.${NC}"
    if [ "$WARNINGS" -gt 0 ]; then
        echo -e "${YELLOW}경고 항목을 확인하세요.${NC}"
    fi
    exit 0
else
    echo -e "${RED}일부 검증에 실패했습니다.${NC}"
    exit 1
fi
