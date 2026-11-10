import json
import logging
import os
from pathlib import Path
from typing import Any, Optional

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from dotenv import load_dotenv

ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

logger = logging.getLogger(__name__)


def descargar_barrios_desde_s3() -> Optional[list[dict[str, Any]]]:
    """
    Descarga y parsea el catálogo barrios_cartagena.json directamente desde Amazon S3.
    Si no hay credenciales configuradas o falla la conexión, retorna None para usar el respaldo local.
    """
    access_key = os.getenv("AWS_ACCESS_KEY_ID")
    secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
    region = os.getenv("AWS_REGION", "us-east-2")
    bucket_name = os.getenv(
        "S3_BUCKET_NAME", "unixdriver-data-cartagenabarrios-2026"
    )
    object_key = os.getenv("S3_BARRIOS_KEY", "barrios_cartagena.json")

    if not access_key or not secret_key or "PEGA_AQUI" in access_key or "tu_access_key" in access_key:
        logger.info(
            "Credenciales AWS no configuradas en .env; se usará el archivo JSON local."
        )
        return None

    try:
        s3_client = boto3.client(
            "s3",
            aws_access_key_id=access_key.strip(),
            aws_secret_access_key=secret_key.strip(),
            region_name=region.strip(),
        )
        respuesta = s3_client.get_object(Bucket=bucket_name.strip(), Key=object_key.strip())
        contenido = respuesta["Body"].read().decode("utf-8")
        datos = json.loads(contenido)
        print(
            f"[AWS S3] Catálogo cargado exitosamente desde s3://{bucket_name}/{object_key} ({len(datos)} barrios)"
        )
        return datos
    except (BotoCoreError, ClientError, Exception) as exc:
        logger.warning(
            f"No se pudo leer desde AWS S3 ({exc}). Usando respaldo local."
        )
        return None