from flask import Blueprint, jsonify, request
from mysql.connector import Error
from config import get_db_connection


ventas_bp = Blueprint('ventas', __name__, url_prefix='/api/ventas')




@ventas_bp.route('/', methods=['GET'])
def obtener_ventas():
    conn = None
    cursor = None
    try:
        # La conexión se abre DENTRO del try: si MySQL no responde,
        # el except devuelve un JSON de error en lugar de un traceback
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id_venta, fecha_venta, total_venta, estado_venta, id_usuario, id_tercero FROM ventas;")
        return jsonify(cursor.fetchall()), 200
    except Exception as err:
        print(f"Error al obtener ventas: {err}")
        return jsonify({"error": str(err)}), 500
    finally:
        # Solo se cierra lo que llegó a abrirse
        if cursor:
            cursor.close()
        if conn:
            conn.close()




@ventas_bp.route('/', methods=['POST'])
def crear_venta():
    """
    Endpoint para registrar una venta completa (Maestro-Detalle).
    Espera un JSON con la cabecera de la venta y un arreglo de productos:
    {
      "id_tercero": 3,
      "id_usuario": 1,
      "detalles":
        [
            {"id_producto": 5, "cantidad": 2, "precioUnitario": 120000},
            {"id_producto": 8, "cantidad": 1, "precioUnitario": 45000}
        ]
    }
    """
    datos = request.json
   
    # 1. Validación de la estructura del JSON
    if not datos or 'id_tercero' not in datos or 'id_usuario' not in datos or 'detalles' not in datos:
        return jsonify({"error": "Faltan datos en la cabecera de la venta (tercero, usuario o detalles)."}), 400
       
    if not isinstance(datos['detalles'], list) or len(datos['detalles']) == 0:
        return jsonify({"error": "La venta debe contener al menos un producto en los detalles."}), 400


    conn = None
    cursor = None
   
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
       
        # ==========================================
        # PASO 1: INSERTAR LA CABECERA DE LA VENTA
        # ==========================================
        sql_venta = """
            INSERT INTO ventas (id_usuario, id_tercero)
            VALUES (%s, %s)
        """
        # Nota: total_venta inicia en 0.00 por defecto en la BD y el trigger lo actualizará
        valores_venta = (
            datos['id_usuario'],
            datos['id_tercero']
        )
        cursor.execute(sql_venta, valores_venta)
       
        # Capturamos el ID de la venta recién creada para usarlo en los detalles
        id_venta_generado = cursor.lastrowid
       
        # ==========================================
        # PASO 2: INSERTAR LOS DETALLES DE LA VENTA
        # ==========================================
        sql_detalle = """
            INSERT INTO detalleventa (id_venta, id_producto, cantidad, precioUnitario)
            VALUES (%s, %s, %s, %s)
        """
       
        # Iteramos sobre la lista de productos enviada desde el frontend
        for item in datos['detalles']:  
            # Validamos que cada ítem tenga la información mínima
            if 'id_producto' not in item or 'cantidad' not in item or 'precioUnitario' not in item:
                # Si un producto viene mal, lanzamos un error manual para abortar TODO
                raise ValueError("Estructura de producto inválida en los detalles.")
               
            valores_detalle = (
                id_venta_generado,
                item['id_producto'],
                item['cantidad'],
                item['precioUnitario']
            )
            cursor.execute(sql_detalle, valores_detalle)
           
            # ¡MAGIA TRAS BAMBALINAS!
            # Cada vez que este execute() corre, MySQL dispara tu trigger 'detalleventa_AFTER_INSERT'
            # el cual descuenta el stock en 'productos' y suma el total en 'ventas'.
           
        # ==========================================
        # PASO 3: CONFIRMAR LA TRANSACCIÓN GLOBAL
        # ==========================================
        # Si llegamos a esta línea sin errores, guardamos la cabecera y TODOS los detalles
        conn.commit()
       
        return jsonify({
            "mensaje": "Venta registrada con éxito.",
            "id_venta": id_venta_generado
        }), 201
       
    except Error as err:
        print(f"Error de BD en venta: {err}")
        # Si falla ALGO (ej. falta de stock activó el trigger), revertimos TODA la venta
        if conn:
            conn.rollback()
           
        # Atrapamos los errores lanzados por el trigger (ej: stock insuficiente, producto inactivo)
        return jsonify({
            "error_db": err.msg,
            "codigo": err.errno
        }), 400
       
    except ValueError as ve:
        # Capturamos nuestra validación manual de estructura
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


@ventas_bp.route('/<int:id_venta>', methods=['GET'])
def obtener_venta_completa(id_venta):
    """
    Endpoint para extraer una venta con todo su detalle.
    Retorna un objeto JSON con la cabecera y un arreglo 'detalles' anidado.
    Ejemplo de URL: GET /api/ventas/1
    """
    conn = None
    cursor = None
   
    try:
        conn = get_db_connection()
        # Inicializamos el cursor como diccionario para facilitar la conversión a JSON
        cursor = conn.cursor(dictionary=True)
       
        # ==========================================
        # 1. EXTRAER LA CABECERA (MAESTRO)
        # ==========================================
        sql_cabecera = """
            SELECT id_venta, fecha_venta, total_venta, estado_venta,
                   id_usuario, id_tercero
            FROM ventas
            WHERE id_venta = %s
        """
        cursor.execute(sql_cabecera, (id_venta,))
        venta = cursor.fetchone() # Usamos fetchone() porque es un solo registro
       
        # Si la venta no existe, retornamos 404
        if not venta:
            return jsonify({"error": f"Venta con ID {id_venta} no encontrada."}), 404
           
        # ==========================================
        # 2. EXTRAER LOS DETALLES CON UN JOIN
        # ==========================================
        # Hacemos JOIN con la tabla productos para traer el nombre del producto.
        # Esto le ahorra al frontend tener que hacer otra petición para saber qué compró.
        sql_detalles = """
            SELECT dv.id_detalle_venta, dv.id_producto, p.nombre AS nombre_producto,
                   dv.cantidad, dv.precioUnitario, dv.subtotal,
                   dv.porcentaje_iva
            FROM detalleventa dv
            INNER JOIN productos p ON dv.id_producto = p.id_producto
            WHERE dv.id_venta = %s
        """
        cursor.execute(sql_detalles, (id_venta,))
        detalles = cursor.fetchall() # Usamos fetchall() porque pueden ser muchos productos
       
        # ==========================================
        # 3. RECONSTRUIR EL JSON (ANIDAMIENTO)
        # ==========================================
        # Le inyectamos la lista de detalles al diccionario de la cabecera
        venta['detalles'] = detalles
       
        return jsonify(venta), 200
       
    except Error as err:
        print(f"Error de BD al consultar venta: {err}")
        return jsonify({"error_db": err.msg, "codigo": err.errno}), 500
       
    except Exception as e:
        print(f"Error inesperado: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500
       
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@ventas_bp.route('/<int:id_venta>', methods=['PUT'])
def actualizar_venta(id_venta):
    """
    Endpoint para actualizar una venta completa (Maestro-Detalle).
    Espera un JSON con la nueva cabecera y el listado de productos:
    {
      "id_tercero": 3,
      "id_usuario": 1,
      "detalles":
        [
            {"id_producto": 5, "cantidad": 2, "precioUnitario": 120000},
            {"id_producto": 8, "cantidad": 1, "precioUnitario": 45000}
        ]
    }
    """
    datos = request.json

    # 1. Validación de la estructura del JSON recibido
    if not datos or 'id_tercero' not in datos or 'id_usuario' not in datos or 'detalles' not in datos:
        return jsonify({"error": "Faltan datos en la cabecera de la venta (tercero, usuario o detalles)."}), 400

    if not isinstance(datos['detalles'], list) or len(datos['detalles']) == 0:
        return jsonify({"error": "La venta debe contener al menos un producto en los detalles."}), 400

    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # ==========================================
        # PASO 1: VALIDAR QUE LA VENTA EXISTA Y SU ESTADO
        # ==========================================
        cursor.execute("SELECT estado_venta FROM ventas WHERE id_venta = %s", (id_venta,))
        venta_existente = cursor.fetchone()

        if not venta_existente:
            return jsonify({"error": f"Venta con ID {id_venta} no encontrada."}), 404

        estado_actual = venta_existente['estado_venta']
        if estado_actual in ['Anulado', 'Pagado', 'Enviado']:
            return jsonify({"error": f"No se puede modificar una venta que ya ha sido {estado_actual}."}), 400

        # ==========================================
        # PASO 2: ACTUALIZAR LA CABECERA DE LA VENTA
        # ==========================================
        sql_venta = """
            UPDATE ventas
            SET id_usuario = %s, id_tercero = %s
            WHERE id_venta = %s
        """
        valores_venta = (
            datos['id_usuario'],
            datos['id_tercero'],
            id_venta
        )
        cursor.execute(sql_venta, valores_venta)

        # =======================================================
        # PASO 3: ELIMINAR LOS DETALLES PREVIOS DE LA VENTA
        # =======================================================
        # Al ejecutar este DELETE, el trigger 'detalleventa_AFTER_DELETE' de MySQL
        # se dispara por cada fila eliminada, devolviendo el stock a 'productos'
        # y restando los subtotales de 'ventas.total_venta'.
        cursor.execute("DELETE FROM detalleventa WHERE id_venta = %s", (id_venta,))

        # ==========================================
        # PASO 4: INSERTAR LOS NUEVOS DETALLES DE LA VENTA
        # ==========================================
        sql_detalle = """
            INSERT INTO detalleventa (id_venta, id_producto, cantidad, precioUnitario)
            VALUES (%s, %s, %s, %s)
        """

        for item in datos['detalles']:
            # Validamos que cada ítem tenga la información mínima requerida
            if 'id_producto' not in item or 'cantidad' not in item or 'precioUnitario' not in item:
                raise ValueError("Estructura de producto inválida en los detalles.")

            valores_detalle = (
                id_venta,
                item['id_producto'],
                item['cantidad'],
                item['precioUnitario']
            )
            cursor.execute(sql_detalle, valores_detalle)
            # Cada execute dispara el trigger 'detalleventa_BEFORE_INSERT' (valida stock/activo)
            # y luego 'detalleventa_AFTER_INSERT' (descuenta stock y suma al total de ventas).

        # ==========================================
        # PASO 5: CONFIRMAR LA TRANSACCIÓN GLOBAL
        # ==========================================
        conn.commit()

        return jsonify({
            "mensaje": f"Venta {id_venta} actualizada con éxito.",
            "id_venta": id_venta
        }), 200

    except Error as err:
        print(f"Error de BD al actualizar venta: {err}")
        # Si ocurre cualquier error en BD (ej. stock insuficiente en el trigger),
        # revertimos absolutamente todo: el DELETE anterior, el UPDATE y los INSERTs
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


@ventas_bp.route('/<int:id_venta>/anular', methods=['PUT'])
def anular_venta(id_venta):
    """
    Endpoint para realizar la anulación lógica de una venta.
    Ruta: PUT /api/ventas/<id_venta>/anular

    Condición Técnica:
    - Únicamente actualiza el campo 'estado_venta' a 'Anulado'.
    - El backend NO calcula devoluciones de stock en Python; el trigger de base de datos
      'ventas_AFTER_UPDATE' se encarga de retornar los productos al stock automáticamente.
    - Captura y devuelve al cliente cualquier error de regla de negocio (SIGNAL SQLSTATE '45000'),
      como el lanzado por el trigger 'ventas_BEFORE_UPDATE'.
    """
    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # 1. Validar que la venta exista en la base de datos
        cursor.execute("SELECT id_venta FROM ventas WHERE id_venta = %s", (id_venta,))
        venta = cursor.fetchone()

        if not venta:
            return jsonify({"error": f"Venta con ID {id_venta} no encontrada."}), 404

        # 2. Únicamente actualizar el campo de estado a 'Anulado'.
        # No se valida el estado previo en Python ni se recalcula stock aquí;
        # los triggers en MySQL gestionan la seguridad y la restitución de inventario:
        #   - ventas_BEFORE_UPDATE: Dispara SIGNAL SQLSTATE '45000' si ya estaba anulada.
        #   - ventas_AFTER_UPDATE: Suma de vuelta las cantidades al stock de productos.
        sql = "UPDATE ventas SET estado_venta = 'Anulado' WHERE id_venta = %s"
        cursor.execute(sql, (id_venta,))

        conn.commit()

        return jsonify({
            "mensaje": f"Venta {id_venta} anulada correctamente.",
            "id_venta": id_venta,
            "estado_venta": "Anulado"
        }), 200

    except Error as err:
        print(f"Error de BD al anular venta: {err}")
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




