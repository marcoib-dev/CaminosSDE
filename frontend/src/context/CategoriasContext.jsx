import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { CATEGORIAS_POI, ORDEN_CATEGORIAS_POI } from '../constants/dominio.js';
import { obtenerCategoriasPuntos } from '../services/api.js';

const CATEGORIAS_BASE = ORDEN_CATEGORIAS_POI.map((clave) => ({
  id: clave,
  clave,
  etiqueta: CATEGORIAS_POI[clave].etiqueta,
  color: CATEGORIAS_POI[clave].color,
  inicial: CATEGORIAS_POI[clave].inicial,
  peso: null,
  protegida: true,
  totalPuntos: 0,
}));

function normalizarCategoria(categoria) {
  return {
    id: categoria.id ?? categoria.clave,
    clave: categoria.clave,
    etiqueta: categoria.nombre ?? categoria.etiqueta ?? categoria.clave,
    color: categoria.color ?? '#0e7490',
    inicial: categoria.inicial ?? '?',
    peso: categoria.peso ?? null,
    protegida: Boolean(categoria.protegida),
    totalPuntos: categoria.totalPuntos ?? 0,
  };
}

const CategoriasContext = createContext(null);

export function CategoriasProvider({ children }) {
  const [categorias, setCategorias] = useState(CATEGORIAS_BASE);
  const [cargando, setCargando] = useState(true);

  const recargar = useCallback(async () => {
    try {
      const datos = await obtenerCategoriasPuntos();
      const normalizadas = datos.map(normalizarCategoria);
      setCategorias(normalizadas.length > 0 ? normalizadas : CATEGORIAS_BASE);
    } catch {
      // Si la API no responde, se mantienen las categorías base para no romper el mapa.
      setCategorias(CATEGORIAS_BASE);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  const porClave = useMemo(
    () => Object.fromEntries(categorias.map((categoria) => [categoria.clave, categoria])),
    [categorias]
  );

  const valor = useMemo(
    () => ({ categorias, porClave, recargar, cargando }),
    [categorias, porClave, recargar, cargando]
  );

  return <CategoriasContext.Provider value={valor}>{children}</CategoriasContext.Provider>;
}

export function useCategorias() {
  const contexto = useContext(CategoriasContext);

  if (!contexto) {
    throw new Error('useCategorias debe usarse dentro de CategoriasProvider.');
  }

  return contexto;
}
