# ===== Build Stage =====
FROM ghcr.io/astral-sh/uv:python3.14-bookworm-slim AS builder

WORKDIR /app

# 의존성 파일 복사 (Layer caching 최적화)
COPY pyproject.toml uv.lock ./

# 의존성 설치 (dev 제외, 프로젝트 미설치)
RUN uv sync --frozen --no-dev --no-install-project

# 소스 코드 복사
COPY . .

# 프로젝트 설치
RUN uv sync --frozen --no-dev

# ===== Runtime Stage =====
FROM python:3.14-slim-bookworm AS runtime

# 보안: non-root 사용자 생성
RUN useradd --create-home --shell /bin/bash appuser

WORKDIR /app

# Virtual environment 복사
COPY --from=builder /app/.venv /app/.venv

# 소스 코드 복사
COPY --from=builder /app /app

# PATH 설정
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Static files 및 logs 디렉토리 생성
RUN mkdir -p /app/staticfiles /app/media /app/logs && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

# Gunicorn으로 실행
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "4", "--threads", "2", "examonline.wsgi:application"]
