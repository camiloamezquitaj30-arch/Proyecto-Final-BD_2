/**
 * terceros.js - Controlador del Módulo de Terceros
 * Gestiona el CRUD completo contra los endpoints de /api/terceros/
 */

import { CONFIG, escaparHTML } from './config.js';
import { apiFetch } from './api.js';

let modalTerceroInstancia = null;

/**
 * Inicializa el módulo de terceros y registra eventos del DOM
 */
export function inicializarTerceros() {
    const modalElement = document.getElementById('modalTercero');
    if (modalElement && window.bootstrap) {
        modalTerceroInstancia = new bootstrap.Modal(modalElement);
    }

    // Formulario de creación/edición
    const form = document.getElementById('formTercero');
    if (form) {
        form.addEventListener('submit', guardarTercero);
    }

    // Botón refrescar
    const btnRefrescar = document.getElementById('btnRefrescarTerceros');
    if (btnRefrescar) {
        btnRefrescar.addEventListener('click', () => listarTerceros());
    }

    // Botón nuevo tercero
    const btnNuevo = document.getElementById('btnNuevoTercero');
    if (btnNuevo) {
        btnNuevo.addEventListener('click', abrirModalCrear);
    }

    // Formulario de búsqueda por ID
    const formBuscar = document.getElementById('formBuscarTercero');
    if (formBuscar) {
        formBuscar.addEventListener('submit', (e) => {
            e.preventDefault();
            const idInput = document.getElementById('inputBuscarTerceroId');
            const id = idInput?.value?.trim();
            if (id) {
                buscarTerceroPorId(id);
            } else {
                listarTerceros();
            }
        });
    }

    // Botón limpiar búsqueda
    const btnLimpiar = document.getElementById('btnLimpiarBuscarTercero');
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', () => {
            const idInput = document.getElementById('inputBuscarTerceroId');
            if (idInput) idInput.value = '';
            listarTerceros();
        });
    }

    // Delegación de eventos para la tabla (Editar, Eliminar)
    const tabla = document.getElementById('tablaTercerosBody');
    if (tabla) {
        tabla.addEventListener('click', manejarClickTabla);
    }

    // Carga inicial
    listarTerceros();
}

/**
 * Consulta y lista todos los terceros activos (GET /api/terceros/)
 */
export async function listarTerceros() {
    const tbody = document.getElementById('tablaTercerosBody');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Cargando...</span>
                </div>
                <p class="mt-2 text-muted mb-0">Consultando terceros en la base de datos...</p>
            </td>
        </tr>
    `;

    try {
        const terceros = await apiFetch(CONFIG.ENDPOINTS.TERCEROS);
        actualizarContadoresTerceros(terceros);

        if (!Array.isArray(terceros) || terceros.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4 text-muted">
                        <i class="fa-solid fa-users-slash fa-2x mb-2 text-secondary"></i>
                        <p class="mb-0">No hay terceros registrados o activos en la base de datos.</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = terceros.map(ter => `
            <tr>
                <td class="fw-bold text-center">#${ter.id_tercero}</td>
                <td>
                    <span class="fw-semibold">${escaparHTML(ter.nombre)}</span>
                </td>
                <td>
                    <i class="fa-regular fa-envelope me-1 text-secondary"></i>
                    <span>${escaparHTML(ter.correo || 'Sin correo')}</span>
                </td>
                <td>
                    <i class="fa-solid fa-phone me-1 text-secondary"></i>
                    <span>${escaparHTML(ter.contacto)}</span>
                </td>
                <td class="text-center">
                    <span class="badge ${ter.estado === 1 ? 'bg-success' : 'bg-secondary'}">
                        ${ter.estado === 1 ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td class="text-end">
                    <div class="btn-group btn-group-sm" role="group">
                        <button class="btn btn-outline-primary" data-accion="editar" data-id="${ter.id_tercero}" title="Editar Tercero">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button class="btn btn-outline-danger" data-accion="eliminar" data-id="${ter.id_tercero}" data-nombre="${escaparHTML(ter.nombre)}" title="Inactivar Tercero">
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
            title: 'Error al listar terceros',
            text: err.message
        });
    }
}

/**
 * Consulta un tercero por su ID (GET /api/terceros/:id)
 */
export async function buscarTerceroPorId(id) {
    const tbody = document.getElementById('tablaTercerosBody');
    if (!tbody) return;

    try {
        const ter = await apiFetch(`${CONFIG.ENDPOINTS.TERCEROS}/${id}`);

        tbody.innerHTML = `
            <tr class="table-info">
                <td class="fw-bold text-center">#${ter.id_tercero}</td>
                <td>
                    <span class="fw-semibold">${escaparHTML(ter.nombre)}</span>
                    <span class="badge bg-info text-dark ms-2">Búsqueda directa</span>
                </td>
                <td>
                    <i class="fa-regular fa-envelope me-1 text-secondary"></i>
                    <span>${escaparHTML(ter.correo || 'Sin correo')}</span>
                </td>
                <td>
                    <i class="fa-solid fa-phone me-1 text-secondary"></i>
                    <span>${escaparHTML(ter.contacto)}</span>
                </td>
                <td class="text-center">
                    <span class="badge ${ter.estado === 1 ? 'bg-success' : 'bg-secondary'}">
                        ${ter.estado === 1 ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td class="text-end">
                    <div class="btn-group btn-group-sm" role="group">
                        <button class="btn btn-outline-primary" data-accion="editar" data-id="${ter.id_tercero}">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button class="btn btn-outline-danger" data-accion="eliminar" data-id="${ter.id_tercero}" data-nombre="${escaparHTML(ter.nombre)}">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;

        Swal.fire({
            icon: 'success',
            title: 'Tercero encontrado',
            text: `Se visualiza a: ${ter.nombre}`,
            timer: 1800,
            showConfirmButton: false
        });

    } catch (err) {
        Swal.fire({
            icon: 'warning',
            title: 'No encontrado',
            text: err.message
        });
        listarTerceros();
    }
}

/**
 * Abre el modal para registrar un nuevo tercero
 */
export function abrirModalCrear() {
    const form = document.getElementById('formTercero');
    if (!form) return;
    form.reset();

    document.getElementById('terceroId').value = '';
    document.getElementById('modalTerceroTitulo').innerHTML = '<i class="fa-solid fa-user-plus me-2"></i>Nuevo Tercero';

    modalTerceroInstancia?.show();
}

/**
 * Consulta un tercero por ID y llena el modal para editar (PUT)
 */
export async function abrirModalEditar(id) {
    try {
        const ter = await apiFetch(`${CONFIG.ENDPOINTS.TERCEROS}/${id}`);

        document.getElementById('terceroId').value = ter.id_tercero;
        document.getElementById('terceroNombre').value = ter.nombre;
        document.getElementById('terceroCorreo').value = ter.correo || '';
        document.getElementById('terceroContacto').value = ter.contacto;

        document.getElementById('modalTerceroTitulo').innerHTML = `<i class="fa-solid fa-user-pen me-2"></i>Editar Tercero #${ter.id_tercero}`;

        modalTerceroInstancia?.show();
    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'Error al consultar tercero para edición',
            text: err.message
        });
    }
}

/**
 * Envía el formulario para Crear (POST) o Actualizar (PUT)
 */
async function guardarTercero(evento) {
    evento.preventDefault();

    const id = document.getElementById('terceroId').value;
    const esEdicion = Boolean(id);

    const payload = {
        nombre: document.getElementById('terceroNombre').value.trim(),
        correo: document.getElementById('terceroCorreo').value.trim(),
        contacto: document.getElementById('terceroContacto').value.trim()
    };

    if (!payload.nombre || !payload.correo || !payload.contacto) {
        Swal.fire({ icon: 'warning', title: 'Campos requeridos', text: 'Todos los campos (nombre, correo y contacto) son obligatorios.' });
        return;
    }

    const btnGuardar = document.getElementById('btnGuardarTercero');
    const textoOriginal = btnGuardar ? btnGuardar.innerHTML : '';
    if (btnGuardar) {
        btnGuardar.disabled = true;
        btnGuardar.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Guardando...';
    }

    try {
        const url = esEdicion ? `${CONFIG.ENDPOINTS.TERCEROS}/${id}` : CONFIG.ENDPOINTS.TERCEROS;
        const metodo = esEdicion ? 'PUT' : 'POST';

        const resultado = await apiFetch(url, {
            method: metodo,
            body: payload
        });

        modalTerceroInstancia?.hide();

        Swal.fire({
            icon: 'success',
            title: esEdicion ? 'Tercero Actualizado' : 'Tercero Creado',
            text: resultado.mensaje || 'Operación completada con éxito en MySQL.',
            timer: 2000,
            showConfirmButton: false
        });

        listarTerceros();
    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: esEdicion ? 'Error al actualizar tercero' : 'Error al registrar tercero',
            html: `
                <div class="text-start">
                   
                    <p class="text-muted small mb-0">Verifica que el correo o teléfono de contacto no estén repetidos en la base de datos.</p>
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
 * Inactiva un tercero (DELETE /api/terceros/:id)
 */
export async function eliminarTercero(id, nombre) {
    const confirmacion = await Swal.fire({
        title: '¿Inactivar tercero?',
        html: `¿Estás seguro de que deseas marcar como inactivo al tercero <strong>"${escaparHTML(nombre)}"</strong> (ID #${id})?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: '<i class="fa-solid fa-trash me-1"></i> Sí, inactivar',
        cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) return;

    try {
        const resultado = await apiFetch(`${CONFIG.ENDPOINTS.TERCEROS}/${id}`, {
            method: 'DELETE'
        });

        Swal.fire({
            icon: 'success',
            title: 'Tercero Inactivado',
            text: resultado.mensaje || `El tercero #${id} ha sido inactivado correctamente.`,
            timer: 2000,
            showConfirmButton: false
        });

        listarTerceros();
    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'Error al inactivar tercero',
            text: err.message
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

    if (accion === 'editar') {
        abrirModalEditar(id);
    } else if (accion === 'eliminar') {
        const nombre = boton.dataset.nombre;
        eliminarTercero(id, nombre);
    }
}

/**
 * Actualiza el contador estadístico de terceros
 */
function actualizarContadoresTerceros(terceros) {
    if (!Array.isArray(terceros)) return;
    const totalTercerosEl = document.getElementById('statTotalTerceros');
    if (totalTercerosEl) {
        totalTercerosEl.textContent = terceros.length;
    }
}

