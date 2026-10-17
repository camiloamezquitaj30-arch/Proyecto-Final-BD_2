from flask import Blueprint, jsonify, request
from config import get_db_connection # Importamos la conexión central

# 1. Definir el Blueprint. El primer argumento es su nombre, el segundo su módulo
# El prefijo url_prefix hace que todas las rutas aquí arranquen con /api/productos

productos_bp = Blueprint('productos', __name__, url_prefix='/api/productos')

@productos_bp.route('/', methods=['GET'])
def obtener_productos():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id_producto, nombre, cantidad_stock, precioVenta, estado FROM productos WHERE estado = 1;")
        return jsonify(cursor.fetchall()), 200
    except Exception as err:
        print(f"Error al obtener productos: {err}")
        return jsonify({"error": str(err)}), 500
    finally:
        cursor.close()
        conn.close()
