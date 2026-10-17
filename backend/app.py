from flask import Flask, jsonify
from routes.productos import productos_bp
# esta linea siguiente que hace ? 

app = Flask(__name__)


app.register_blueprint(productos_bp, url_prefix='/api/productos') 



@app.route('/', methods=['GET'])
def inicio():
    return "<p>Hello, World and good bye!</p>"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)