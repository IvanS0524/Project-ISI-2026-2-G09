# Backend

Esta carpeta contiene el código fuente correspondiente al backend de la solución.

Debe incluir los servicios, APIs, lógica de negocio y demás componentes del lado del servidor utilizados por el proyecto.

## Configuración local

Requisitos: Python 3.11 o superior y PostgreSQL ejecutándose en el puerto `5432`.

Desde la raíz del repositorio, cree o active el entorno virtual e instale las dependencias:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
```

Copie `backend/.env.example` como `backend/.env` y ajuste las credenciales de PostgreSQL.

Inicie la API desde la raíz del repositorio:

```powershell
python -m uvicorn backend.main:app --reload
```

La documentación interactiva queda disponible en `http://127.0.0.1:8000/docs`.
