# Documentación del Frontend - Sistema ERP (Bases de Datos II)

Esta documentación describe la arquitectura, estructura de archivos, módulos, endpoints y parámetros implementados en la interfaz de usuario (Frontend) para la gestión del inventario y terceros, conectada a la API REST en Flask, Docker y MySQL 8.0.

---

## 1. Filosofía de Diseño y Arquitectura

El frontend fue diseñado bajo los siguientes principios fundamentales:

1. **Sin Código Espagueti (Modularidad Limpia):**  
   Se implementó la arquitectura modular nativa de JavaScript (ES6 Modules). La lógica se encuentra desacoplada en capas:
   - Configuración global (`config.js`).
   - Capa de comunicación HTTP y manejo centralizado de errores (`api.js`).
   - Controladores de dominio específicos (`productos.js` y `terceros.js`).
   - Orquestador de la aplicación (`app.js`).
2. **Cero Instalaciones de Frameworks Pesados:**  
   No requiere Node.js, npm, Angular ni Vite. Utiliza **HTML5 estándar + Bootstrap 5.3 (vía CDN) + JavaScript puro (Vanilla JS)**.
3. **Independencia Absoluta del Backend:**  
   El backend no depende de la existencia del frontend. Si en algún momento se elimina la carpeta `frontend/`, la API Flask en Docker continúa operando al 100% como lo hacía originalmente con Bruno o cualquier otro cliente HTTP.
4. **Experiencia de Usuario Profesional:**  
   Se integró **SweetAlert2** para alertas interactivas, confirmaciones de inactivación y captura limpia de los mensajes emitidos por los **Triggers de MySQL**.

---

## 2. Estructura de Archivos del Frontend

```text
proyecto_bd2/
│
├── frontend/
│   ├── index.html            # Interfaz principal (Single Page Application con pestañas y modales)
│   ├── css/
│   │   └── styles.css        # Estilos modernos complementarios a Bootstrap 5
│   └── js/
│       ├── config.js         # Constantes globales, URLs base y utilidades de formato
│       ├── api.js            # Cliente HTTP reutilizable con fetch() y captura de errores
│       ├── productos.js      # Controlador CRUD para el inventario de productos
│       ├── terceros.js       # Controlador CRUD para el directorio de terceros
│       └── app.js            # Orquestador, verificación de salud del Backend y navegación
```

---

## 3. Detalle de los Módulos y Endpoints Consumidos

### 3.1. Módulo de Productos

Administra el catálogo de inventario contra el endpoint base: `http://localhost:5001/api/productos`.

| Operación | Método HTTP | Endpoint | Parámetros Enviados (JSON) | Respuesta Esperada |
| :--- | :--- | :--- | :--- | :--- |
| **Listar todos** | `GET` | `/api/productos/` | Ninguno | Array de productos activos (`id_producto`, `nombre`, `cantidad_stock`, `precioVenta`, `estado`). |
| **Consultar por ID** | `GET` | `/api/productos/:id` | Parámetro de ruta `:id` | Objeto con ficha técnica completa (`nivel_minimo`, `precioCompra`, `tarifa_iva`, etc.). |
| **Registrar producto** | `POST` | `/api/productos/` | `nombre` (str, req)<br>`cantidad_stock` (int, req)<br>`nivel_minimo` (int, def: 5)<br>`precioCompra` (float)<br>`precioVenta` (float)<br>`tarifa_iva` (float, def: 0.19) | Código `201 Created`<br>`{"mensaje": "...", "id_producto": ID}` |
| **Actualizar producto** | `PUT` | `/api/productos/:id` | Mismos parámetros que el registro + `:id` en la URL | Código `200 OK`<br>`{"mensaje": "Producto :id actualizado correctamente."}` |
| **Inactivar producto** | `DELETE` | `/api/productos/:id` | Parámetro de ruta `:id` | Código `200 OK`<br>`{"mensaje": "Producto :id inactivado correctamente."}` |

#### Integración con Triggers de MySQL en Productos:
* **Trigger `productos_BEFORE_UPDATE`:**  
  La base de datos rechaza la inactivación (`estado = 0`) si el producto tiene `cantidad_stock > 0` o pedidos asociados.  
  El archivo `productos.js` captura el error `400 Bad Request` devuelto por Flask y exhibe el mensaje exacto generado por MySQL dentro de un cuadro de diálogo SweetAlert2, advirtiendo al usuario que debe actualizar el stock a 0 antes de inactivarlo.

---

### 3.2. Módulo de Terceros

Administra clientes y proveedores contra el endpoint base: `http://localhost:5001/api/terceros`.

| Operación | Método HTTP | Endpoint | Parámetros Enviados (JSON) | Respuesta Esperada |
| :--- | :--- | :--- | :--- | :--- |
| **Listar todos** | `GET` | `/api/terceros/` | Ninguno | Array de terceros activos (`id_tercero`, `nombre`, `correo`, `contacto`, `estado`). |
| **Consultar por ID** | `GET` | `/api/terceros/:id` | Parámetro de ruta `:id` | Objeto con el registro completo del tercero. |
| **Registrar tercero** | `POST` | `/api/terceros/` | `nombre` (str, req)<br>`correo` (str, req, único)<br>`contacto` (str, req, único) | Código `201 Created`<br>`{"mensaje": "...", "id_tercero": ID}` |
| **Actualizar tercero** | `PUT` | `/api/terceros/:id` | `nombre` (str, req)<br>`correo` (str, req)<br>`contacto` (str, req) | Código `200 OK`<br>`{"mensaje": "Tercero :id actualizado correctamente."}` |
| **Inactivar tercero** | `DELETE` | `/api/terceros/:id` | Parámetro de ruta `:id` | Código `200 OK`<br>`{"mensaje": "tercero :id inactivado correctamente."}` |

#### Restricciones de Base de Datos en Terceros:
* Los campos `correo` y `contacto` cuentan con índices únicos (`UNIQUE KEY`). Si el usuario intenta registrar un correo o número telefónico repetido, el frontend captura el error de BD y lo notifica visualmente.

---

## 4. Configuración de CORS en el Backend

En el archivo `backend/app.py` se agregó la configuración de cabeceras CORS:

```python
try:
    from flask_cors import CORS
    CORS(app, resources={r"/*": {"origins": "*"}})
except ImportError:
    @app.after_request
    def agregar_cabeceras_cors(response):
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        return response
```

### ¿Por qué se colocó esto?
1. **Diferencia entre Bruno y el Navegador:**  
   Bruno o Postman son programas de escritorio independientes que realizan peticiones HTTP directas. Los navegadores web (Chrome, Edge, Firefox), en cambio, aplican la política **Same-Origin Policy**.
2. **Origen Cruzado:**  
   Al abrir el frontend en un servidor local (ej. Live Server en el puerto 5500) o como archivo local, el navegador bloquea las llamadas a `http://localhost:5001` a menos que Flask le devuelva cabeceras que otorguen permiso explícito.
3. **Resiliencia:**  
   Se utilizó una estructura con `try / except ImportError` para que, si el contenedor de Docker aún no se ha reconstruido con `flask-cors`, el manejador nativo `@app.after_request` responda inmediatamente sin detener la aplicación.

---

## 5. Instrucciones para Ejecutar y Probar

### 1. Iniciar los Contenedores Docker (Backend + MySQL)
Desde la terminal en la raíz del proyecto:
```bash
docker-compose up -d
```

### 2. Abrir el Frontend
Tienes dos opciones para abrir la interfaz:

* **Opción Recomendada (Live Server en VS Code):**  
  Haz clic derecho sobre `frontend/index.html` y selecciona **"Open with Live Server"** (se abrirá en `http://127.0.0.1:5500` o similar).  
  *Nota: Como se utilizan módulos JavaScript (`type="module"`), Live Server es el método estándar recomendado por los navegadores modernos.*
* **Opción Directa (Navegador):**  
  Puedes hacer doble clic en `frontend/index.html` para abrirlo directamente en tu navegador.

### 3. Verificar el Estado de Conexión
En la esquina superior derecha del panel verás un distintivo (Badge) interactivo:
* 🟢 **Backend Conectado (5001):** Indica que Flask y MySQL están listos y respondiendo.
* 🔴 **Backend Desconectado:** Indica que Docker está detenido o el puerto 5001 no responde. Puedes hacer clic sobre el botón para reintentar la conexión en cualquier momento.

