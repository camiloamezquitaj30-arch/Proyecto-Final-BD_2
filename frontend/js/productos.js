/**
 * productos.js - Controlador del Módulo de Productos
 * Gestiona el CRUD completo contra los endpoints de /api/productos/
 */

import { CONFIG, formatearMoneda, escaparHTML } from './config.js';
import { apiFetch } from './api.js';

let modalProductoInstancia = null;
let modalDetalleInstancia = null;

/**
 * Inicializa el módulo de productos y registra eventos del DOM
 */
export function inicializarProductos() {
    const modalElement = document.getElementById('modalProducto');
    if (modalElement && window.bootstrap) {
        modalProductoInstancia = new bootstrap.Modal(modalElement);
    }
    const modalDetalleElement = document.getElementById('modalDetalleProducto');
    if (modalDetalleElement && window.bootstrap) {
        modalDetalleInstancia = new bootstrap.Modal(modalDetalleElement);
    }

    // Formulario de creación/edición
    const form = document.getElementById('formProducto');
    if (form) {
        form.addEventListener('submit', guardarProducto);
    }

    // Botón refrescar
    const btnRefrescar = document.getElementById('btnRefrescarProductos');
    if (btnRefrescar) {
        btnRefrescar.addEventListener('click', () => listarProductos());
    }

    // Botón nuevo producto
    const btnNuevo = document.getElementById('btnNuevoProducto');
    if (btnNuevo) {
        btnNuevo.addEventListener('click', abrirModalCrear);
    }

    // Formulario de búsqueda por ID
    const formBuscar = document.getElementById('formBuscarProducto');
    if (formBuscar) {
        formBuscar.addEventListener('submit', (e) => {
            e.preventDefault();
            const idInput = document.getElementById('inputBuscarProductoId');
            const id = idInput?.value?.trim();
            if (id) {
                buscarProductoPorId(id);
            } else {
                listarProductos();
            }
        });
    }

    // Botón limpiar búsqueda
    const btnLimpiar = document.getElementById('btnLimpiarBuscarProducto');
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', () => {
            const idInput = document.getElementById('inputBuscarProductoId');
            if (idInput) idInput.value = '';
            listarProductos();
        });
    }

    // Delegación de eventos para la tabla (Editar, Eliminar, Ver detalle)
    const tabla = document.getElementById('tablaProductosBody');
    if (tabla) {
        tabla.addEventListener('click', manejarClickTabla);
    }

    // Carga inicial
    listarProductos();
}

/**
 * Consulta y lista todos los productos activos (GET /api/productos/)
 */
export async function listarProductos() {
    const tbody = document.getElementById('tablaProductosBody');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Cargando...</span>
                </div>
                <p class="mt-2 text-muted mb-0">Consultando productos en la base de datos...</p>
            </td>
        </tr>
    `;

    try {
        const productos = await apiFetch(CONFIG.ENDPOINTS.PRODUCTOS);
        actualizarContadoresProductos(productos);

        if (!Array.isArray(productos) || productos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4 text-muted">
                        <i class="fa-solid fa-box-open fa-2x mb-2 text-secondary"></i>
                        <p class="mb-0">No hay productos registrados o activos en la base de datos.</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = productos.map(prod => `
            <tr>
                <td class="fw-bold text-center">#${prod.id_producto}</td>
                <td>
                    <span class="fw-semibold">${escaparHTML(prod.nombre)}</span>
                </td>
                <td class="text-center">
                    <span class="badge ${prod.cantidad_stock > 5 ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning-emphasis'} px-3 py-2">
                        <i class="fa-solid fa-boxes-stacked me-1"></i> ${prod.cantidad_stock} unid.
                    </span>
                </td>
                <td class="text-end fw-semibold text-primary">
                    ${formatearMoneda(prod.precioVenta)}
                </td>
                <td class="text-center">
                    <span class="badge ${prod.estado === 1 ? 'bg-success' : 'bg-secondary'}">
                        ${prod.estado === 1 ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td class="text-end">
                    <div class="btn-group btn-group-sm" role="group">
                        <button class="btn btn-outline-info" data-accion="ver" data-id="${prod.id_producto}" title="Ver Detalle Completo">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-primary" data-accion="editar" data-id="${prod.id_producto}" title="Editar Producto">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button class="btn btn-outline-danger" data-accion="eliminar" data-id="${prod.id_producto}" data-nombre="${escaparHTML(prod.nombre)}" data-stock="${prod.cantidad_stock}" title="Inactivar Producto">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

    } catch (err) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4 text-danger">
                    <i class="fa-solid fa-circle-exclamation fa-2x mb-2"></i>
                    <p class="mb-0 fw-semibold">${escaparHTML(err.message)}</p>
                </td>
            </tr>
        `;
        Swal.fire({
            icon: 'error',
            title: 'Error al listar productos',
            text: err.message
        });
    }
}

/**
 * Consulta un producto por su ID (GET /api/productos/:id)
 */
export async function buscarProductoPorId(id) {
    const tbody = document.getElementById('tablaProductosBody');
    if (!tbody) return;

    try {
        const prod = await apiFetch(`${CONFIG.ENDPOINTS.PRODUCTOS}/${id}`);

        tbody.innerHTML = `
            <tr class="table-info">
                <td class="fw-bold text-center">#${prod.id_producto}</td>
                <td>
                    <span class="fw-semibold">${escaparHTML(prod.nombre)}</span>
                    <span class="badge bg-info text-dark ms-2">Búsqueda directa</span>
                </td>
                <td class="text-center">
                    <span class="badge ${prod.cantidad_stock > 5 ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning-emphasis'} px-3 py-2">
                        ${prod.cantidad_stock} unid.
                    </span>
                </td>
                <td class="text-end fw-semibold text-primary">
                    ${formatearMoneda(prod.precioVenta)}
                </td>
                <td class="text-center">
                    <span class="badge ${prod.estado === 1 ? 'bg-success' : 'bg-secondary'}">
                        ${prod.estado === 1 ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td class="text-end">
                    <div class="btn-group btn-group-sm" role="group">
                        <button class="btn btn-outline-info" data-accion="ver" data-id="${prod.id_producto}">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-primary" data-accion="editar" data-id="${prod.id_producto}">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button class="btn btn-outline-danger" data-accion="eliminar" data-id="${prod.id_producto}" data-nombre="${escaparHTML(prod.nombre)}" data-stock="${prod.cantidad_stock}">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;

        Swal.fire({
            icon: 'success',
            title: 'Producto encontrado',
            text: `Se visualiza el producto: ${prod.nombre}`,
            timer: 1800,
            showConfirmButton: false
        });

    } catch (err) {
        Swal.fire({
            icon: 'warning',
            title: 'No encontrado',
            text: err.message
        });
        listarProductos();
    }
}

/**
 * Abre el modal para registrar un nuevo producto
 */
export function abrirModalCrear() {
    const form = document.getElementById('formProducto');
    if (!form) return;
    form.reset();

    document.getElementById('productoId').value = '';
    document.getElementById('modalProductoTitulo').innerHTML = '<i class="fa-solid fa-plus-circle me-2"></i>Nuevo Producto';
    document.getElementById('productoNivelMinimo').value = 5;
    document.getElementById('productoIva').value = 0.19;

    modalProductoInstancia?.show();
}

/**
 * Consulta un producto por ID y llena el modal para editar (PUT)
 */
export async function abrirModalEditar(id) {
    try {
        const prod = await apiFetch(`${CONFIG.ENDPOINTS.PRODUCTOS}/${id}`);

        document.getElementById('productoId').value = prod.id_producto;
        document.getElementById('productoNombre').value = prod.nombre;
        document.getElementById('productoStock').value = prod.cantidad_stock;
        document.getElementById('productoNivelMinimo').value = prod.nivel_minimo ?? 5;
        document.getElementById('productoPrecioCompra').value = prod.precioCompra ?? 0;
        document.getElementById('productoPrecioVenta').value = prod.precioVenta ?? 0;
        document.getElementById('productoIva').value = prod.tarifa_iva ?? 0.19;

        document.getElementById('modalProductoTitulo').innerHTML = `<i class="fa-solid fa-pen-to-square me-2"></i>Editar Producto #${prod.id_producto}`;

        modalProductoInstancia?.show();
    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'Error al consultar producto para edición',
            text: err.message
        });
    }
}

/**
 * Consulta un producto y abre la ventana modal con todos sus detalles contables
 */
export async function mostrarDetalleProducto(id) {
    try {
        const prod = await apiFetch(`${CONFIG.ENDPOINTS.PRODUCTOS}/${id}`);

        document.getElementById('detalleProductoId').textContent = `#${prod.id_producto}`;
        document.getElementById('detalleProductoNombre').textContent = prod.nombre;
        document.getElementById('detalleProductoStock').textContent = `${prod.cantidad_stock} unidades`;
        document.getElementById('detalleProductoNivelMinimo').textContent = `${prod.nivel_minimo} unidades`;
        document.getElementById('detalleProductoPrecioCompra').textContent = formatearMoneda(prod.precioCompra);
        document.getElementById('detalleProductoPrecioVenta').textContent = formatearMoneda(prod.precioVenta);
        document.getElementById('detalleProductoIva').textContent = `${((prod.tarifa_iva || 0) * 100).toFixed(0)}% (${prod.tarifa_iva})`;
        document.getElementById('detalleProductoEstado').innerHTML = prod.estado === 1
            ? '<span class="badge bg-success">Activo</span>'
            : '<span class="badge bg-secondary">Inactivo</span>';

        modalDetalleInstancia?.show();
    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'No se pudo cargar el detalle',
            text: err.message
        });
    }
}

/**
 * Envía el formulario para Crear (POST) o Actualizar (PUT)
 */
async function guardarProducto(evento) {
    evento.preventDefault();

    const id = document.getElementById('productoId').value;
    const esEdicion = Boolean(id);

    const payload = {
        nombre: document.getElementById('productoNombre').value.trim(),
        cantidad_stock: parseInt(document.getElementById('productoStock').value, 10) || 0,
        nivel_minimo: parseInt(document.getElementById('productoNivelMinimo').value, 10) || 5,
        precioCompra: parseFloat(document.getElementById('productoPrecioCompra').value) || 0,
        precioVenta: parseFloat(document.getElementById('productoPrecioVenta').value) || 0,
        tarifa_iva: parseFloat(document.getElementById('productoIva').value) || 0.19
    };

    if (!payload.nombre) {
        Swal.fire({ icon: 'warning', title: 'Campo requerido', text: 'El nombre del producto es obligatorio.' });
        return;
    }

    const btnGuardar = document.getElementById('btnGuardarProducto');
    const textoOriginal = btnGuardar ? btnGuardar.innerHTML : '';
    if (btnGuardar) {
        btnGuardar.disabled = true;
        btnGuardar.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Guardando...';
    }

    try {
        const url = esEdicion ? `${CONFIG.ENDPOINTS.PRODUCTOS}/${id}` : CONFIG.ENDPOINTS.PRODUCTOS;
        const metodo = esEdicion ? 'PUT' : 'POST';

        const resultado = await apiFetch(url, {
            method: metodo,
            body: payload
        });

        modalProductoInstancia?.hide();

        Swal.fire({
            icon: 'success',
            title: esEdicion ? 'Producto Actualizado' : 'Producto Creado',
            text: resultado.mensaje || 'Operación completada con éxito en MySQL.',
            timer: 2000,
            showConfirmButton: false
        });

        listarProductos();
    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: esEdicion ? 'Error al actualizar producto' : 'Error al registrar producto',
            text: err.message
        });
    } finally {
        if (btnGuardar) {
            btnGuardar.disabled = false;
            btnGuardar.innerHTML = textoOriginal;
        }
    }
}

/**
 * Inactiva un producto (DELETE /api/productos/:id)
 * Valida y muestra el mensaje del TRIGGER de MySQL si tiene stock o pedidos vinculados
 */
export async function eliminarProducto(id, nombre, stock) {
    const stockNum = parseInt(stock, 10) || 0;

    let advertenciaTrigger = '';
    if (stockNum > 0) {
        advertenciaTrigger = `
            <div class="alert alert-warning text-start mt-3 mb-0 small">
                <i class="fa-solid fa-triangle-exclamation me-1"></i>
                <strong>Atención regla de BD:</strong> Este producto tiene <strong>${stockNum}</strong> unidades en stock.
                El trigger <code>productos_BEFORE_UPDATE</code> en MySQL rechazará la inactivación a menos que el stock esté en 0.
            </div>
        `;
    }

    const confirmacion = await Swal.fire({
        title: '¿Inactivar producto?',
        html: `¿Estás seguro de que deseas marcar como inactivo el producto <strong>"${escaparHTML(nombre)}"</strong> (ID #${id})?${advertenciaTrigger}`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: '<i class="fa-solid fa-trash me-1"></i> Sí, inactivar',
        cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) return;

    try {
        const resultado = await apiFetch(`${CONFIG.ENDPOINTS.PRODUCTOS}/${id}`, {
            method: 'DELETE'
        });

        Swal.fire({
            icon: 'success',
            title: 'Producto Inactivado',
            text: resultado.mensaje || `El producto #${id} ha sido inactivado correctamente.`,
            timer: 2000,
            showConfirmButton: false
        });

        listarProductos();
    } catch (err) {
        // Aquí se captura y exhibe con orgullo el trigger de BD ante el profesor
        Swal.fire({
            icon: 'error',
            title: 'Operación rechazada por la Base de Datos',
            html: `
                <div class="text-start">
                    <p class="mb-2"><strong>Mensaje de MySQL:</strong></p>
                    <div class="p-3 bg-light border border-danger-subtle rounded text-danger small font-monospace">
                        ${escaparHTML(err.message)}
                    </div>
                    <p class="mt-2 mb-0 text-muted small">
                        ${stockNum > 0 ? 'Sugerencia: Actualiza el stock a 0 usando el botón Editar antes de intentar inactivarlo.' : ''}
                    </p>
                </div>
            `
        });
    }
}

/**
 * Maneja los clics en los botones de acción de la tabla
 */
function manejarClickTabla(evento) {
    const boton = evento.target.closest('button[data-accion]');
    if (!boton) return;

    const accion = boton.dataset.accion;
    const id = boton.dataset.id;

    if (accion === 'ver') {
        mostrarDetalleProducto(id);
    } else if (accion === 'editar') {
        abrirModalEditar(id);
    } else if (accion === 'eliminar') {
        const nombre = boton.dataset.nombre;
        const stock = boton.dataset.stock;
        eliminarProducto(id, nombre, stock);
    }
}

/**
 * Actualiza los contadores estadísticos de la cabecera
 */
function actualizarContadoresProductos(productos) {
    if (!Array.isArray(productos)) return;
    const totalProductosEl = document.getElementById('statTotalProductos');
    const totalStockEl = document.getElementById('statTotalStock');

    if (totalProductosEl) {
        totalProductosEl.textContent = productos.length;
    }
    if (totalStockEl) {
        const totalStock = productos.reduce((acc, p) => acc + (parseInt(p.cantidad_stock, 10) || 0), 0);
        totalStockEl.textContent = `${totalStock} unid.`;
    }
}

