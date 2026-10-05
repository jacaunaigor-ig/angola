# ==============================================================================
# DOCKERFILE - WAR ROOM STREAMLIT (GPS GEOMARKETING ANGOLA 2027)
# ==============================================================================
FROM python:3.11-slim

WORKDIR /app

# Instalar dependências do sistema necessárias para bibliotecas geoespaciais (GDAL/GEOS)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    libgdal-dev \
    libgeos-dev \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar ficheiros da aplicação
COPY app.py .
COPY pages/ ./pages/
COPY angola_populacional/ ./angola_populacional/

# Configurações do Streamlit para Produção
ENV STREAMLIT_SERVER_PORT=8501
ENV STREAMLIT_SERVER_ADDRESS=0.0.0.0
ENV STREAMLIT_SERVER_HEADLESS=true
ENV STREAMLIT_BROWSER_GATHER_USAGE_STATS=false

EXPOSE 8501

HEALTHCHECK CMD curl --fail http://localhost:8501/_stcore/health || exit 1

ENTRYPOINT ["streamlit", "run", "app.py"]
