from flask import Flask, jsonify, request
from routes.productos import productos_bp
from routes.terceros import terceros_bp
from routes.ventas import ventas_bp
from routes.pedidos import pedidos_bp

app = Flask(__name__)

# Desactivar strict_slashes para que las rutas respondan igual con o sin barra final
# (evita redirecciones 308 que bloquean las peticiones preflight CORS del navegador)
app.url_map.strict_slashes = False

# ==============================================================================
# ¿POR QUÉ SE CONFIGURA CORS AQUÍ?
# ==============================================================================
# En pruebas con clientes como Bruno o Postman no existen restricciones de origen,
# ya que son aplicaciones de escritorio directas. Sin embargo, cuando el usuario
# abre el Frontend en su navegador (usando HTML, CSS y JS con la función fetch()),
# el navegador aplica de manera obligatoria la política de seguridad conocida como
# "Same-Origin Policy" (Política del Mismo Origen).
#
# Si el Frontend se ejecuta en un origen distinto (por ejemplo, Live Server en el puerto 5500
# o abriendo el archivo HTML localmente) e intenta comunicarse con la API en el puerto 5001,
# el navegador bloqueará la petición a menos que el Backend envíe las cabeceras CORS
# (Cross-Origin Resource Sharing) que autorizan dicha comunicación.
#
# Al habilitar CORS:
# 1. Permitimos que el Frontend consuma los métodos GET, POST, PUT, DELETE y OPTIONS.
# 2. Mantenemos el Backend 100% independiente: si en cualquier momento se elimina o
#    reemplaza la carpeta del Frontend, esta API sigue funcionando intacta para cualquier cliente.
# ==============================================================================
try:
    from flask_cors import CORS
    CORS(app, resources={r"/*": {"origins": "*"}})
except ImportError:
    pass

# Manejo de preflight OPTIONS y cabeceras CORS de forma nativa:
@app.before_request
def manejar_preflight():
    if request.method == "OPTIONS":
        response = app.make_default_options_response()
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        return response

@app.after_request
def agregar_cabeceras_cors(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response

# register_blueprint conecta el grupo de rutas definido en routes/productos.py
# con la aplicación. url_prefix hace que todas arranquen con /api/productos
app.register_blueprint(productos_bp)
app.register_blueprint(terceros_bp)
app.register_blueprint(ventas_bp)
app.register_blueprint(pedidos_bp)



@app.route('/', methods=['GET'])
def inicio():
    return "<p>Hello, World and good bye Enriqueee!</p>"


if __name__ == '__main__':
    # host='0.0.0.0' es obligatorio en Docker: con 127.0.0.1 Flask solo
    # escucharía dentro del contenedor y el puerto publicado no le llegaría
    app.run(host='0.0.0.0', port=5000, debug=True)


#http://localhost:5001/api/productos
#http://localhost:5001/api/terceros
#http://localhost:5001
