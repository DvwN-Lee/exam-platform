#!/bin/bash
# =============================================================================
# E2E 테스트 실행 (Staging 환경)
# =============================================================================

set -e

# 환경 변수 로드
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/.env.staging"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=== E2E 테스트 실행 (Staging 환경) ==="
echo ""

# Frontend 디렉토리로 이동
FRONTEND_DIR="$(cd "${SCRIPT_DIR}/../../frontend" && pwd)"
cd "$FRONTEND_DIR"

# External IP 확인
echo "--- Staging 환경 External IP 확인 ---"
EXTERNAL_IP=$(kubectl get ingress -n "$K8S_NAMESPACE" -o jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")

if [ -z "$EXTERNAL_IP" ]; then
    echo -e "${RED}Ingress External IP를 찾을 수 없습니다.${NC}"
    echo "먼저 05-helm-deploy.sh를 실행하고 Ingress가 준비될 때까지 기다려주세요."
    exit 1
fi

echo -e "${GREEN}Staging External IP: $EXTERNAL_IP${NC}"
echo ""

# 환경 변수 설정
export VITE_TEST_URL="http://${EXTERNAL_IP}"
export VITE_API_URL="http://${EXTERNAL_IP}/api"

echo "--- E2E 테스트 환경 변수 ---"
echo "VITE_TEST_URL: $VITE_TEST_URL"
echo "VITE_API_URL: $VITE_API_URL"
echo ""

# .env.staging 파일 생성
echo "--- .env.staging 파일 생성 ---"
cat > .env.staging << EOF
VITE_TEST_URL=http://${EXTERNAL_IP}
VITE_API_URL=http://${EXTERNAL_IP}/api
EOF

echo -e "${GREEN}.env.staging 파일 생성 완료${NC}"
echo ""

# Backend Health Check
echo "--- Backend Health Check ---"
for i in {1..10}; do
    if curl -sf "${VITE_API_URL}/health" > /dev/null 2>&1; then
        echo -e "${GREEN}Backend가 정상적으로 응답합니다.${NC}"
        break
    fi
    echo "대기 중... ($i/10)"
    sleep 5
done

if ! curl -sf "${VITE_API_URL}/health" > /dev/null 2>&1; then
    echo -e "${RED}Backend Health Check 실패${NC}"
    echo "Backend Pod 로그를 확인하세요:"
    echo "  kubectl logs -l app=backend -n $K8S_NAMESPACE"
    exit 1
fi
echo ""

# Frontend 접근 확인
echo "--- Frontend 접근 확인 ---"
if curl -sf "${VITE_TEST_URL}" > /dev/null 2>&1; then
    echo -e "${GREEN}Frontend가 정상적으로 응답합니다.${NC}"
else
    echo -e "${YELLOW}Frontend 접근 실패 (계속 진행)${NC}"
fi
echo ""

# Playwright 설치 확인
echo "--- Playwright 브라우저 설치 확인 ---"
if [ ! -d "$HOME/.cache/ms-playwright" ]; then
    echo "Playwright 브라우저를 설치합니다..."
    npx playwright install
fi
echo ""

# 인증 파일 재생성
echo "--- 인증 파일 재생성 ---"
echo -e "${YELLOW}Staging 환경에서 인증을 수행합니다...${NC}"

if npx playwright test e2e/setup/auth.setup.ts --project=setup; then
    echo -e "${GREEN}인증 파일 생성 완료${NC}"
else
    echo -e "${RED}인증 실패${NC}"
    echo "수동으로 인증 정보를 확인하세요."
    exit 1
fi
echo ""

# E2E 테스트 실행
echo "--- E2E 테스트 실행 ---"
echo "대상: $VITE_TEST_URL"
echo ""

# 테스트 실행 옵션
TEST_PATTERN="${1:-}"

if [ -n "$TEST_PATTERN" ]; then
    echo "특정 테스트 실행: $TEST_PATTERN"
    npx playwright test "$TEST_PATTERN" --project=chromium
else
    echo "전체 E2E 테스트 실행"
    npx playwright test --project=chromium
fi

TEST_EXIT_CODE=$?

echo ""

# 테스트 결과 확인
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}=== E2E 테스트 성공 ===${NC}"
else
    echo -e "${RED}=== E2E 테스트 실패 ===${NC}"
    echo ""
    echo "테스트 리포트 확인:"
    echo "  npx playwright show-report e2e/reports"
fi

exit $TEST_EXIT_CODE
