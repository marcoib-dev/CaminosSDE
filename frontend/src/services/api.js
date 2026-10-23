import { leerToken } from './token.js';

const URL_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/+$/, '');

// --- Caché simple en memoria con TTL ---
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
const cache = new Map();

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function cacheSet(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

function cacheInvalidate(pattern) {
  for (const key of cache.keys()) {
    if (key.startsWith(pattern)) cache.delete(key);
  }
}

export class ErrorApi extends Error {
  constructor(mensaje, estado, detalles = []) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.estado = estado;
    this.detalles = detalles;
  }
}

function construirUrl(ruta, parametros = {}) {
  // VITE_API_URL puede ser absoluta (http://localhost:3000/api) o relativa
  // (/api, mismo origen). El segundo argumento resuelve las relativas.
  const url = new URL(`${URL_BASE}${ruta}`, window.location.origin);

  Object.entries(parametros).forEach(([clave, valor]) => {
    if (valor === undefined || valor === null || valor === '') return;
    url.searchParams.set(clave, valor);
  });

  return url.toString();
}

async function solicitar(ruta, { metodo = 'GET', cuerpo, formulario, parametros } = {}) {
  const token = leerToken();
  const encabezados = {};

  if (cuerpo) encabezados['Content-Type'] = 'application/json';
  if (token) encabezados.Authorization = `Bearer ${token}`;

  let respuesta;

  try {
    respuesta = await fetch(construirUrl(ruta, parametros), {
      method: metodo,
      headers: Object.keys(encabezados).length > 0 ? encabezados : undefined,
      body: formulario ?? (cuerpo ? JSON.stringify(cuerpo) : undefined),
    });
  } catch {
    throw new ErrorApi(
      'No se pudo conectar con el servidor. Verificá que la API esté disponible.',
      0
    );
  }

  const texto = await respuesta.text();
  let datos = null;

  if (texto) {
    try {
      datos = JSON.parse(texto);
    } catch {
      datos = null;
    }
  }

  if (respuesta.status === 401 && token) {
    window.dispatchEvent(new Event('caminos:sesion-expirada'));
  }

  if (!respuesta.ok) {
    throw new ErrorApi(
      datos?.mensaje || 'No se pudo completar la solicitud.',
      respuesta.status,
      datos?.detalles
    );
  }

  return datos;
}

/* ---------- Consultas públicas ---------- */

export async function obtenerCaminos() {
  const key = 'caminos';
  const cached = cacheGet(key);
  if (cached) return cached;
  // Endpoint liviano: solo caminos activos, sin timestamps. Se usa para el mapa.
  const respuesta = await solicitar('/caminos/mapa');
  const data = respuesta?.datos ?? [];
  cacheSet(key, data);
  return data;
}

export async function obtenerPuntosInteres() {
  const key = 'puntos-interes';
  const cached = cacheGet(key);
  if (cached) return cached;

  const LIMITE = 500;
  const MAX_PAGINAS = 100;
  const data = [];
  let pagina = 1;
  let totalPaginas = 1;

  do {
    const respuesta = await solicitar('/puntos-interes', {
      parametros: { pagina, limite: LIMITE },
    });
    data.push(...(respuesta?.datos ?? []));
    totalPaginas = respuesta?.paginacion?.totalPaginas ?? 1;
    pagina += 1;
  } while (pagina <= totalPaginas && pagina <= MAX_PAGINAS);

  cacheSet(key, data);
  return data;
}

export async function obtenerCategoriasPuntos() {
  const key = 'categorias-puntos';
  const cached = cacheGet(key);
  if (cached) return cached;
  const respuesta = await solicitar('/categorias-puntos');
  const data = respuesta?.datos ?? [];
  cacheSet(key, data);
  return data;
}

export async function obtenerTramosPrioridad() {
  const key = 'tramos-prioridad';
  const cached = cacheGet(key);
  if (cached) return cached;
  const respuesta = await solicitar('/tramos/prioridad');
  const data = respuesta?.datos ?? [];
  cacheSet(key, data);
  return data;
}

export async function crearSugerencia(datos) {
  return solicitar('/sugerencias', { metodo: 'POST', cuerpo: datos });
}

/* ---------- Autenticación ---------- */

export async function iniciarSesion(datos) {
  const respuesta = await solicitar('/auth/login', { metodo: 'POST', cuerpo: datos });
  return respuesta?.datos;
}

export async function obtenerUsuarioActual() {
  const respuesta = await solicitar('/auth/me');
  return respuesta?.datos;
}

export async function cambiarPassword(datos) {
  return solicitar('/auth/change-password', { metodo: 'POST', cuerpo: datos });
}

/* ---------- Caminos ---------- */

export async function crearCamino(datos) {
  const resp = await solicitar('/caminos', { metodo: 'POST', cuerpo: datos });
  cacheInvalidate('caminos');
  cacheInvalidate('tramos-prioridad');
  return resp;
}

export async function actualizarCamino(id, datos) {
  const resp = await solicitar(`/caminos/${encodeURIComponent(id)}`, { metodo: 'PATCH', cuerpo: datos });
  cacheInvalidate('caminos');
  cacheInvalidate('tramos-prioridad');
  return resp;
}

export async function eliminarCamino(id) {
  const resp = await solicitar(`/caminos/${encodeURIComponent(id)}`, { metodo: 'DELETE' });
  cacheInvalidate('caminos');
  cacheInvalidate('tramos-prioridad');
  return resp;
}

/* ---------- Importación de relevamientos ---------- */

export async function previsualizarImportacion(archivo, mapeo) {
  const formulario = new FormData();
  formulario.append('archivo', archivo);
  if (mapeo) formulario.append('mapeo', JSON.stringify(mapeo));

  const respuesta = await solicitar('/caminos/importar', {
    metodo: 'POST',
    formulario,
  });

  return respuesta?.datos;
}

export async function confirmarImportacion(datos) {
  const resp = await solicitar('/caminos/importar/confirmar', { metodo: 'POST', cuerpo: datos });
  cacheInvalidate('caminos');
  cacheInvalidate('tramos-prioridad');
  return resp;
}

/* ---------- Tramos ---------- */
export async function crearTramo(datos) {
  const resp = await solicitar('/tramos', { metodo: 'POST', cuerpo: datos });
  cacheInvalidate('caminos');
  cacheInvalidate('tramos-prioridad');
  return resp;
}

export async function actualizarTramo(id, datos) {
  const resp = await solicitar(`/tramos/${encodeURIComponent(id)}`, { metodo: 'PATCH', cuerpo: datos });
  cacheInvalidate('caminos');
  cacheInvalidate('tramos-prioridad');
  return resp;
}

export async function dividirTramo(id, datos) {
  const resp = await solicitar(`/tramos/${encodeURIComponent(id)}/dividir`, {
    metodo: 'PATCH',
    cuerpo: datos,
  });
  cacheInvalidate('caminos');
  cacheInvalidate('tramos-prioridad');
  return resp;
}

export async function eliminarTramo(id) {
  const resp = await solicitar(`/tramos/${encodeURIComponent(id)}`, { metodo: 'DELETE' });
  cacheInvalidate('caminos');
  cacheInvalidate('tramos-prioridad');
  return resp;
}

export async function obtenerHistorialTramo(id) {
  const respuesta = await solicitar(`/tramos/${encodeURIComponent(id)}/historial`);
  return respuesta?.datos ?? [];
}

/* ---------- Puntos de interés ---------- */

export async function crearPuntoInteres(datos) {
  const resp = await solicitar('/puntos-interes', { metodo: 'POST', cuerpo: datos });
  cacheInvalidate('puntos-interes');
  cacheInvalidate('tramos-prioridad');
  return resp;
}

export async function actualizarPuntoInteres(id, datos) {
  const resp = await solicitar(`/puntos-interes/${encodeURIComponent(id)}`, {
    metodo: 'PATCH',
    cuerpo: datos,
  });
  cacheInvalidate('puntos-interes');
  cacheInvalidate('tramos-prioridad');
  return resp;
}

export async function eliminarPuntoInteres(id) {
  const resp = await solicitar(`/puntos-interes/${encodeURIComponent(id)}`, { metodo: 'DELETE' });
  cacheInvalidate('puntos-interes');
  cacheInvalidate('tramos-prioridad');
  return resp;
}

export async function crearCategoriaPunto(datos) {
  const resp = await solicitar('/categorias-puntos', { metodo: 'POST', cuerpo: datos });
  cacheInvalidate('categorias-puntos');
  cacheInvalidate('tramos-prioridad');
  return resp;
}

export async function eliminarCategoriaPunto(id) {
  const resp = await solicitar(`/categorias-puntos/${encodeURIComponent(id)}`, { metodo: 'DELETE' });
  cacheInvalidate('categorias-puntos');
  cacheInvalidate('tramos-prioridad');
  return resp;
}

/* ---------- Fotos ---------- */

export async function firmarSubidaFoto() {
  const respuesta = await solicitar('/fotos/firma', { metodo: 'POST' });
  return respuesta?.datos;
}

export async function registrarFoto(datos) {
  return solicitar('/fotos', { metodo: 'POST', cuerpo: datos });
}

export async function eliminarFoto(id) {
  return solicitar(`/fotos/${encodeURIComponent(id)}`, { metodo: 'DELETE' });
}

/**
 * Sube el archivo directamente a Cloudinary con la firma del backend
 * y luego registra en la API únicamente la URL resultante.
 */
export async function subirFoto({ archivo, caminoId, tramoId, descripcion }) {
  const firma = await firmarSubidaFoto();

  const formulario = new FormData();
  formulario.append('file', archivo);
  formulario.append('api_key', firma.apiKey);
  formulario.append('timestamp', String(firma.timestamp));
  formulario.append('folder', firma.folder);
  formulario.append('signature', firma.firma);

  let respuesta;
  try {
    respuesta = await fetch(firma.urlSubida, { method: 'POST', body: formulario });
  } catch {
    throw new ErrorApi('No se pudo conectar con Cloudinary. Revisá tu conexión.', 0);
  }

  const resultado = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    throw new ErrorApi(
      resultado?.error?.message || 'Cloudinary rechazó la subida de la foto.',
      respuesta.status
    );
  }

  const registro = await registrarFoto({
    url: resultado.secure_url,
    descripcion: descripcion?.trim() ? descripcion.trim() : null,
    caminoId,
    ...(tramoId ? { tramoId } : {}),
  });

  return registro?.datos;
}

/* ---------- Sugerencias ---------- */

export async function obtenerSugerencias(parametros) {
  const respuesta = await solicitar('/sugerencias', { parametros });
  return respuesta?.datos ?? [];
}

export async function actualizarSugerencia(id, datos) {
  return solicitar(`/sugerencias/${encodeURIComponent(id)}`, { metodo: 'PATCH', cuerpo: datos });
}

/* ---------- Usuarios (solo ADMIN) ---------- */

export async function obtenerUsuarios() {
  const respuesta = await solicitar('/usuarios');
  return respuesta?.datos ?? [];
}

export async function crearUsuario(datos) {
  return solicitar('/usuarios', { metodo: 'POST', cuerpo: datos });
}

export async function cambiarEstadoUsuario(id, activo) {
  return solicitar(`/usuarios/${encodeURIComponent(id)}/estado`, {
    metodo: 'PATCH',
    cuerpo: { activo },
  });
}

/* ---------- Auditoría (solo ADMIN) ---------- */

export async function obtenerAuditoria(parametros) {
  const respuesta = await solicitar('/auditoria', { parametros });
  return { datos: respuesta?.datos ?? [], total: respuesta?.total ?? 0 };
}
