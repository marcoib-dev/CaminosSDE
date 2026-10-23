/**
 * Parámetros de seguridad compartidos por autenticación, usuarios y seed.
 * Cambiar las rondas de bcrypt afecta solo a los hashes nuevos: los hashes
 * existentes conservan el costo con el que fueron generados.
 */
export const RONDAS_BCRYPT = 12;

/**
 * Hash de referencia (12 rondas) para comparar cuando el email no existe.
 * Evita que el tiempo de respuesta permita enumerar usuarios.
 * No corresponde a ninguna contraseña real del sistema.
 */
export const HASH_DUMMY =
  '$2b$12$VXPuGpW.k11TSXZgHsc1z.HJLAc6wgS5SQoI0jrrVV3MvzF1KjSUO';

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;

/** Contraseñas frecuentes, normalizadas (sin acentos y en minúsculas). */
const PASSWORDS_COMUNES = new Set([
  '12345678',
  '123456789',
  '1234567890',
  'password',
  'password1',
  'password123',
  'contrasena',
  'contrasena123',
  'qwerty123',
  'qwertyuiop',
  'abc12345',
  'iloveyou',
  'admin123',
  'admin1234',
  'administrador',
  'adminadmin',
  'caminos123',
  'caminos2026',
  'santiagodelestero',
  'santiago123',
  'argentina',
  'argentina123',
  'bienvenido',
  'bienvenida',
  'holamundo',
  'letmein',
  'welcome1',
  'welcome123',
  'monkey123',
  'dragon123',
  'futbol123',
  'riverplate',
  'boca12345',
  'seleccion',
  'gobierno',
  'municipio',
  'hospital123',
  'escuela123',
  'changeme',
  'default1',
  'usuario123',
  'prueba123',
  'test1234',
  'temporal1',
  'verano2026',
  'invierno2026',
]);

const normalizar = (valor) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/**
 * Devuelve un mensaje de error si la contraseña no cumple la política,
 * o `null` si es aceptable.
 */
export function mensajePasswordDebil(password, { email } = {}) {
  const normalizada = normalizar(password);

  if (PASSWORDS_COMUNES.has(normalizada)) {
    return 'La contraseña es demasiado común. Elegí otra.';
  }

  if (normalizada.length > 0 && /^(.)\1+$/.test(normalizada)) {
    return 'La contraseña no puede repetir el mismo carácter.';
  }

  const emailNormalizado = normalizar(email);
  if (emailNormalizado) {
    const parteLocal = emailNormalizado.split('@')[0];
    if (normalizada === emailNormalizado || normalizada === parteLocal) {
      return 'La contraseña no puede ser igual a tu email.';
    }
  }

  return null;
}
