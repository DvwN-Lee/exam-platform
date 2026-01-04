#Builder Stage

FROM python:3.12-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml README.md ./ 

RUN pip install --no-cache-dir uv && uv sync --no-install-project

#Runtime

FROM python:3.12-slim
 
WORKDIR /app

RUN pip install --no-cache-dir uv

COPY --from=builder /app /app

COPY . . 

EXPOSE 8000

CMD ["uv", "run", "python", "manage.py", "runserver", "0.0.0.0:8000"]

