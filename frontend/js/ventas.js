/**
 * ventas.js - Controlador del Módulo de Ventas (Maestro-Detalle)
 * Gestiona el CRUD completo contra los endpoints de /api/ventas/
 */

import { CONFIG, formatearMoneda, formatearFecha, obtenerBadgeEstado, escaparHTML } from './config.js';
import { apiFetch } from './api.js';

let modalVentaInstancia = null;
let modalVerVentaInstancia = null;
let productosCache = [];

// Estados en los que solo se permite la acción "Ver Venta Completa" (solo lectura).
// Para agregar un nuevo estado restringido en el futuro (ej: 'Enviado'), añádelo a este arreglo.
const ESTADOS_SOLO_LECTURA = ['Anulado', 'Pagado'];

/**
 * Inicializa el módulo de ventas y registra eventos del DOM
 */
export function inicializarVentas() {
    const modalElement = document.getElementById('modalVenta');
    if (modalElement && window.bootstrap) {
        modalVentaInstancia = new bootstrap.Modal(modalElement);
    }

    const modalVerElement = document.getElementById('modalDetalleVentaCompleto');
    if (modalVerElement && window.bootstrap) {
        modalVerVentaInstancia = new bootstrap.Modal(modalVerElement);
    }

    const form = document.getElementById('formVenta');
    if (form) {
        form.addEventListener('submit', guardarVenta);
    }

    const btnRefrescar = document.getElementById('btnRefrescarVentas');
    if (btnRefrescar) {
        btnRefrescar.addEventListener('click', () => listarVentas());
    }

    const btnNueva = document.getElementById('btnNuevaVenta');
    if (btnNueva) {
        btnNueva.addEventListener('click', abrirModalCrearVenta);
    }

    const btnAgregarItem = document.getElementById('btnAgregarItemVenta');
    if (btnAgregarItem) {
        btnAgregarItem.addEventListener('click', () => {
            agregarFilaDetalleVenta();
            recalcularTotalEstimadoVenta();
        });
    }

    const containerDetalles = document.getElementById('ventaDetallesContainer');
    if (containerDetalles) {
        containerDetalles.addEventListener('click', (e) => {
            const btnQuitar = e.target.closest('.btn-quitar-item-venta');
            if (!btnQuitar) return;
            const filas = containerDetalles.querySelectorAll('.detalle-item-row');
            if (filas.length <= 1) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Mínimo requerido',
                    text: 'La venta debe tener al menos un producto en los detalles.'
                });
                return;
            }
            btnQuitar.closest('.detalle-item-row').remove();
            recalcularTotalEstimadoVenta();
        });

        containerDetalles.addEventListener('change', (e) => {
            if (e.target.classList.contains('venta-item-producto')) {
                const option = e.target.selectedOptions[0];
                const precio = option?.dataset?.precio;
                const fila = e.target.closest('.detalle-item-row');
                const inputPrecio = fila?.querySelector('.venta-item-precio');
                if (inputPrecio && precio !== undefined && precio !== '') {
                    inputPrecio.value = precio;
                }
                recalcularTotalEstimadoVenta();
            }
        });

        containerDetalles.addEventListener('input', () => {
            recalcularTotalEstimadoVenta();
        });
    }

    const formBuscar = document.getElementById('formBuscarVenta');
    if (formBuscar) {
        formBuscar.addEventListener('submit', (e) => {
            e.preventDefault();
            const idInput = document.getElementById('inputBuscarVentaId');
            const id = idInput?.value?.trim();
            if (id) {
                buscarVentaPorId(id);
            } else {
                listarVentas();
            }
        });
    }

    const btnLimpiar = document.getElementById('btnLimpiarBuscarVenta');
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', () => {
            const idInput = document.getElementById('inputBuscarVentaId');
            if (idInput) idInput.value = '';
            listarVentas();
        });
    }

    const tabla = document.getElementById('tablaVentasBody');
    if (tabla) {
        tabla.addEventListener('click', manejarClickTablaVentas);
    }

    listarVentas();
}

/**
 * Consulta y lista todas las ventas registradas (GET /api/ventas/)
 */
export async function listarVentas() {
    const tbody = document.getElementById('tablaVentasBody');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Cargando...</span>
                </div>
                <p class="mt-2 text-muted mb-0">Consultando ventas en la base de datos...</p>
            </td>
        </tr>
    `;

    try {
        const ventas = await apiFetch(CONFIG.ENDPOINTS.VENTAS);
        actualizarContadorVentas(ventas);

        if (!Array.isArray(ventas) || ventas.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4 text-muted">
                        <i class="fa-solid fa-receipt fa-2x mb-2 text-secondary"></i>
                        <p class="mb-0">No hay ventas registradas en la base de datos.</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = ventas.map(v => renderizarFilaVenta(v)).join('');
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

function renderizarFilaVenta(venta, esBusquedaDirecta = false) {
    const soloLectura = ESTADOS_SOLO_LECTURA.includes(venta.estado_venta);
    const accionesExtra = soloLectura ? '' : `
        <button class="btn btn-outline-primary" data-accion="editar" data-id="${venta.id_venta}" title="Editar Venta">
            <i class="fa-solid fa-pen-to-square"></i>
        </button>
        <button class="btn btn-outline-danger" data-accion="eliminar" data-id="${venta.id_venta}" title="Anular Venta">
            <i class="fa-solid fa-ban"></i>
        </button>
    `;

    return `
        <tr class="${esBusquedaDirecta ? 'table-info' : ''}">
            <td class="fw-bold text-center">#${venta.id_venta}</td>
            <td>
                <span>${escaparHTML(formatearFecha(venta.fecha_venta))}</span>
                ${esBusquedaDirecta ? '<span class="badge bg-info text-dark ms-2">Búsqueda directa</span>' : ''}
            </td>
            <td class="text-center"><span class="badge bg-light text-dark border">Usuario #${venta.id_usuario}</span></td>
            <td class="text-center"><span class="badge bg-light text-dark border">Tercero #${venta.id_tercero}</span></td>
            <td class="text-end fw-semibold text-primary">${formatearMoneda(venta.total_venta)}</td>
            <td class="text-center">${obtenerBadgeEstado(venta.estado_venta)}</td>
            <td class="text-end">
                <div class="btn-group btn-group-sm" role="group">
                    <button class="btn btn-outline-info" data-accion="ver" data-id="${venta.id_venta}" title="Ver Venta Completa">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                    ${accionesExtra}
                </div>
            </td>
        </tr>
    `;
}

/**
 * Consulta una venta por su ID (GET /api/ventas/:id)
 */
export async function buscarVentaPorId(id) {
    const tbody = document.getElementById('tablaVentasBody');
    if (!tbody) return;

    try {
        const venta = await apiFetch(`${CONFIG.ENDPOINTS.VENTAS}/${id}`);
        tbody.innerHTML = renderizarFilaVenta(venta, true);

        Swal.fire({
            icon: 'success',
            title: 'Venta encontrada',
            text: `Venta #${venta.id_venta} (${venta.detalles?.length || 0} producto(s) en detalle).`,
            timer: 1800,
            showConfirmButton: false
        });
    } catch (err) {
        Swal.fire({
            icon: 'warning',
            title: 'No encontrada',
            text: err.message
        });
        listarVentas();
    }
}

/**
 * Muestra la cabecera y detalles anidados en el modal de visualización
 */
export async function mostrarDetalleVenta(id) {
    try {
        const venta = await apiFetch(`${CONFIG.ENDPOINTS.VENTAS}/${id}`);

        document.getElementById('verVentaId').textContent = `#${venta.id_venta}`;
        document.getElementById('verVentaFecha').textContent = formatearFecha(venta.fecha_venta);
        document.getElementById('verVentaUsuario').textContent = `#${venta.id_usuario}`;
        document.getElementById('verVentaTercero').textContent = `#${venta.id_tercero}`;
        document.getElementById('verVentaEstado').innerHTML = obtenerBadgeEstado(venta.estado_venta);
        document.getElementById('verVentaTotal').textContent = formatearMoneda(venta.total_venta);

        const tbodyDetalles = document.getElementById('verVentaDetallesBody');
        if (tbodyDetalles) {
            const detalles = Array.isArray(venta.detalles) ? venta.detalles : [];
            if (detalles.length === 0) {
                tbodyDetalles.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center text-muted py-3">Sin detalles asociados.</td>
                    </tr>
                `;
            } else {
                tbodyDetalles.innerHTML = detalles.map(det => `
                    <tr>
                        <td class="text-center fw-bold">#${det.id_detalle_venta}</td>
                        <td>${escaparHTML(det.nombre_producto)} <small class="text-muted">(ID ${det.id_producto})</small></td>
                        <td class="text-center">${det.cantidad}</td>
                        <td class="text-end">${formatearMoneda(det.precioUnitario)}</td>
                        <td class="text-center">${((parseFloat(det.porcentaje_iva) || 0) * 100).toFixed(0)}%</td>
                        <td class="text-end fw-semibold">${formatearMoneda(det.subtotal)}</td>
                    </tr>
                `).join('');
            }
        }

        modalVerVentaInstancia?.show();
    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'No se pudo cargar la venta',
            text: err.message
        });
    }
}

async function cargarCatalogosVenta() {
    const [terceros, productos] = await Promise.all([
        apiFetch(CONFIG.ENDPOINTS.TERCEROS),
        apiFetch(CONFIG.ENDPOINTS.PRODUCTOS)
    ]);

    productosCache = Array.isArray(productos) ? productos : [];

    const selectTercero = document.getElementById('ventaIdTercero');
    if (selectTercero) {
        if (!Array.isArray(terceros) || terceros.length === 0) {
            selectTercero.innerHTML = '<option value="">No hay terceros activos</option>';
        } else {
            selectTercero.innerHTML = '<option value="">Seleccione un tercero...</option>' +
                terceros.map(t => `<option value="${t.id_tercero}">#${t.id_tercero} - ${escaparHTML(t.nombre)}</option>`).join('');
        }
    }
}

function construirOpcionesProductos(idSeleccionado = '') {
    let opciones = '<option value="">Seleccione producto...</option>';
    let encontrado = false;

    for (const p of productosCache) {
        const selected = String(p.id_producto) === String(idSeleccionado) ? 'selected' : '';
        if (selected) encontrado = true;
        opciones += `<option value="${p.id_producto}" data-precio="${p.precioVenta}" ${selected}>#${p.id_producto} - ${escaparHTML(p.nombre)} (Stock: ${p.cantidad_stock})</option>`;
    }

    if (idSeleccionado && !encontrado) {
        opciones += `<option value="${idSeleccionado}" selected>Producto #${idSeleccionado}</option>`;
    }
    return opciones;
}

function agregarFilaDetalleVenta(item = null) {
    const container = document.getElementById('ventaDetallesContainer');
    if (!container) return;

    const idProducto = item?.id_producto ?? '';
    const cantidad = item?.cantidad ?? 1;
    const precio = item?.precioUnitario ?? '';

    const fila = document.createElement('div');
    fila.className = 'detalle-item-row row g-2 align-items-end';
    fila.innerHTML = `
        <div class="col-md-5">
            <label class="form-label small fw-semibold mb-1">Producto</label>
            <select class="form-select form-select-sm venta-item-producto" required>
                ${construirOpcionesProductos(idProducto)}
            </select>
        </div>
        <div class="col-md-3">
            <label class="form-label small fw-semibold mb-1">Cantidad</label>
            <input type="number" class="form-control form-control-sm venta-item-cantidad" min="1" required value="${cantidad}">
        </div>
        <div class="col-md-3">
            <label class="form-label small fw-semibold mb-1">Precio Unit. ($)</label>
            <input type="number" class="form-control form-control-sm venta-item-precio" step="0.01" min="0" required value="${precio}">
        </div>
        <div class="col-md-1 text-end">
            <button type="button" class="btn btn-outline-danger btn-sm btn-quitar-item-venta w-100" title="Quitar ítem">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
    `;
    container.appendChild(fila);
}

function recalcularTotalEstimadoVenta() {
    const container = document.getElementById('ventaDetallesContainer');
    const totalEl = document.getElementById('ventaTotalEstimado');
    if (!container || !totalEl) return;

    let subtotal = 0;
    container.querySelectorAll('.detalle-item-row').forEach(fila => {
        const cant = parseFloat(fila.querySelector('.venta-item-cantidad')?.value) || 0;
        const precio = parseFloat(fila.querySelector('.venta-item-precio')?.value) || 0;
        subtotal += cant * precio;
    });

    totalEl.textContent = formatearMoneda(subtotal);
}

/**
 * Abre el modal para registrar una nueva venta
 */
export async function abrirModalCrearVenta() {
    const form = document.getElementById('formVenta');
    if (!form) return;
    form.reset();

    document.getElementById('ventaId').value = '';
    document.getElementById('modalVentaTitulo').innerHTML = '<i class="fa-solid fa-plus-circle me-2"></i>Nueva Venta';
    document.getElementById('ventaDetallesContainer').innerHTML = '';

    try {
        await cargarCatalogosVenta();
        agregarFilaDetalleVenta();
        recalcularTotalEstimadoVenta();
        modalVentaInstancia?.show();
    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'Error al preparar formulario de venta',
            text: err.message
        });
    }
}

/**
 * Carga los datos completos de una venta y abre el modal para edición (PUT)
 */
export async function abrirModalEditarVenta(id) {
    try {
        const [venta] = await Promise.all([
            apiFetch(`${CONFIG.ENDPOINTS.VENTAS}/${id}`),
            cargarCatalogosVenta()
        ]);

        document.getElementById('ventaId').value = venta.id_venta;

        const selectTercero = document.getElementById('ventaIdTercero');
        if (selectTercero) {
            if (!selectTercero.querySelector(`option[value="${venta.id_tercero}"]`)) {
                const opt = document.createElement('option');
                opt.value = venta.id_tercero;
                opt.textContent = `Tercero #${venta.id_tercero}`;
                selectTercero.appendChild(opt);
            }
            selectTercero.value = venta.id_tercero;
        }

        document.getElementById('ventaIdUsuario').value = venta.id_usuario;

        const container = document.getElementById('ventaDetallesContainer');
        container.innerHTML = '';

        const detalles = Array.isArray(venta.detalles) && venta.detalles.length > 0 ? venta.detalles : [null];
        detalles.forEach(item => agregarFilaDetalleVenta(item));
        recalcularTotalEstimadoVenta();

        document.getElementById('modalVentaTitulo').innerHTML = `<i class="fa-solid fa-pen-to-square me-2"></i>Editar Venta #${venta.id_venta}`;
        modalVentaInstancia?.show();
    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'Error al consultar venta para edición',
            text: err.message
        });
    }
}

/**
 * Envía la transacción Maestro-Detalle para Crear (POST) o Actualizar (PUT)
 */
async function guardarVenta(evento) {
    evento.preventDefault();

    const id = document.getElementById('ventaId').value;
    const esEdicion = Boolean(id);

    const idTercero = parseInt(document.getElementById('ventaIdTercero').value, 10);
    const idUsuario = parseInt(document.getElementById('ventaIdUsuario').value, 10);

    const detalles = [];
    document.querySelectorAll('#ventaDetallesContainer .detalle-item-row').forEach(fila => {
        const idProducto = parseInt(fila.querySelector('.venta-item-producto')?.value, 10);
        const cantidad = parseInt(fila.querySelector('.venta-item-cantidad')?.value, 10);
        const precioUnitario = parseFloat(fila.querySelector('.venta-item-precio')?.value);
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

    const btnGuardar = document.getElementById('btnGuardarVenta');
    const textoOriginal = btnGuardar ? btnGuardar.innerHTML : '';
    if (btnGuardar) {
        btnGuardar.disabled = true;
        btnGuardar.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Procesando...';
    }

    try {
        const url = esEdicion ? `${CONFIG.ENDPOINTS.VENTAS}/${id}` : CONFIG.ENDPOINTS.VENTAS;
        const metodo = esEdicion ? 'PUT' : 'POST';

        const resultado = await apiFetch(url, {
            method: metodo,
            body: payload
        });

        modalVentaInstancia?.hide();

        Swal.fire({
            icon: 'success',
            title: esEdicion ? 'Venta Actualizada' : 'Venta Registrada',
            text: resultado.mensaje || 'Operación completada con éxito.',
            timer: 2000,
            showConfirmButton: false
        });

        listarVentas();
    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: esEdicion ? 'Error al actualizar venta (Rollback)' : 'Error al registrar venta (Rollback)',
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
 * Anula lógicamente una venta (PUT /api/ventas/:id/anular)
 */
export async function eliminarVenta(id) {
    const confirmacion = await Swal.fire({
        title: '¿Anular venta?',
        html: `¿Estás seguro de cambiar el estado de la venta <strong>#${id}</strong> a <strong>"Anulado"</strong>?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: '<i class="fa-solid fa-ban me-1"></i> Sí, anular',
        cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) return;

    try {
        const resultado = await apiFetch(`${CONFIG.ENDPOINTS.VENTAS}/${id}/anular`, {
            method: 'PUT'
        });

        Swal.fire({
            icon: 'success',
            title: 'Venta Anulada',
            text: resultado.mensaje || `La venta #${id} ha sido anulada correctamente.`,
            timer: 2000,
            showConfirmButton: false
        });

        listarVentas();
    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'No se pudo anular la venta',
            text: err.message
        });
    }
}

function manejarClickTablaVentas(evento) {
    const boton = evento.target.closest('button[data-accion]');
    if (!boton) return;

    const accion = boton.dataset.accion;
    const id = boton.dataset.id;

    if (accion === 'ver') {
        mostrarDetalleVenta(id);
    } else if (accion === 'editar') {
        abrirModalEditarVenta(id);
    } else if (accion === 'eliminar') {
        eliminarVenta(id);
    }
}

function actualizarContadorVentas(ventas) {
    if (!Array.isArray(ventas)) return;
    const totalEl = document.getElementById('statTotalVentas');
    if (totalEl) {
        totalEl.textContent = ventas.length;
    }
}

