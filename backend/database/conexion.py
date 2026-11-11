import os
from pathlib import Path

import boto3
from dotenv import load_dotenv
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

USE_RDS_IAM = os.getenv("USE_RDS_IAM", "false").lower() == "true"

if USE_RDS_IAM:
    RDS_HOST = os.getenv("RDS_HOST", "").strip()
    RDS_PORT = int(os.getenv("RDS_PORT", "5432"))
    RDS_DB = os.getenv("RDS_DB", "postgres").strip()
    RDS_USER = os.getenv("RDS_USER", "postgres").strip()
    AWS_REGION = os.getenv("AWS_REGION", "us-east-2").strip()

    DATABASE_URL = f"postgresql://{RDS_USER}@{RDS_HOST}:{RDS_PORT}/{RDS_DB}?sslmode=require"
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)

    @event.listens_for(engine, "do_connect")
    def generar_token_iam_rds(dialect, conn_rec, cargs, cparams):
        rds_client = boto3.client(
            "rds",
            aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID", "").strip(),
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY", "").strip(),
            region_name=AWS_REGION,
        )
        cparams["password"] = rds_client.generate_db_auth_token(
            DBHostname=RDS_HOST,
            Port=RDS_PORT,
            DBUsername=RDS_USER,
            Region=AWS_REGION,
        )
else:
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL no está configurada en backend/.env")
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Proveedora de sesión de base de datos para inyección de dependencias en FastAPI."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()