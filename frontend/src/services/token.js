const CLAVE_TOKEN = 'caminos-rurales-token';

export function leerToken() {
  try {
    return localStorage.getItem(CLAVE_TOKEN);
  } catch {
    return null;
  }
}

export function guardarToken(token) {
  try {
    localStorage.setItem(CLAVE_TOKEN, token);
  } catch {
    // Sin almacenamiento disponible la sesión dura solo esta pestaña.
  }
}

export function borrarToken() {
  try {
    localStorage.removeItem(CLAVE_TOKEN);
  } catch {
    // Nada que borrar.
  }
}
