import os
import mysql.connector
from dotenv import load_dotenv

# Fuera de Docker (venv) lee el archivo .env. Dentro del contenedor las variables
# ya llegan por env_file de docker-compose, y load_dotenv NO las sobrescribe
# (override=False por defecto): el mismo código sirve en ambos entornos.
load_dotenv()

def get_db_connection():
    """Retorna una nueva conexión a la base de datos ERP."""
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "servidor_db_2"),
        user=os.getenv("MYSQL_USER"),
        password=os.getenv("MYSQL_PASSWORD"),
        database=os.getenv("MYSQL_DATABASE"),
        port=int(os.getenv("DB_PORT", 3306))
    )
