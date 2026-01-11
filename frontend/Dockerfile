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
ARG VITE_API_BASE_URL=http://localhost:8000/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Production build
RUN npm run build

# ===== Runtime Stage =====
FROM nginx:1.27-alpine AS runtime

# Health check를 위한 curl 설치
RUN apk add --no-cache curl

# Nginx 설정 복사
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Build output 복사
COPY --from=builder /app/dist /usr/share/nginx/html

# 권한 설정
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
