# Proyecto Bases de Datos II - API REST de Productos con Flask, MySQL y Docker

Este proyecto implementa una arquitectura multicontenedor con Docker Compose para gestionar el inventario y operaciones de productos de un sistema ERP. Incluye una API REST desarrollada en Flask, persistencia en MySQL 8.0, inicialización automática de esquemas con triggers contables y una colección de pruebas en Bruno.

---

## 1. Tecnologías Utilizadas

- **Python 3.12** y **Flask 3.0**: Desarrollo de la API REST y manejo de rutas mediante Blueprints.
- **MySQL 8.0**: Motor de base de datos relacional con integridad referencial y triggers de negocio.
- **mysql-connector-python 8.2**: Conector nativo de Python para la comunicación con MySQL.
- **Docker & Docker Compose**: Contenedorización, orquestación de servicios y redes aisladas.
- **WSL 2 (Ubuntu)**: Entorno de ejecución Linux optimizado en Windows para Docker Desktop.
- **Bruno**: Cliente API ligero para diseño, documentación y ejecución de pruebas del CRUD.
- **MySQL Workbench**: Herramienta visual para administración y auditoría de la base de datos.

---

## 2. Arquitectura del Proyecto

```text
proyecto_bd2/
│
├── api_productos/                # Colección de pruebas de API en Bruno
│   ├── environments/
│   │   └── Local.bru             # Variable de entorno: base_url
│   ├── 1 - Listar Productos.bru
│   ├── 2 - Crear Producto.bru
│   ├── 3 - Consultar Producto por ID.bru
│   ├── 4 - Actualizar Producto.bru
│   ├── 5 - Eliminar Producto (Inactivar).bru
│   ├── 6 - Verificar Eliminacion.bru
│   ├── 7 - Error - Producto Inexistente.bru
│   └── 8 - Error - Datos Incompletos.bru
│
├── backend/                      # Código fuente de la API Flask
│   ├── routes/
│   │   ├── __init__.py
│   │   └── productos.py          # Endpoints del CRUD de productos
│   ├── app.py                    # Punto de entrada de Flask
│   ├── config.py                 # Conexión centralizada a la base de datos
│   ├── Dockerfile                # Imagen personalizada de Python
│   └── requirements.txt          # Dependencias de Python
│
├── db/                           # Scripts SQL de inicialización
│   ├── init.sql                  # Esquema, tablas y triggers (ejecutado por Docker)
│   └── schemaSTD.sql             # Respaldo del esquema estándar
│
├── .env                          # Variables de entorno locales (credenciales)
├── .env.example                  # Plantilla de variables sin contraseñas
├── .gitignore                    # Exclusiones de Git (.env, caches, etc.)
└── docker-compose.yml            # Orquestación de servicios y volúmenes
```

---

## 3. Servicios y Red en Docker Compose

Docker Compose orquesta dos servicios conectados a través de la red tipo bridge `red_erp`:

1. **`servidor_db_2` (MySQL 8.0):**
   - Contenedor: `mysql_bd_2`.
   - Inicialización: monta `./db/init.sql` en `/docker-entrypoint-initdb.d/init.sql`. Se ejecuta automáticamente en el primer arranque para crear la base de datos `erp` y sus 8 tablas.
   - Almacenamiento: volumen persistente nominal `datos_mysql` montado en `/var/lib/mysql`.
   - Healthcheck: valida disponibilidad con `mysqladmin ping` antes de permitir el inicio de Flask.

2. **`api_backend` (Flask):**
   - Contenedor: `backend_flask`.
   - Dependencia: espera a que `servidor_db_2` esté `healthy`.
   - Volumen de desarrollo: `./backend:/app` (recarga en vivo de cambios sin reconstruir la imagen).

---

## 4. Mapeo de Puertos

| Servicio | Puerto Interno (Docker) | Puerto Anfitrión (Tu PC / Windows) | Propósito |
|---|---|---|---|
| **API Flask** | `5000` | `5001` | Consultar la API desde Windows (`http://localhost:5001`). |
| **MySQL** | `3306` | `3308` | Conexión externa desde MySQL Workbench (`127.0.0.1:3308`). |

> **Nota sobre el puerto 3308:** Se asignó el puerto `3308` en Windows para evitar conflictos con el servicio local `MySQL80` (que utiliza el puerto `3307`). Internamente en Docker, los contenedores siguen comunicándose por el puerto estándar `3306`.

---

## 5. Conexión entre Flask y MySQL

La comunicación entre el backend y la base de datos se realiza **internamente dentro de la red de Docker** (`red_erp`):

- **Host:** `servidor_db_2` (nombre del servicio en Docker Compose, resuelto por el DNS interno de Docker).
- **Puerto:** `3306` (puerto interno de MySQL).
- **Usuario:** `estudiante`
- **Contraseña:** `cotecnova2026`
- **Base de Datos:** `erp`

El código en `backend/config.py` centraliza la conexión:
```python
def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "servidor_db_2"),
        user=os.getenv("MYSQL_USER"),
        password=os.getenv("MYSQL_PASSWORD"),
        database=os.getenv("MYSQL_DATABASE"),
        port=int(os.getenv("DB_PORT", 3306))
    )
```

---

## 6. Persistencia de Datos

Los datos de la base de datos no se guardan en carpetas planas de Windows, sino en el volumen gestionado por Docker:
```yaml
volumes:
  datos_mysql:
```
Esto garantiza que los datos perduren tras apagar (`docker compose stop`) o desmontar (`docker compose down`) los contenedores. Solo se perderían si se utiliza la bandera destructiva `docker compose down -v`.

---

## 7. Comandos para Iniciar y Detener el Proyecto

Ejecutar desde **PowerShell**, terminal de **Antigravity IDE** o terminal de **WSL 2** ubicándose en la carpeta raíz del proyecto:

### Iniciar los servicios en segundo plano:
```bash
docker compose up -d
```

### Ver el estado y puertos de los contenedores:
```bash
docker compose ps
```

### Consultar los registros en tiempo real:
```bash
# Ver logs de la API Flask
docker compose logs -f api_backend

# Ver logs de MySQL
docker compose logs -f servidor_db_2
```

### Detener los servicios sin borrar datos:
```bash
docker compose stop
```

### Detener y remover contenedores conservando el volumen de datos:
```bash
docker compose down
```

---

## 8. Conexión desde MySQL Workbench

Para auditar y consultar en tiempo real la misma base de datos que utiliza la API:

1. Abrir **MySQL Workbench**.
2. En la pantalla inicial, hacer clic en el botón **`+`** junto a *MySQL Connections*.
3. Completar los campos:
   - **Connection Name:** `Docker - Proyecto BD2`
   - **Connection Method:** `Standard (TCP/IP)`
   - **Hostname:** `127.0.0.1`
   - **Port:** `3308`
   - **Username:** `estudiante` *(o `root`)*
   - **Password:** Clic en *Store in Vault...* e ingresar `cotecnova2026` *(o `super_root` si se usa root)*.
   - **Default Schema:** `erp`
4. Clic en **Test Connection** (debe indicar conexión exitosa) y luego en **OK**.
5. Al abrir la conexión, consultar la tabla de productos:
   ```sql
   SELECT * FROM erp.productos;
   ```

---

## 9. Pruebas del CRUD en Bruno

La carpeta `api_productos` ya está estructurada como una colección nativa de Bruno.

### Configuración inicial en Bruno:
1. Abrir **Bruno**.
2. Hacer clic en **Open Collection** y seleccionar la carpeta `api_productos`.
3. En la esquina superior derecha de Bruno, seleccionar el entorno **`Local`** (para activar la variable `{{base_url}} = http://localhost:5001/api/productos`).

### Recorrido de pruebas ordenadas:

| Paso | Petición | Método | Endpoint | Descripción | Código Esperado |
|---|---|---|---|---|---|
| **1** | `1 - Listar Productos` | `GET` | `{{base_url}}/` | Consulta los productos activos (`WHERE estado = 1`). | `200 OK` |
| **2** | `2 - Crear Producto` | `POST` | `{{base_url}}/` | Inserta un nuevo producto. Retorna el ID asignado. | `201 Created` |
| **3** | `3 - Consultar Producto por ID` | `GET` | `{{base_url}}/:id` | Retorna el detalle completo del producto recién creado. | `200 OK` |
| **4** | `4 - Actualizar Producto` | `PUT` | `{{base_url}}/:id` | Actualiza nombre, precios y stock. Para permitir su posterior borrado, se actualiza el stock a 0. | `200 OK` |
| **5** | `5 - Eliminar Producto (Inactivar)` | `DELETE` | `{{base_url}}/:id` | Realiza borrado lógico cambiando `estado = 0`. | `200 OK` |
| **6** | `6 - Verificar Eliminacion` | `GET` | `{{base_url}}/` | Confirma que el producto inactivado ya no figura en la lista activa. | `200 OK` |
| **7** | `7 - Error - Producto Inexistente` | `GET` | `{{base_url}}/9999` | Valida el manejo de error cuando un ID no existe. | `404 Not Found` |
| **8** | `8 - Error - Datos Incompletos` | `POST` | `{{base_url}}/` | Valida el rechazo cuando faltan campos requeridos. | `400 Bad Request` |

> [!IMPORTANT]
> **Regla de negocio en la Base de Datos:**  
> La tabla `productos` tiene un trigger (`productos_BEFORE_UPDATE`) que impide inactivar (`estado = 0`) cualquier producto que tenga `cantidad_stock > 0`. Por eso, antes de eliminar lógicamente un producto, su stock debe ser cero.

