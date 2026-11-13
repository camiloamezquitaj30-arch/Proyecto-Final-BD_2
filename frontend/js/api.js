/**
 * api.js - Servicio HTTP Reutilizable
 * Centraliza todas las peticiones fetch() y el manejo de errores del Backend y MySQL.
 */

import { CONFIG } from './config.js';

/**
 * Cliente HTTP genérico para peticiones a la API de Flask
 * @param {string} url - URL completa del endpoint
 * @param {object} opciones - Opciones de fetch (método, cuerpo, etc.)
 * @returns {Promise<any>} - Respuesta parseada en JSON
 */
export async function apiFetch(url, opciones = {}) {
    const metodo = (opciones.method || 'GET').toUpperCase();
    const headers = { ...(opciones.headers || {}) };

    // Solo enviamos Content-Type cuando hay un cuerpo (POST, PUT),
    // para evitar preflights OPTIONS innecesarios en peticiones GET simples.
    if (opciones.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    const config = {
        ...opciones,
        method: metodo,
        headers
    };

    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }

    try {
        const respuesta = await fetch(url, config);
        const esJson = respuesta.headers.get('content-type')?.includes('application/json');
        const datos = esJson ? await respuesta.json() : await respuesta.text();

        if (!respuesta.ok) {
            // Extraer mensaje descriptivo enviado por Flask o por el trigger de MySQL
            const mensajeError = 
                datos?.error_db || 
                datos?.error || 
                datos?.mensaje || 
                (typeof datos === 'string' ? datos : `Error en el servidor (Código HTTP: ${respuesta.status})`);

            const error = new Error(mensajeError);
            error.status = respuesta.status;
            error.detalles = datos;
            throw error;
        }

        return datos;
    } catch (err) {
        console.error(`Error en apiFetch [${metodo} ${url}]:`, err);
        // Error de red / CORS / Backend apagado
        if (err.name === 'TypeError' && err.message.toLowerCase().includes('fetch')) {
            throw new Error(`No se pudo conectar con el endpoint ${url}. Verifica el estado de CORS o Docker.`);
        }
        throw err;
    }
}

/**
 * Verifica la disponibilidad del Backend haciendo un ping a la ruta raíz
 * @returns {Promise<boolean>}
 */
export async function verificarSaludBackend() {
    try {
        const respuesta = await fetch(CONFIG.ENDPOINTS.HEALTH, { method: 'GET' });
        return respuesta.ok;
    } catch {
        return false;
    }
}

