/**
 * pedidos.js - Controlador del Módulo de Pedidos (Maestro-Detalle)
 * Gestiona el CRUD completo contra los endpoints de /api/pedidos/
 */

import { CONFIG, formatearMoneda, formatearFecha, obtenerBadgeEstado, escaparHTML } from './config.js';
import { apiFetch } from './api.js';

let modalPedidoInstancia = null;
let modalVerPedidoInstancia = null;
let productosCache = [];

// Estados en los que solo se permite la acción "Ver Pedido Completo" (solo lectura).
// Para agregar un nuevo estado restringido en el futuro (ej: 'Enviado'), añádelo a este arreglo.
const ESTADOS_SOLO_LECTURA = ['Anulado', 'Pagado'];

/**
 * Inicializa el módulo de pedidos y registra eventos del DOM
 */
export function inicializarPedidos() {
    const modalElement = document.getElementById('modalPedido');
    if (modalElement && window.bootstrap) {
        modalPedidoInstancia = new bootstrap.Modal(modalElement);
    }

    const modalVerElement = document.getElementById('modalDetallePedidoCompleto');
    if (modalVerElement && window.bootstrap) {
        modalVerPedidoInstancia = new bootstrap.Modal(modalVerElement);
    }

    const form = document.getElementById('formPedido');
    if (form) {
        form.addEventListener('submit', guardarPedido);
    }

    const btnRefrescar = document.getElementById('btnRefrescarPedidos');
    if (btnRefrescar) {
        btnRefrescar.addEventListener('click', () => listarPedidos());
    }

    const btnNuevo = document.getElementById('btnNuevoPedido');
    if (btnNuevo) {
        btnNuevo.addEventListener('click', abrirModalCrearPedido);
    }

    const btnAgregarItem = document.getElementById('btnAgregarItemPedido');
    if (btnAgregarItem) {
        btnAgregarItem.addEventListener('click', () => {
            agregarFilaDetallePedido();
            recalcularTotalEstimadoPedido();
        });
    }

    const containerDetalles = document.getElementById('pedidoDetallesContainer');
    if (containerDetalles) {
        containerDetalles.addEventListener('click', (e) => {
            const btnQuitar = e.target.closest('.btn-quitar-item-pedido');
            if (!btnQuitar) return;
            const filas = containerDetalles.querySelectorAll('.detalle-item-row');
            if (filas.length <= 1) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Mínimo requerido',
                    text: 'El pedido debe tener al menos un producto en los detalles.'
                });
                return;
            }
            btnQuitar.closest('.detalle-item-row').remove();
            recalcularTotalEstimadoPedido();
        });

        containerDetalles.addEventListener('change', async (e) => {
            if (e.target.classList.contains('pedido-item-producto')) {
                const idProducto = e.target.value;
                const fila = e.target.closest('.detalle-item-row');
                const inputPrecio = fila?.querySelector('.pedido-item-precio');
                if (idProducto && inputPrecio && !inputPrecio.value) {
                    try {
                        const prod = await apiFetch(`${CONFIG.ENDPOINTS.PRODUCTOS}/${idProducto}`);
                        if (prod && prod.precioCompra !== undefined) {
                            inputPrecio.value = prod.precioCompra;
                        }
                    } catch {
                        // Si no se puede consultar el precioCompra, el usuario lo ingresa manualmente
                    }
                }
                recalcularTotalEstimadoPedido();
            }
        });

        containerDetalles.addEventListener('input', () => {
            recalcularTotalEstimadoPedido();
        });
    }

    const formBuscar = document.getElementById('formBuscarPedido');
    if (formBuscar) {
        formBuscar.addEventListener('submit', (e) => {
            e.preventDefault();
            const idInput = document.getElementById('inputBuscarPedidoId');
            const id = idInput?.value?.trim();
            if (id) {
                buscarPedidoPorId(id);
            } else {
                listarPedidos();
            }
        });
    }

    const btnLimpiar = document.getElementById('btnLimpiarBuscarPedido');
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', () => {
            const idInput = document.getElementById('inputBuscarPedidoId');
            if (idInput) idInput.value = '';
            listarPedidos();
        });
    }

    const tabla = document.getElementById('tablaPedidosBody');
    if (tabla) {
        tabla.addEventListener('click', manejarClickTablaPedidos);
    }

    listarPedidos();
}

/**
 * Consulta y lista todos los pedidos registrados (GET /api/pedidos/)
 */
export async function listarPedidos() {
    const tbody = document.getElementById('tablaPedidosBody');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Cargando...</span>
                </div>
                <p class="mt-2 text-muted mb-0">Consultando pedidos en la base de datos...</p>
            </td>
        </tr>
    `;

    try {
        const pedidos = await apiFetch(CONFIG.ENDPOINTS.PEDIDOS);
        actualizarContadorPedidos(pedidos);

        if (!Array.isArray(pedidos) || pedidos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4 text-muted">
                        <i class="fa-solid fa-clipboard-list fa-2x mb-2 text-secondary"></i>
                        <p class="mb-0">No hay pedidos registrados en la base de datos.</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = pedidos.map(p => renderizarFilaPedido(p)).join('');
    } catch (err) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4 text-danger">
                    <i class="fa-solid fa-circle-exclamation fa-2x mb-2"></i>
                    <p class="mb-0 fw-semibold">${escaparHTML(err.message)}</p>
                </td>
            </tr>
        `;
    }
}

function renderizarFilaPedido(pedido, esBusquedaDirecta = false) {
    const soloLectura = ESTADOS_SOLO_LECTURA.includes(pedido.estado_pedido);
    const accionesExtra = soloLectura ? '' : `
        <button class="btn btn-outline-primary" data-accion="editar" data-id="${pedido.id_pedido}" title="Editar Pedido">
            <i class="fa-solid fa-pen-to-square"></i>
        </button>
        <button class="btn btn-outline-danger" data-accion="eliminar" data-id="${pedido.id_pedido}" title="Anular Pedido">
            <i class="fa-solid fa-ban"></i>
        </button>
    `;

    return `
        <tr class="${esBusquedaDirecta ? 'table-info' : ''}">
            <td class="fw-bold text-center">#${pedido.id_pedido}</td>
            <td>
                <span>${escaparHTML(formatearFecha(pedido.fecha_pedido))}</span>
                ${esBusquedaDirecta ? '<span class="badge bg-info text-dark ms-2">Búsqueda directa</span>' : ''}
            </td>
            <td class="text-center"><span class="badge bg-light text-dark border">Usuario #${pedido.id_usuario}</span></td>
            <td class="text-center"><span class="badge bg-light text-dark border">Tercero #${pedido.id_tercero}</span></td>
            <td class="text-end fw-semibold text-primary">${formatearMoneda(pedido.total_pedido)}</td>
            <td class="text-center">${obtenerBadgeEstado(pedido.estado_pedido)}</td>
            <td class="text-end">
                <div class="btn-group btn-group-sm" role="group">
                    <button class="btn btn-outline-info" data-accion="ver" data-id="${pedido.id_pedido}" title="Ver Pedido Completo">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                    ${accionesExtra}
                </div>
            </td>
        </tr>
    `;
}

/**
 * Consulta un pedido por su ID (GET /api/pedidos/:id)
 */
export async function buscarPedidoPorId(id) {
    const tbody = document.getElementById('tablaPedidosBody');
    if (!tbody) return;

    try {
        const pedido = await apiFetch(`${CONFIG.ENDPOINTS.PEDIDOS}/${id}`);
        tbody.innerHTML = renderizarFilaPedido(pedido, true);

        Swal.fire({
            icon: 'success',
            title: 'Pedido encontrado',
            text: `Pedido #${pedido.id_pedido} (${pedido.detalles?.length || 0} producto(s) en detalle).`,
            timer: 1800,
            showConfirmButton: false
        });
    } catch (err) {
        Swal.fire({
            icon: 'warning',
            title: 'No encontrado',
            text: err.message
        });
        listarPedidos();
    }
}

/**
 * Muestra la cabecera y detalles anidados en el modal de visualización
 */
export async function mostrarDetallePedido(id) {
    try {
        const pedido = await apiFetch(`${CONFIG.ENDPOINTS.PEDIDOS}/${id}`);

        document.getElementById('verPedidoId').textContent = `#${pedido.id_pedido}`;
        document.getElementById('verPedidoFecha').textContent = formatearFecha(pedido.fecha_pedido);
        document.getElementById('verPedidoUsuario').textContent = `#${pedido.id_usuario}`;
        document.getElementById('verPedidoTercero').textContent = `#${pedido.id_tercero}`;
        document.getElementById('verPedidoEstado').innerHTML = obtenerBadgeEstado(pedido.estado_pedido);
        document.getElementById('verPedidoTotal').textContent = formatearMoneda(pedido.total_pedido);

        const tbodyDetalles = document.getElementById('verPedidoDetallesBody');
        if (tbodyDetalles) {
            const detalles = Array.isArray(pedido.detalles) ? pedido.detalles : [];
            if (detalles.length === 0) {
                tbodyDetalles.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center text-muted py-3">Sin detalles asociados.</td>
                    </tr>
                `;
            } else {
                tbodyDetalles.innerHTML = detalles.map(det => `
                    <tr>
                        <td class="text-center fw-bold">#${det.id_detalle_pedido}</td>
                        <td>${escaparHTML(det.nombre_producto)} <small class="text-muted">(ID ${det.id_producto})</small></td>
                        <td class="text-center">${det.cantidad}</td>
                        <td class="text-end">${formatearMoneda(det.precioUnitario)}</td>
                        <td class="text-center">${((parseFloat(det.porcentaje_iva) || 0) * 100).toFixed(0)}%</td>
                        <td class="text-end">${formatearMoneda(det.subtotal)}</td>
                        <td class="text-end fw-semibold text-primary">${formatearMoneda(det.total_producto)}</td>
                    </tr>
                `).join('');
            }
        }

        modalVerPedidoInstancia?.show();
    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'No se pudo cargar el pedido',
            text: err.message
        });
    }
}

async function cargarCatalogosPedido() {
    const [terceros, productos] = await Promise.all([
        apiFetch(CONFIG.ENDPOINTS.TERCEROS),
        apiFetch(CONFIG.ENDPOINTS.PRODUCTOS)
    ]);

    productosCache = Array.isArray(productos) ? productos : [];

    const selectTercero = document.getElementById('pedidoIdTercero');
    if (selectTercero) {
        if (!Array.isArray(terceros) || terceros.length === 0) {
            selectTercero.innerHTML = '<option value="">No hay terceros activos</option>';
        } else {
            selectTercero.innerHTML = '<option value="">Seleccione un tercero...</option>' +
                terceros.map(t => `<option value="${t.id_tercero}">#${t.id_tercero} - ${escaparHTML(t.nombre)}</option>`).join('');
        }
    }
}

function construirOpcionesProductosPedido(idSeleccionado = '') {
    let opciones = '<option value="">Seleccione producto...</option>';
    let encontrado = false;

    for (const p of productosCache) {
        const selected = String(p.id_producto) === String(idSeleccionado) ? 'selected' : '';
        if (selected) encontrado = true;
        opciones += `<option value="${p.id_producto}" ${selected}>#${p.id_producto} - ${escaparHTML(p.nombre)} (Stock: ${p.cantidad_stock})</option>`;
    }

    if (idSeleccionado && !encontrado) {
        opciones += `<option value="${idSeleccionado}" selected>Producto #${idSeleccionado}</option>`;
    }
    return opciones;
}

function agregarFilaDetallePedido(item = null) {
    const container = document.getElementById('pedidoDetallesContainer');
    if (!container) return;

    const idProducto = item?.id_producto ?? '';
    const cantidad = item?.cantidad ?? 1;
    const precio = item?.precioUnitario ?? '';

    const fila = document.createElement('div');
    fila.className = 'detalle-item-row row g-2 align-items-end';
    fila.innerHTML = `
        <div class="col-md-5">
            <label class="form-label small fw-semibold mb-1">Producto</label>
            <select class="form-select form-select-sm pedido-item-producto" required>
                ${construirOpcionesProductosPedido(idProducto)}
            </select>
        </div>
        <div class="col-md-3">
            <label class="form-label small fw-semibold mb-1">Cantidad</label>
            <input type="number" class="form-control form-control-sm pedido-item-cantidad" min="1" required value="${cantidad}">
        </div>
        <div class="col-md-3">
            <label class="form-label small fw-semibold mb-1">Precio Unit. ($)</label>
            <input type="number" class="form-control form-control-sm pedido-item-precio" step="0.01" min="0" required value="${precio}">
        </div>
        <div class="col-md-1 text-end">
            <button type="button" class="btn btn-outline-danger btn-sm btn-quitar-item-pedido w-100" title="Quitar ítem">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
    `;
    container.appendChild(fila);
}

function recalcularTotalEstimadoPedido() {
    const container = document.getElementById('pedidoDetallesContainer');
    const totalEl = document.getElementById('pedidoTotalEstimado');
    if (!container || !totalEl) return;

    let subtotal = 0;
    container.querySelectorAll('.detalle-item-row').forEach(fila => {
        const cant = parseFloat(fila.querySelector('.pedido-item-cantidad')?.value) || 0;
        const precio = parseFloat(fila.querySelector('.pedido-item-precio')?.value) || 0;
        subtotal += cant * precio;
    });

    totalEl.textContent = formatearMoneda(subtotal);
}

/**
 * Abre el modal para registrar un nuevo pedido
 */
export async function abrirModalCrearPedido() {
    const form = document.getElementById('formPedido');
    if (!form) return;
    form.reset();

    document.getElementById('pedidoId').value = '';
    document.getElementById('modalPedidoTitulo').innerHTML = '<i class="fa-solid fa-plus-circle me-2"></i>Nuevo Pedido';
    document.getElementById('pedidoDetallesContainer').innerHTML = '';

    try {
        await cargarCatalogosPedido();
        agregarFilaDetallePedido();
        recalcularTotalEstimadoPedido();
        modalPedidoInstancia?.show();
    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'Error al preparar formulario de pedido',
            text: err.message
        });
    }
}

/**
 * Carga los datos completos de un pedido y abre el modal para edición (PUT)
 */
export async function abrirModalEditarPedido(id) {
    try {
        const [pedido] = await Promise.all([
            apiFetch(`${CONFIG.ENDPOINTS.PEDIDOS}/${id}`),
            cargarCatalogosPedido()
        ]);

        document.getElementById('pedidoId').value = pedido.id_pedido;

        const selectTercero = document.getElementById('pedidoIdTercero');
        if (selectTercero) {
            if (!selectTercero.querySelector(`option[value="${pedido.id_tercero}"]`)) {
                const opt = document.createElement('option');
                opt.value = pedido.id_tercero;
                opt.textContent = `Tercero #${pedido.id_tercero}`;
                selectTercero.appendChild(opt);
            }
            selectTercero.value = pedido.id_tercero;
        }

        document.getElementById('pedidoIdUsuario').value = pedido.id_usuario;

        const container = document.getElementById('pedidoDetallesContainer');
        container.innerHTML = '';

        const detalles = Array.isArray(pedido.detalles) && pedido.detalles.length > 0 ? pedido.detalles : [null];
        detalles.forEach(item => agregarFilaDetallePedido(item));
        recalcularTotalEstimadoPedido();

        document.getElementById('modalPedidoTitulo').innerHTML = `<i class="fa-solid fa-pen-to-square me-2"></i>Editar Pedido #${pedido.id_pedido}`;
        modalPedidoInstancia?.show();
    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'Error al consultar pedido para edición',
            text: err.message
        });
    }
}

/**
 * Envía la transacción Maestro-Detalle para Crear (POST) o Actualizar (PUT)
 */
async function guardarPedido(evento) {
    evento.preventDefault();

    const id = document.getElementById('pedidoId').value;
    const esEdicion = Boolean(id);

    const idTercero = parseInt(document.getElementById('pedidoIdTercero').value, 10);
    const idUsuario = parseInt(document.getElementById('pedidoIdUsuario').value, 10);

    const detalles = [];
    document.querySelectorAll('#pedidoDetallesContainer .detalle-item-row').forEach(fila => {
        const idProducto = parseInt(fila.querySelector('.pedido-item-producto')?.value, 10);
        const cantidad = parseInt(fila.querySelector('.pedido-item-cantidad')?.value, 10);
        const precioUnitario = parseFloat(fila.querySelector('.pedido-item-precio')?.value);
        if (idProducto && !Number.isNaN(cantidad) && !Number.isNaN(precioUnitario)) {
            detalles.push({ id_producto: idProducto, cantidad, precioUnitario });
        }
    });

    if (!idTercero || !idUsuario || detalles.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Datos incompletos',
            text: 'Debes seleccionar tercero, usuario y al menos un producto válido.'
        });
        return;
    }

    const payload = {
        id_tercero: idTercero,
        id_usuario: idUsuario,
        detalles
    };

    const btnGuardar = document.getElementById('btnGuardarPedido');
    const textoOriginal = btnGuardar ? btnGuardar.innerHTML : '';
    if (btnGuardar) {
        btnGuardar.disabled = true;
        btnGuardar.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Procesando...';
    }

    try {
        const url = esEdicion ? `${CONFIG.ENDPOINTS.PEDIDOS}/${id}` : CONFIG.ENDPOINTS.PEDIDOS;
        const metodo = esEdicion ? 'PUT' : 'POST';

        const resultado = await apiFetch(url, {
            method: metodo,
            body: payload
        });

        modalPedidoInstancia?.hide();

        Swal.fire({
            icon: 'success',
            title: esEdicion ? 'Pedido Actualizado' : 'Pedido Registrado',
            text: resultado.mensaje || 'Operación completada con éxito.',
            timer: 2000,
            showConfirmButton: false
        });

        listarPedidos();
    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: esEdicion ? 'Error al actualizar pedido (Rollback)' : 'Error al registrar pedido (Rollback)',
            html: `
                <div class="text-start">
                    <p class="mb-2"><strong>Detalle del error / Base de Datos:</strong></p>
                    <div class="p-3 bg-light border border-danger-subtle rounded text-danger small font-monospace">
                        ${escaparHTML(err.message)}
                    </div>
                </div>
            `
        });
    } finally {
        if (btnGuardar) {
            btnGuardar.disabled = false;
            btnGuardar.innerHTML = textoOriginal;
        }
    }
}

/**
 * Anula lógicamente un pedido (PUT /api/pedidos/:id/anular)
 */
export async function eliminarPedido(id) {
    const confirmacion = await Swal.fire({
        title: '¿Anular pedido?',
        html: `¿Estás seguro de cambiar el estado del pedido <strong>#${id}</strong> a <strong>"Anulado"</strong>?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: '<i class="fa-solid fa-ban me-1"></i> Sí, anular',
        cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) return;

    try {
        const resultado = await apiFetch(`${CONFIG.ENDPOINTS.PEDIDOS}/${id}/anular`, {
            method: 'PUT'
        });

        Swal.fire({
            icon: 'success',
            title: 'Pedido Anulado',
            text: resultado.mensaje || `El pedido #${id} ha sido anulado correctamente.`,
            timer: 2000,
            showConfirmButton: false
        });

        listarPedidos();
    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'No se pudo anular el pedido',
            text: err.message
        });
    }
}

function manejarClickTablaPedidos(evento) {
    const boton = evento.target.closest('button[data-accion]');
    if (!boton) return;

    const accion = boton.dataset.accion;
    const id = boton.dataset.id;

    if (accion === 'ver') {
        mostrarDetallePedido(id);
    } else if (accion === 'editar') {
        abrirModalEditarPedido(id);
    } else if (accion === 'eliminar') {
        eliminarPedido(id);
    }
}

function actualizarContadorPedidos(pedidos) {
    if (!Array.isArray(pedidos)) return;
    const totalEl = document.getElementById('statTotalPedidos');
    if (totalEl) {
        totalEl.textContent = pedidos.length;
    }
}

