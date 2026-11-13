from flask import Blueprint, jsonify, request
from mysql.connector import Error
from config import get_db_connection # Importamos la conexión central


# 1. Definir el Blueprint. El primer argumento es su nombre, el segundo su módulo
# El prefijo url_prefix hace que todas las rutas aquí arranquen con /api/terceros


terceros_bp = Blueprint('terceros', __name__, url_prefix='/api/terceros')




@terceros_bp.route('/', methods=['GET'])
def obtener_terceros():
    conn = None
    cursor = None
    try:
        # La conexión se abre DENTRO del try: si MySQL no responde,
        # el except devuelve un JSON de error en lugar de un traceback
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id_tercero, nombre, correo, contacto, estado FROM terceros WHERE estado = 1;")
        return jsonify(cursor.fetchall()), 200
    except Exception as err:
        print(f"Error al obtener terceros: {err}")
        return jsonify({"error": str(err)}), 500
    finally:
        # Solo se cierra lo que llegó a abrirse
        if cursor:
            cursor.close()
        if conn:
            conn.close()

#ID

@terceros_bp.route('/<int:id_tercero>', methods=['GET'])
def obtener_producto_por_id(id_tercero):
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
            SELECT id_tercero, nombre, correo, contacto, estado
            FROM terceros 
            WHERE id_tercero = %s;
        """
        cursor.execute(sql, (id_tercero,))
        producto = cursor.fetchone()
        if not producto:
            return jsonify({"error": f"Producto con ID {id_tercero} no encontrado."}), 404
        return jsonify(producto), 200
    except Exception as err:
        print(f"Error al obtener un Tercero: {err}")
        return jsonify({"error": str(err)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()





@terceros_bp.route('/', methods=['POST'])
def crear_tercero():
    """
    Endpoint para registrar un nuevo tercero en el inventario.
    Espera un JSON con: nombre, cantidad_stock, precioCompra, precioVenta, etc.
    """
    # 1. Extraemos los datos enviados por el cliente
    datos = request.json
    print(datos)
    # 2. Validación básica (El backend no debe confiar en el frontend ciegamente)
    if not datos or 'nombre' not in datos or 'correo' not in datos or 'contacto' not in datos:
        return jsonify({"error": "Todos los campos son obligatorios."}), 400


    conn = None
    cursor = None
   
    try:
        # Abrimos conexión de manera segura
        conn = get_db_connection()
        cursor = conn.cursor()
       
        # 3. La consulta parametrizada (El escudo contra Inyección SQL)
        # Usamos '%s' como marcadores de posición, nunca concatenamos variables aquí
        sql = """
            INSERT INTO terceros
            (nombre, correo, contacto)
            VALUES (%s, %s, %s)
        """
       
        # 4. Los valores que reemplazarán a los marcadores de posición (en orden)
        # Usamos el método .get() en los diccionarios por si el cliente no envía ese dato, asignar un valor por defecto.
        valores = (
            datos['nombre'],
            datos['correo'],
            datos['contacto']
        )
       
        # Ejecutamos la consulta pasándole la tupla de valores
        cursor.execute(sql, valores)
       
        # 5. ¡El Commit!
        # Como estamos modificando la base de datos, debemos confirmar la transacción explícitamente
        conn.commit()
       
        # Retornamos el ID que MySQL generó automáticamente
        id_nuevo = cursor.lastrowid
        return jsonify({
            "mensaje": "Tercero creado con éxito",
            "id_tercero": id_nuevo
        }), 201 # El código 201 significa 'Created'
       
    except Error as err:
        # Capturamos errores específicos de la base de datos (Ej: un dato muy largo para la columna)
        print(f"Error de Base de Datos al crear tercero: {err}")
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




# Eliminarr


@terceros_bp.route('/<int:id_tercero>', methods=['DELETE'])
def eliminar_tercero(id_tercero):
    """
    Endpoint para realizar un borrado lógico de un tercero.
    Cambia el estado del tercero a 0 (inactivo).
    Ejemplo de URL: DELETE /api/terceros/5
    """
    conn = None
    cursor = None
   
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
       
        # Consulta parametrizada para el borrado lógico
        sql = "UPDATE terceros SET estado = 0 WHERE id_tercero = %s"
       
        # Ejecutamos pasando el ID capturado desde la URL
        cursor.execute(sql, (id_tercero,))
        conn.commit()
       
        # Validamos si la base de datos realmente modificó alguna fila
        # Si rowcount es 0, significa que el id_tercero no existe en la tabla
        if cursor.rowcount == 0:
            return jsonify({"error": "tercero no encontrado o ya estaba inactivo."}), 404
           
        return jsonify({"mensaje": f"tercero {id_tercero} inactivado correctamente."}), 200
       
    except Error as err:
        print(f"Error de BD al inactivar tercero: {err}")
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



#Actualiarr



@terceros_bp.route('/<int:id_tercero>', methods=['PUT'])
def actualizar_tercero(id_tercero):
    """
    Endpoint para actualizar los datos de un tercero.
    Permite modificar nombre, correo y contacto.
    """

    # 1. Obtener los datos enviados en formato JSON
    datos = request.get_json(silent=True)

    # 2. Validar que se hayan enviado datos válidos
    if not isinstance(datos, dict):
        return jsonify({"error": "Se debe enviar un JSON válido."}), 400

    # 3. Validar que todos los campos requeridos estén presentes
    if 'nombre' not in datos or 'correo' not in datos or 'contacto' not in datos:
        return jsonify({
            "error": "Los campos 'nombre', 'correo' y 'contacto' son obligatorios."
        }), 400

    # 4. Validar que los campos no estén vacíos
    for campo in ('nombre', 'correo', 'contacto'):
        valor = datos[campo]
        if valor is None or (isinstance(valor, str) and not valor.strip()):
            return jsonify({
                "error": f"El campo '{campo}' no puede estar vacío."
            }), 400

    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # 5. Verificar que el tercero exista y esté activo
        cursor.execute(
            "SELECT id_tercero FROM terceros WHERE id_tercero = %s AND estado = 1",
            (id_tercero,)
        )

        tercero = cursor.fetchone()

        if not tercero:
            return jsonify({
                "error": "Tercero no encontrado o se encuentra inactivo."
            }), 404

        # 6. Actualizar los datos del tercero
        sql = """
            UPDATE terceros
            SET nombre = %s,
                correo = %s,
                contacto = %s
            WHERE id_tercero = %s AND estado = 1
        """

        valores = (
            datos['nombre'],
            datos['correo'],
            datos['contacto'],
            id_tercero
        )

        cursor.execute(sql, valores)
        conn.commit()

        return jsonify({
            "mensaje": f"Tercero {id_tercero} actualizado correctamente."
        }), 200

    except Error as err:
        print(f"Error de BD al actualizar tercero: {err}")

        if conn:
            conn.rollback()

        return jsonify({
            "error_db": err.msg,
            "codigo": err.errno
        }), 400

    except Exception as e:
        print(f"Error inesperado: {e}")

        if conn:
            conn.rollback()

        return jsonify({
            "error": "Error interno del servidor."
        }), 500

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()
