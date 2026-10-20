let tokenCache: { token: string; expira: number } | null = null;

export const limpiarTokenCache = () => {
  tokenCache = null;
};

async function obtenerToken(forzar = false) {
  if (!forzar && tokenCache && tokenCache.expira > Date.now()) return tokenCache.token;
  const respuesta = await fetch('/api/token', { cache: 'no-store' });
  if (!respuesta.ok) throw new Error('Sesión no válida.');
  const { token } = (await respuesta.json()) as { token: string };
  tokenCache = { token, expira: Date.now() + 10 * 60 * 1000 };
  return token;
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly detalles?: unknown
  ) {
    super(message);
  }
}

function baseUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
}

export async function api<T>(ruta: string, opciones: RequestInit = {}, reintentar = true): Promise<T> {
  const token = await obtenerToken();
  const esFormData = typeof FormData !== 'undefined' && opciones.body instanceof FormData;
  const respuesta = await fetch(`${baseUrl()}${ruta}`, {
    ...opciones,
    headers: {
      ...(esFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(opciones.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (respuesta.status === 401 && reintentar) {
    tokenCache = null;
    return api<T>(ruta, opciones, false);
  }

  const cuerpo = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    throw new ApiClientError(
      (cuerpo as { mensaje?: string }).mensaje ?? 'Ocurrió un error.',
      respuesta.status,
      (cuerpo as { detalles?: unknown }).detalles
    );
  }
  return cuerpo as T;
}

export const apiDatos = async <T>(ruta: string, opciones?: RequestInit) => {
  const respuesta = await api<{ datos: T }>(ruta, opciones);
  return respuesta.datos;
};

export const getPublico = async <T>(ruta: string): Promise<T> => {
  const respuesta = await fetch(`${baseUrl()}${ruta}`, { cache: 'no-store' });
  const cuerpo = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) throw new ApiClientError((cuerpo as { mensaje?: string }).mensaje ?? 'Error.', respuesta.status);
  return (cuerpo as { datos: T }).datos;
};
