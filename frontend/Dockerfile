# ===== Build Stage =====
FROM node:22-alpine AS builder

WORKDIR /app

# 의존성 파일 복사 (Layer caching 최적화)
COPY package.json package-lock.json ./

# 의존성 설치
RUN npm ci

# 소스 코드 복사
COPY . .

# Build-time 환경 변수
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Production build
RUN npm run build

# ===== Runtime Stage =====
FROM nginx:1.27-alpine AS runtime

# Health check를 위한 curl 설치
RUN apk add --no-cache curl

# Nginx 설정 템플릿 복사
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Build output 복사
COPY --from=builder /app/dist /usr/share/nginx/html

# 권한 설정
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# 환경 변수 기본값 설정
ENV BACKEND_SERVICE_URL=http://localhost:8000

EXPOSE 80

# nginx 공식 이미지의 docker-entrypoint.sh가 /etc/nginx/templates/*.template 파일을
# envsubst로 처리하여 /etc/nginx/conf.d/에 복사함
CMD ["nginx", "-g", "daemon off;"]
