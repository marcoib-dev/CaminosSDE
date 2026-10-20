import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { obtenerUsuarioActual, iniciarSesion as iniciarSesionApi } from '../services/api.js';
import { borrarToken, guardarToken, leerToken } from '../services/token.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(() => Boolean(leerToken()));

  const cerrarSesion = useCallback(() => {
    borrarToken();
    setUsuario(null);
  }, []);

  useEffect(() => {
    let activo = true;

    async function recuperarSesion() {
      if (!leerToken()) {
        setCargando(false);
        return;
      }

      try {
        const datos = await obtenerUsuarioActual();
        if (activo) setUsuario(datos);
      } catch {
        if (activo) {
          borrarToken();
          setUsuario(null);
        }
      } finally {
        if (activo) setCargando(false);
      }
    }

    recuperarSesion();

    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    const alExpirar = () => setUsuario(null);
    window.addEventListener('caminos:sesion-expirada', alExpirar);
    return () => window.removeEventListener('caminos:sesion-expirada', alExpirar);
  }, []);

  const iniciar = useCallback(async (email, password) => {
    const datos = await iniciarSesionApi({ email, password });

    guardarToken(datos.token);
    setUsuario(datos.usuario);

    return datos.usuario;
  }, []);

  const valor = useMemo(
    () => ({
      usuario,
      cargando,
      iniciar,
      cerrarSesion,
      esEditor: usuario?.rol === 'EDITOR' || usuario?.rol === 'ADMIN',
      esAdmin: usuario?.rol === 'ADMIN',
    }),
    [usuario, cargando, iniciar, cerrarSesion]
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error('useAuth debe usarse dentro de AuthProvider.');
  }
  return contexto;
}
