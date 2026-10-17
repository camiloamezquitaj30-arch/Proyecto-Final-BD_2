import os
import mysql.connector

def get_db_connection():
    """Retorna una nueva conexión a la base de datos ERP."""
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "db"),
        user=os.getenv("MYSQL_USER"),
        password=os.getenv("MYSQL_PASSWORD"),
        database=os.getenv("MYSQL_DATABASE"), 
        port=int(os.getenv("DB_PORT", 3306))
    )