/**
 * app.js - Punto de Entrada de la Aplicación Frontend
 * Orquesta la navegación, el estado de conexión del Backend y el arranque de módulos.
 */

import { verificarSaludBackend } from './api.js';
import { inicializarProductos, listarProductos } from './productos.js';
import { inicializarTerceros, listarTerceros } from './terceros.js';
import { inicializarVentas, listarVentas } from './ventas.js';
import { inicializarPedidos, listarPedidos } from './pedidos.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Diagnóstico de conexión inicial con Flask
    comprobarEstadoBackend();

    // 2. Inicializar cada módulo de forma aislada para detectar fallos de inmediato
    const modulos = [
        ['Productos', inicializarProductos],
        ['Terceros', inicializarTerceros],
        ['Ventas', inicializarVentas],
        ['Pedidos', inicializarPedidos]
    ];

    for (const [nombre, inicializar] of modulos) {
        try {
            inicializar();
        } catch (err) {
            console.error(`Error al inicializar el módulo [${nombre}]:`, err);
        }
    }

    // 3. Listener para cambio de pestañas de Bootstrap (recargar datos al entrar a cada sección)
    configurarNavegacionPestanas();

    // 4. Botón de verificación manual de salud
    const badgeConexion = document.getElementById('badgeConexionBackend');
    if (badgeConexion) {
        badgeConexion.addEventListener('click', () => {
            comprobarEstadoBackend(true);
        });
    }
});

/**
 * Consulta si el backend responde en http://localhost:5001/
 * @param {boolean} mostrarAlerta - Si se debe notificar al usuario con SweetAlert
 */
async function comprobarEstadoBackend(mostrarAlerta = false) {
    const badge = document.getElementById('badgeConexionBackend');
    if (!badge) return;

    badge.className = 'badge bg-secondary-subtle text-secondary border px-3 py-2 cursor-pointer';
    badge.innerHTML = '<span class="spinner-grow spinner-grow-sm me-2 text-primary" role="status"></span>Comprobando API...';

    const online = await verificarSaludBackend();

    if (online) {
        badge.className = 'badge bg-success-subtle text-success border border-success-subtle px-3 py-2 cursor-pointer';
        badge.innerHTML = '<i class="fa-solid fa-circle-check text-success me-1"></i> Backend Conectado (5001)';
        badge.title = 'El contenedor Flask y MySQL están listos y respondiendo. Clic para re-verificar.';

        if (mostrarAlerta) {
            Swal.fire({
                icon: 'success',
                title: 'Conexión Exitosa',
                text: 'La API de Flask en http://localhost:5001 está en línea.',
                timer: 1800,
                showConfirmButton: false
            });
        }
    } else {
        badge.className = 'badge bg-danger-subtle text-danger border border-danger-subtle px-3 py-2 cursor-pointer';
        badge.innerHTML = '<i class="fa-solid fa-circle-xmark text-danger me-1"></i> Backend Desconectado';
        badge.title = 'No hay respuesta en el puerto 5001. Verifica tus contenedores Docker. Clic para reintentar.';

        if (mostrarAlerta) {
            Swal.fire({
                icon: 'error',
                title: 'Backend No Disponible',
                html: `
                    <p class="text-start mb-2">No se pudo establecer conexión con <code>http://localhost:5001</code>.</p>
                    <ul class="text-start text-muted small">
                        <li>Asegúrate de haber ejecutado <code>docker compose up -d</code>.</li>
                        <li>Verifica que el contenedor <code>backend_flask</code> esté corriendo.</li>
                    </ul>
                `
            });
        }
    }
}

/**
 * Registra eventos cuando el usuario cambia entre las pestañas de los módulos
 */
function configurarNavegacionPestanas() {
    const recargadores = {
        '#tab-productos': listarProductos,
        '#tab-terceros': listarTerceros,
        '#tab-ventas': listarVentas,
        '#tab-pedidos': listarPedidos
    };

    const tabs = document.querySelectorAll('button[data-bs-toggle="tab"]');
    tabs.forEach(tab => {
        tab.addEventListener('shown.bs.tab', (evento) => {
            const targetId = evento.target.getAttribute('data-bs-target');
            const recargar = recargadores[targetId];
            if (recargar) {
                recargar();
            }
        });
    });
}

