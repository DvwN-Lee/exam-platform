#!/bin/bash
set -e

echo "Waiting for PostgreSQL..."
while ! python -c "
import os
import psycopg

try:
    conn = psycopg.connect(
        dbname=os.environ['POSTGRES_DB'],
        user=os.environ['POSTGRES_USER'],
        password=os.environ['POSTGRES_PASSWORD'],
        host=os.environ['POSTGRES_HOST'],
        port=os.environ['POSTGRES_PORT']
    )
    conn.close()
    exit(0)
except Exception:
    exit(1)
" 2>/dev/null; do
    echo "PostgreSQL is unavailable - sleeping"
    sleep 2
done
echo "PostgreSQL is available"

echo "Running database migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Starting Gunicorn..."
exec gunicorn \
    --bind 0.0.0.0:8000 \
    --workers "${GUNICORN_WORKERS:-4}" \
    --threads "${GUNICORN_THREADS:-2}" \
    --access-logfile - \
    --error-logfile - \
    examonline.wsgi:application
