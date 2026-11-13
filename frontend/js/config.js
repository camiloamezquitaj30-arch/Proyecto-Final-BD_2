/**
 * config.js - Configuración centralizada del Frontend
 * Permite cambiar la URL base del Backend en un solo lugar.
 */

export const CONFIG = {
    API_BASE_URL: 'http://localhost:5001/api',
    ENDPOINTS: {
        PRODUCTOS: 'http://localhost:5001/api/productos',
        TERCEROS: 'http://localhost:5001/api/terceros',
        VENTAS: 'http://localhost:5001/api/ventas',
        PEDIDOS: 'http://localhost:5001/api/pedidos',
        HEALTH: 'http://localhost:5001/'
    }
};

/**
 * Formateador de moneda en Pesos Colombianos (COP)
 */
export const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(valor || 0);
};

/**
 * Escapa caracteres HTML para prevenir vulnerabilidades XSS
 */
export const escaparHTML = (cadena) => {
    if (cadena === null || cadena === undefined) return '';
    return String(cadena)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

/**
 * Formatea una fecha proveniente de Flask/MySQL a formato legible local
 */
export const formatearFecha = (fechaStr) => {
    if (!fechaStr) return 'Sin fecha';
    const fecha = new Date(fechaStr);
    if (Number.isNaN(fecha.getTime())) return String(fechaStr);
    return fecha.toLocaleString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
};

/**
 * Retorna la clase Bootstrap de insignia según el estado de la venta o pedido
 */
export const obtenerBadgeEstado = (estado) => {
    const mapa = {
        'Pendiente': 'bg-warning-subtle text-warning-emphasis border border-warning-subtle',
        'Pagado': 'bg-success-subtle text-success border border-success-subtle',
        'Enviado': 'bg-info-subtle text-info-emphasis border border-info-subtle',
        'Por Pagar': 'bg-primary-subtle text-primary border border-primary-subtle',
        'Anulado': 'bg-danger-subtle text-danger border border-danger-subtle'
    };
    const clase = mapa[estado] || 'bg-secondary-subtle text-secondary';
    return `<span class="badge ${clase}">${escaparHTML(estado || 'N/A')}</span>`;
};

