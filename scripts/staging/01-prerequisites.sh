#!/bin/bash
# =============================================================================
# Prerequisites 확인
# =============================================================================
# 필수 도구 설치 여부와 GCP 인증 상태만 확인한다.
# GCP API 활성화는 Terraform (apis.tf)이 관리한다.
# =============================================================================

set -e

echo "=== Prerequisites 확인 ==="

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ---------------------------------------------------------------------------
# 필수 도구 확인
# ---------------------------------------------------------------------------
check_tool() {
    if command -v "$1" &> /dev/null; then
        echo -e "${GREEN}[OK]${NC} $1 설치됨"
        return 0
    else
        echo -e "${RED}[MISSING]${NC} $1 미설치"
        return 1
    fi
}

REQUIRED_TOOLS=("gcloud" "kubectl" "helm" "terraform")
MISSING_TOOLS=()

echo ""
echo "--- 필수 도구 확인 ---"
for tool in "${REQUIRED_TOOLS[@]}"; do
    if ! check_tool "$tool"; then
        MISSING_TOOLS+=("$tool")
    fi
done

if [ ${#MISSING_TOOLS[@]} -ne 0 ]; then
    echo ""
    echo -e "${RED}다음 도구를 설치하세요: ${MISSING_TOOLS[*]}${NC}"
    echo "  brew install google-cloud-sdk kubectl helm terraform"
    exit 1
fi

echo ""
echo -e "${GREEN}모든 필수 도구가 설치되어 있습니다.${NC}"
echo ""

# ---------------------------------------------------------------------------
# GCP 인증 확인
# ---------------------------------------------------------------------------
echo "--- GCP 인증 확인 ---"
if gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | grep -q "@"; then
    ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)")
    echo -e "${GREEN}[OK]${NC} 활성화된 GCP 계정: $ACTIVE_ACCOUNT"
else
    echo -e "${YELLOW}GCP 로그인이 필요합니다.${NC}"
    gcloud auth login
fi

# Application Default Credentials 확인
echo ""
echo "--- Application Default Credentials 확인 ---"
if [ -f "$HOME/.config/gcloud/application_default_credentials.json" ]; then
    echo -e "${GREEN}[OK]${NC} Application Default Credentials 설정됨"
else
    echo -e "${YELLOW}Application Default Credentials를 설정합니다.${NC}"
    gcloud auth application-default login
fi

# Docker 인증 (Artifact Registry Push가 필요한 경우)
echo ""
echo "--- Docker 인증 설정 ---"
GCP_REGION="asia-northeast3"
gcloud auth configure-docker "${GCP_REGION}-docker.pkg.dev" --quiet
echo -e "${GREEN}[OK]${NC} Docker 인증 완료"

echo ""
echo -e "${GREEN}=== Prerequisites 확인 완료 ===${NC}"
echo ""
echo "GCP API 활성화는 Terraform이 자동으로 관리합니다 (apis.tf)."
echo "다음 명령으로 배포를 진행하세요:"
echo "  bash scripts/staging/deploy-all.sh"
