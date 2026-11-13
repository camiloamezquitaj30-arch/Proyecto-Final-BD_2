from flask import Blueprint, jsonify, request
from mysql.connector import Error
from config import get_db_connection


pedidos_bp = Blueprint('pedidos', __name__, url_prefix='/api/pedidos')


@pedidos_bp.route('/', methods=['GET'])
def obtener_pedidos():
    """
    Endpoint para listar todos los pedidos registrados.
    Ejemplo de URL: GET /api/pedidos
    """
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT id_pedido, fecha_pedido, total_pedido, estado_pedido, id_usuario, id_tercero FROM pedidos;"
        )
        return jsonify(cursor.fetchall()), 200
    except Error as err:
        print(f"Error de BD al obtener pedidos: {err}")
        return jsonify({"error_db": err.msg, "codigo": err.errno}), 500
    except Exception as err:
        print(f"Error al obtener pedidos: {err}")
        return jsonify({"error": str(err)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@pedidos_bp.route('/', methods=['POST'])
def crear_pedido():
    """
    Endpoint para registrar un pedido completo (Maestro-Detalle).
    Espera un JSON con la cabecera del pedido y un arreglo de productos:
    {
      "id_tercero": 1,
      "id_usuario": 6,
      "detalles":
        [
            {"id_producto": 14, "cantidad": 15, "precioUnitario": 85000}
        ]
    }
    """
    datos = request.json

    # 1. Validación de la estructura del JSON
    if not datos or 'id_tercero' not in datos or 'id_usuario' not in datos or 'detalles' not in datos:
        return jsonify({"error": "Faltan datos en la cabecera del pedido (tercero, usuario o detalles)."}), 400

    if not isinstance(datos['detalles'], list) or len(datos['detalles']) == 0:
        return jsonify({"error": "El pedido debe contener al menos un producto en los detalles."}), 400

    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # ==========================================
        # PASO 1: INSERTAR LA CABECERA DEL PEDIDO
        # ==========================================
        sql_pedido = """
            INSERT INTO pedidos (id_usuario, id_tercero)
            VALUES (%s, %s)
        """
        # Nota: total_pedido inicia en 0.00 por defecto y el trigger lo actualiza
        valores_pedido = (
            datos['id_usuario'],
            datos['id_tercero']
        )
        cursor.execute(sql_pedido, valores_pedido)

        id_pedido_generado = cursor.lastrowid

        # ==========================================
        # PASO 2: INSERTAR LOS DETALLES DEL PEDIDO
        # ==========================================
        sql_detalle = """
            INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, precioUnitario, porcentaje_iva)
            VALUES (%s, %s, %s, %s, %s)
        """

        for item in datos['detalles']:
            if 'id_producto' not in item or 'cantidad' not in item or 'precioUnitario' not in item:
                raise ValueError("Estructura de producto inválida en los detalles.")

            porcentaje_iva = item.get('porcentaje_iva')
            if porcentaje_iva is None:
                porcentaje_iva = 0.19

            valores_detalle = (
                id_pedido_generado,
                item['id_producto'],
                item['cantidad'],
                item['precioUnitario'],
                porcentaje_iva
            )
            cursor.execute(sql_detalle, valores_detalle)
            # Cada execute dispara 'detalle_pedido_BEFORE_INSERT' (valida estado activo y cantidad > 0)
            # y 'detalle_pedido_AFTER_INSERT' (incrementa stock, actualiza precioCompra y suma al total).

        # ==========================================
        # PASO 3: CONFIRMAR LA TRANSACCIÓN GLOBAL
        # ==========================================
        conn.commit()

        return jsonify({
            "mensaje": "Pedido registrado con éxito.",
            "id_pedido": id_pedido_generado
        }), 201

    except Error as err:
        print(f"Error de BD en pedido: {err}")
        if conn:
            conn.rollback()
        return jsonify({
            "error_db": err.msg,
            "codigo": err.errno
        }), 400

    except ValueError as ve:
        print(f"Error de validación: {ve}")
        if conn:
            conn.rollback()
        return jsonify({"error": str(ve)}), 400

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


@pedidos_bp.route('/<int:id_pedido>', methods=['GET'])
def obtener_pedido_completo(id_pedido):
    """
    Endpoint para extraer un pedido con todo su detalle.
    Retorna un objeto JSON con la cabecera y un arreglo 'detalles' anidado.
    Ejemplo de URL: GET /api/pedidos/13
    """
    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # 1. Extraer la cabecera (Maestro)
        sql_cabecera = """
            SELECT id_pedido, fecha_pedido, total_pedido, estado_pedido,
                   id_usuario, id_tercero
            FROM pedidos
            WHERE id_pedido = %s
        """
        cursor.execute(sql_cabecera, (id_pedido,))
        pedido = cursor.fetchone()

        if not pedido:
            return jsonify({"error": f"Pedido con ID {id_pedido} no encontrado."}), 404

        # 2. Extraer los detalles con JOIN a productos
        sql_detalles = """
            SELECT dp.id_detalle_pedido, dp.id_producto, p.nombre AS nombre_producto,
                   dp.cantidad, dp.precioUnitario, dp.subtotal,
                   dp.porcentaje_iva, dp.total_producto
            FROM detalle_pedido dp
            INNER JOIN productos p ON dp.id_producto = p.id_producto
            WHERE dp.id_pedido = %s
        """
        cursor.execute(sql_detalles, (id_pedido,))
        detalles = cursor.fetchall()

        # 3. Anidar los detalles en la cabecera
        pedido['detalles'] = detalles

        return jsonify(pedido), 200

    except Error as err:
        print(f"Error de BD al consultar pedido: {err}")
        return jsonify({"error_db": err.msg, "codigo": err.errno}), 500

    except Exception as e:
        print(f"Error inesperado: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@pedidos_bp.route('/<int:id_pedido>', methods=['PUT'])
def actualizar_pedido(id_pedido):
    """
    Endpoint para actualizar un pedido completo (Maestro-Detalle).
    Espera un JSON con la nueva cabecera y el listado de productos:
    {
      "id_tercero": 1,
      "id_usuario": 6,
      "detalles":
        [
            {"id_producto": 14, "cantidad": 10, "precioUnitario": 85000}
        ]
    }
    """
    datos = request.json

    # 1. Validación de la estructura del JSON recibido
    if not datos or 'id_tercero' not in datos or 'id_usuario' not in datos or 'detalles' not in datos:
        return jsonify({"error": "Faltan datos en la cabecera del pedido (tercero, usuario o detalles)."}), 400

    if not isinstance(datos['detalles'], list) or len(datos['detalles']) == 0:
        return jsonify({"error": "El pedido debe contener al menos un producto en los detalles."}), 400

    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # ==========================================
        # PASO 1: VALIDAR QUE EL PEDIDO EXISTA Y SU ESTADO
        # ==========================================
        cursor.execute("SELECT estado_pedido FROM pedidos WHERE id_pedido = %s", (id_pedido,))
        pedido_existente = cursor.fetchone()

        if not pedido_existente:
            return jsonify({"error": f"Pedido con ID {id_pedido} no encontrado."}), 404

        estado_actual = pedido_existente['estado_pedido']
        if estado_actual in ['Anulado', 'Pagado', 'Enviado']:
            return jsonify({"error": f"No se puede modificar un pedido que ya ha sido {estado_actual}."}), 400

        # ==========================================
        # PASO 2: ACTUALIZAR LA CABECERA DEL PEDIDO
        # ==========================================
        sql_pedido = """
            UPDATE pedidos
            SET id_usuario = %s, id_tercero = %s
            WHERE id_pedido = %s
        """
        valores_pedido = (
            datos['id_usuario'],
            datos['id_tercero'],
            id_pedido
        )
        cursor.execute(sql_pedido, valores_pedido)

        # =======================================================
        # PASO 3: ELIMINAR LOS DETALLES PREVIOS DEL PEDIDO
        # =======================================================
        # Al ejecutar este DELETE, el trigger 'detalle_pedido_AFTER_DELETE' de MySQL
        # resta la cantidad previa del stock y descuenta el valor en 'pedidos.total_pedido'.
        cursor.execute("DELETE FROM detalle_pedido WHERE id_pedido = %s", (id_pedido,))

        # ==========================================
        # PASO 4: INSERTAR LOS NUEVOS DETALLES DEL PEDIDO
        # ==========================================
        sql_detalle = """
            INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, precioUnitario, porcentaje_iva)
            VALUES (%s, %s, %s, %s, %s)
        """

        for item in datos['detalles']:
            if 'id_producto' not in item or 'cantidad' not in item or 'precioUnitario' not in item:
                raise ValueError("Estructura de producto inválida en los detalles.")

            porcentaje_iva = item.get('porcentaje_iva')
            if porcentaje_iva is None:
                porcentaje_iva = 0.19

            valores_detalle = (
                id_pedido,
                item['id_producto'],
                item['cantidad'],
                item['precioUnitario'],
                porcentaje_iva
            )
            cursor.execute(sql_detalle, valores_detalle)
            # Dispara 'detalle_pedido_BEFORE_INSERT' y 'detalle_pedido_AFTER_INSERT'.

        # ==========================================
        # PASO 5: CONFIRMAR LA TRANSACCIÓN GLOBAL
        # ==========================================
        conn.commit()

        return jsonify({
            "mensaje": f"Pedido {id_pedido} actualizado con éxito.",
            "id_pedido": id_pedido
        }), 200

    except Error as err:
        print(f"Error de BD al actualizar pedido: {err}")
        if conn:
            conn.rollback()
        return jsonify({
            "error_db": err.msg,
            "codigo": err.errno
        }), 400

    except ValueError as ve:
        print(f"Error de validación: {ve}")
        if conn:
            conn.rollback()
        return jsonify({"error": str(ve)}), 400

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


@pedidos_bp.route('/<int:id_pedido>/anular', methods=['PUT'])
def anular_pedido(id_pedido):
    """
    Endpoint para realizar la anulación lógica de un pedido.
    Ruta: PUT /api/pedidos/<id_pedido>/anular

    Condición Técnica:
    - Únicamente actualiza el campo 'estado_pedido' a 'Anulado'.
    - El backend NO calcula modificaciones ni reglas en Python; delega la consistencia
      y validaciones a los triggers de base de datos.
    - Captura y devuelve al cliente cualquier error de regla de negocio (SIGNAL SQLSTATE '45000')
      lanzado por MySQL.
    """
    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # 1. Validar que el pedido exista en la base de datos
        cursor.execute("SELECT id_pedido FROM pedidos WHERE id_pedido = %s", (id_pedido,))
        pedido = cursor.fetchone()

        if not pedido:
            return jsonify({"error": f"Pedido con ID {id_pedido} no encontrado."}), 404

        # 2. Únicamente actualizar el campo de estado a 'Anulado'.
        # No se valida el estado previo en Python; los triggers en MySQL gestionan
        # las reglas de negocio y restricciones contables (SIGNAL SQLSTATE).
        sql = "UPDATE pedidos SET estado_pedido = 'Anulado' WHERE id_pedido = %s"
        cursor.execute(sql, (id_pedido,))

        conn.commit()

        return jsonify({
            "mensaje": f"Pedido {id_pedido} anulado correctamente.",
            "id_pedido": id_pedido,
            "estado_pedido": "Anulado"
        }), 200

    except Error as err:
        print(f"Error de BD al anular pedido: {err}")
        if conn:
            conn.rollback()
        # Captura y retorna directamente el mensaje de la regla de negocio (SIGNAL SQLSTATE)
        return jsonify({
            "error_db": err.msg,
            "codigo": err.errno
        }), 400

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

