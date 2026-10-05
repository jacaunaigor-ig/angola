# Contexto de build: raiz do repositório (docker build -f backend/Dockerfile .)
# A API importa war_room/ e lê data/raw/, por isso a imagem espelha o layout do repositório.
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/srv:/srv/backend

WORKDIR /srv/backend

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && useradd --create-home --uid 10001 appuser

COPY backend/app ./app
COPY backend/boot.py backend/create_user.py ./
COPY war_room /srv/war_room
COPY data/raw /srv/data/raw
COPY geo_angola /srv/geo_angola

# Evidências (fotos de atas) vivem fora do PostgreSQL; monte um volume aqui.
RUN mkdir -p /srv/data/storage && chown -R appuser /srv/data/storage
VOLUME ["/srv/data/storage"]

USER appuser
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:%s/health/live' % os.environ.get('API_PORT', '8000'), timeout=3)" || exit 1

CMD ["python", "boot.py"]
