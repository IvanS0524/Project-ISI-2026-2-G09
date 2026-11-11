# =============================================================================
# Dockerfile - UnixDriver Backend (FastAPI + Python 3.11)
# =============================================================================
FROM python:3.11-slim

# Evitar generación de archivos .pyc, habilitar logs en tiempo real y fijar ruta raíz
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app

# Instalar dependencias del sistema requeridas para PostgreSQL y utilidades
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copiar e instalar primero las dependencias de Python (aprovecha caché de capas)
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/requirements.txt

# Copiar el código fuente del backend (incluyendo backend/data/barrios_cartagena.json)
COPY backend /app/backend

# Documentar el puerto de la API REST
EXPOSE 8000

# Ejecutar servidor FastAPI con Uvicorn escuchando conexiones externas
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
