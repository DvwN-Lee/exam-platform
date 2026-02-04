#!/bin/bash
# =============================================================================
# Docker 이미지 빌드 및 Artifact Registry Push
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

echo "=== Docker 이미지 빌드 및 Push ==="
echo ""

# 프로젝트 루트 디렉토리
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "$PROJECT_ROOT"

echo "프로젝트 루트: $PROJECT_ROOT"
echo ""

# Backend 이미지 빌드
echo "--- Backend 이미지 빌드 ---"
echo "Image: ${GAR_IMAGE_BACKEND}:${BACKEND_VERSION}"
echo ""

cd "${PROJECT_ROOT}/examonline"

docker build \
    -f Dockerfile \
    -t "${GAR_IMAGE_BACKEND}:${BACKEND_VERSION}" \
    -t "${GAR_IMAGE_BACKEND}:latest" \
    .

echo -e "${GREEN}Backend 이미지 빌드 완료${NC}"
echo ""

# Backend 이미지 Push
echo "--- Backend 이미지 Push ---"
docker push "${GAR_IMAGE_BACKEND}:${BACKEND_VERSION}"
docker push "${GAR_IMAGE_BACKEND}:latest"
echo -e "${GREEN}Backend 이미지 Push 완료${NC}"
echo ""

# Frontend 이미지 빌드
echo "--- Frontend 이미지 빌드 ---"
echo "Image: ${GAR_IMAGE_FRONTEND}:${FRONTEND_VERSION}"
echo ""

cd "${PROJECT_ROOT}/frontend"

# Frontend 환경 변수 설정
export VITE_API_URL="http://staging.examonline.com/api"

docker build \
    -f Dockerfile \
    --build-arg VITE_API_URL="${VITE_API_URL}" \
    -t "${GAR_IMAGE_FRONTEND}:${FRONTEND_VERSION}" \
    -t "${GAR_IMAGE_FRONTEND}:latest" \
    .

echo -e "${GREEN}Frontend 이미지 빌드 완료${NC}"
echo ""

# Frontend 이미지 Push
echo "--- Frontend 이미지 Push ---"
docker push "${GAR_IMAGE_FRONTEND}:${FRONTEND_VERSION}"
docker push "${GAR_IMAGE_FRONTEND}:latest"
echo -e "${GREEN}Frontend 이미지 Push 완료${NC}"
echo ""

# 이미지 검증
echo "--- Artifact Registry 이미지 목록 ---"
gcloud artifacts docker images list \
    "${GAR_LOCATION}-docker.pkg.dev/${GCP_PROJECT_ID}/${GAR_REPOSITORY}" \
    --filter="package=${GAR_IMAGE_BACKEND} OR package=${GAR_IMAGE_FRONTEND}" \
    --format="table(package,version,create_time)"
echo ""

echo -e "${GREEN}=== Docker 이미지 빌드 및 Push 완료 ===${NC}"
echo ""
echo "빌드된 이미지:"
echo "  Backend: ${GAR_IMAGE_BACKEND}:${BACKEND_VERSION}"
echo "  Frontend: ${GAR_IMAGE_FRONTEND}:${FRONTEND_VERSION}"
