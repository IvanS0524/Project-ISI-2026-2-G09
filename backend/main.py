from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routes import (
    busqueda_routes,
    comision_routes,
    usuario_routes,
    viaje_routes,
)

app = FastAPI(
    title="UnixDriver API",
    description=(
        "API REST para la búsqueda unificada, comparación y solicitud de servicios "
        "de transporte urbano en Cartagena de Indias (Uber, DiDi, inDrive)."
    ),
    version="1.0.0",
)

# Permitir peticiones desde el cliente móvil Android (Kotlin) y cliente web de escritorio
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registro de routers por módulo de dominio
app.include_router(usuario_routes.router)
app.include_router(busqueda_routes.router)
app.include_router(viaje_routes.router)
app.include_router(comision_routes.router)


@app.get("/", tags=["Estado del Sistema"])
def verificar_estado_api():
    """Endpoint raíz para comprobar que el servidor de UnixDriver está activo."""
    return {
        "sistema": "UnixDriver API",
        "estado": "OPERATIVO",
        "ciudad": "Cartagena de Indias, Colombia",
        "documentacion": "/docs",
    }