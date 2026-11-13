from flask import Blueprint, jsonify, request
from mysql.connector import Error
from config import get_db_connection # Importamos la conexión central


# 1. Definir el Blueprint. El primer argumento es su nombre, el segundo su módulo
# El prefijo url_prefix se define en app.py al registrar el blueprint (/api/productos)


productos_bp = Blueprint('productos', __name__, url_prefix='/api/productos')


@productos_bp.route('/', methods=['GET'])
def obtener_productos():
    conn = None
    cursor = None
    try:
        # La conexión se abre DENTRO del try: si MySQL no responde,
        # el except devuelve un JSON de error en lugar de un traceback
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id_producto, nombre, cantidad_stock, precioVenta, estado FROM productos WHERE estado = 1;")
        return jsonify(cursor.fetchall()), 200
    except Exception as err:
        print(f"Error al obtener productos: {err}")
        return jsonify({"error": str(err)}), 500
    finally:
        # Solo se cierra lo que llegó a abrirse
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@productos_bp.route('/<int:id_producto>', methods=['GET'])
def obtener_producto_por_id(id_producto):
    """
    Endpoint para consultar un producto específico por su identificador.
    Ejemplo: GET /api/productos/1
    """
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        sql = """
            SELECT id_producto, nombre, cantidad_stock, nivel_minimo, precioCompra, precioVenta, estado, tarifa_iva 
            FROM productos 
            WHERE id_producto = %s;
        """
        cursor.execute(sql, (id_producto,))
        producto = cursor.fetchone()
        if not producto:
            return jsonify({"error": f"Producto con ID {id_producto} no encontrado."}), 404
        return jsonify(producto), 200
    except Exception as err:
        print(f"Error al obtener producto: {err}")
        return jsonify({"error": str(err)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# Desde aquí va a creación de productos
@productos_bp.route('/', methods=['POST'])
def crear_producto():
    """
    Endpoint para registrar un nuevo producto en el inventario.
    Espera un JSON con: nombre, cantidad_stock, precioCompra, precioVenta, etc.
    """
    # 1. Extraemos los datos enviados por el cliente
    datos = request.json
    print(datos)
    # 2. Validación básica (El backend no debe confiar en el frontend ciegamente)
    if not datos or 'nombre' not in datos or 'cantidad_stock' not in datos:
        return jsonify({"error": "Los campos 'nombre' y 'cantidad_stock' son obligatorios."}), 400

    conn = None
    cursor = None
   
    try:
        # Abrimos conexión de manera segura
        conn = get_db_connection()
        cursor = conn.cursor()
       
        # 3. La consulta parametrizada (El escudo contra Inyección SQL)
        sql = """
            INSERT INTO productos
            (nombre, cantidad_stock, nivel_minimo, precioCompra, precioVenta, tarifa_iva)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
       
        # 4. Los valores que reemplazarán a los marcadores de posición
        valores = (
            datos['nombre'],
            datos.get('cantidad_stock', 0),
            datos.get('nivel_minimo', 5),
            datos.get('precioCompra', 0.00),
            datos.get('precioVenta', 0.00),
            datos.get('tarifa_iva', 0.19)
        )
       
        # Ejecutamos la consulta pasándole la tupla de valores
        cursor.execute(sql, valores)
       
        # 5. ¡El Commit!
        conn.commit()
       
        # Retornamos el ID que MySQL generó automáticamente
        id_nuevo = cursor.lastrowid
        return jsonify({
            "mensaje": "Producto creado con éxito",
            "id_producto": id_nuevo
        }), 201
       
    except Error as err:
        # Capturamos errores específicos de la base de datos (Ej: un dato muy largo para la columna)
        print(f"Error de Base de Datos al crear producto: {err}")
        # Si algo falla, revertimos la transacción para evitar inconsistencias
        if conn:
             conn.rollback()
        return jsonify({"error": f"Error en BD: {err.msg}"}), 500
       
    except Exception as e:
        # Capturamos cualquier otro error inesperado de Python
        print(f"Error inesperado: {e}")
        if conn:
             conn.rollback()
        return jsonify({"error": "Error interno del servidor"}), 500
       
    finally:
        # 6. El cierre seguro (como vimos en el GET)
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@productos_bp.route('/<int:id_producto>', methods=['DELETE'])
def eliminar_producto(id_producto):
    """
    Endpoint para realizar un borrado lógico de un producto.
    Cambia el estado del producto a 0 (inactivo).
    Ejemplo de URL: DELETE /api/productos/5
    """
    conn = None
    cursor = None
   
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
       
        # Consulta parametrizada para el borrado lógico
        sql = "UPDATE productos SET estado = 0 WHERE id_producto = %s"
       
        # Ejecutamos pasando el ID capturado desde la URL
        cursor.execute(sql, (id_producto,))
        conn.commit()
       
        # Validamos si la base de datos realmente modificó alguna fila
        # Si rowcount es 0, significa que el id_producto no existe en la tabla
        if cursor.rowcount == 0:
            return jsonify({"error": "Producto no encontrado o ya estaba inactivo."}), 404
           
        return jsonify({"mensaje": f"Producto {id_producto} inactivado correctamente."}), 200
       
    except Error as err:
        print(f"Error de BD al inactivar producto: {err}")
        if conn:
            conn.rollback()
        return jsonify({
            "error_db": err.msg,
            "codigo": err.errno
        }), 400 # Usamos 400 Bad Request porque la regla de negocio impidió la acción
       
    except Exception as e:
        print(f"Error inesperado: {e}")
        if conn:
            conn.rollback()
        return jsonify({"error": "Error interno del servidor"}), 500
       
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()




@productos_bp.route('/<int:id_producto>', methods=['PUT'])
def actualizar_producto(id_producto):
    """
    Endpoint para actualizar los datos administrativos de un producto.
    Por seguridad e integridad contable, NO se permite actualizar
    directamente el 'cantidad_stock' ni el 'precioCompra'.
    """
    datos = request.json
   
    # Validamos que nos envíen datos
    if not datos:
        return jsonify({"error": "No se enviaron datos para actualizar."}), 400
       
    # Validamos los campos mínimos requeridos para un PUT (reemplazo completo de la entidad)
    if 'nombre' not in datos or 'cantidad_stock' not in datos  or 'nivel_minimo' not in datos:
        return jsonify({"error": "Los campos 'nombre' y 'cantidad_stock' son obligatorios para actualizar."}), 400


    conn = None
    cursor = None
   
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
       
        # Consulta SQL parametrizada.
        # Observa que excluimos deliberadamente cantidad_stock y precioCompra
        sql = """
            UPDATE productos
            SET nombre = %s,
                cantidad_stock = %s,
                nivel_minimo = %s,
                precioCompra = %s,
                precioVenta = %s,
                tarifa_iva = %s
            WHERE id_producto = %s
        """
       
        # Extraemos los datos del JSON, aplicando valores por defecto si alguno falta
        valores = (
            datos['nombre'],
            datos.get('cantidad_stock', 5),
            datos.get('nivel_minimo', 5),
            datos.get('precioCompra', 0.00),
            datos.get('precioVenta', 0.00),
            datos.get('tarifa_iva', 0.19),
            id_producto # El ID viene de la URL, es el último %s en la consulta
        )
       
        cursor.execute(sql, valores)
        conn.commit() # Confirmamos la transacción
       
        # Validamos si realmente se afectó alguna fila
        # Puede ser 0 si el ID no existe, o si los datos enviados son exactamente iguales a los que ya estaban
        if cursor.rowcount == 0:
            return jsonify({"mensaje": "No se encontraron cambios a aplicar o el producto no existe."}), 404
           
        return jsonify({"mensaje": f"Producto {id_producto} actualizado correctamente."}), 200
       
    except Error as err:
        print(f"Error de BD al actualizar producto: {err}")
        if conn:
            conn.rollback()
        # Captura de errores MySQL (ej: un string más largo que el VARCHAR permitido)
        return jsonify({"error_db": err.msg, "codigo": err.errno}), 400
       
    except Exception as e:
        print(f"Error inesperado: {e}")
        if conn:
            print(e)
            conn.rollback()
        return jsonify({"error": "Error interno del servidor"}), 500
       
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

