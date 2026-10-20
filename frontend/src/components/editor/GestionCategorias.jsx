import { useState } from 'react';
import Modal from '../Modal.jsx';
import { useCategorias } from '../../context/CategoriasContext.jsx';
import { crearCategoriaPunto, eliminarCategoriaPunto } from '../../services/api.js';

const COLOR_NUEVO = '#0e7490';
const PESO_NUEVO = 10;

function IconoCandado() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" strokeLinecap="round" />
    </svg>
  );
}

function IconoBasura() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function GestionCategorias({ onCerrar, onMensaje }) {
  const { categorias, recargar } = useCategorias();

  const [nueva, setNueva] = useState({ nombre: '', color: COLOR_NUEVO, peso: PESO_NUEVO });
  const [creando, setCreando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState(null);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cambiar = (campo, valor) => {
    setNueva((actual) => ({ ...actual, [campo]: valor }));
  };

  const crear = async (evento) => {
    evento.preventDefault();
    setError('');
    setMensaje('');

    const nombre = nueva.nombre.trim();

    if (!nombre) {
      setError('Escribí un nombre para la categoría.');
      return;
    }

    const peso = Number(nueva.peso);

    if (!Number.isFinite(peso) || peso < 0 || peso > 30) {
      setError('El aporte de prioridad debe ser un número entre 0 y 30.');
      return;
    }

    setCreando(true);

    try {
      const respuesta = await crearCategoriaPunto({
        nombre,
        color: nueva.color,
        peso,
      });

      await recargar();
      setNueva({ nombre: '', color: COLOR_NUEVO, peso: PESO_NUEVO });
      setMensaje(respuesta?.mensaje || 'Categoría creada correctamente.');
      onMensaje?.(respuesta?.mensaje || 'Categoría creada correctamente.');
    } catch (err) {
      setError(err?.message || 'No se pudo crear la categoría.');
    } finally {
      setCreando(false);
    }
  };

  const eliminar = async (categoria) => {
    const confirmado = window.confirm(`¿Eliminar la categoría "${categoria.etiqueta}"?`);
    if (!confirmado) return;

    setError('');
    setMensaje('');
    setEliminandoId(categoria.id);

    try {
      const respuesta = await eliminarCategoriaPunto(categoria.id);
      await recargar();
      setMensaje(respuesta?.mensaje || 'Categoría eliminada correctamente.');
      onMensaje?.(respuesta?.mensaje || 'Categoría eliminada correctamente.');
    } catch (err) {
      setError(err?.message || 'No se pudo eliminar la categoría.');
    } finally {
      setEliminandoId(null);
    }
  };

  return (
    <Modal
      titulo="Categorías de puntos de interés"
      descripcion="Creá las categorías que necesites y eliminá las que ya no uses. Hospital, Escuela y UPA son categorías base y no se pueden borrar."
      onCerrar={onCerrar}
      ancho="max-w-xl"
    >
      <div className="space-y-4">
        <section>
          <h3 className="etiqueta-campo">Categorías disponibles</h3>
          <ul className="space-y-2">
            {categorias.map((categoria) => {
              const noSePuedeEliminar = categoria.protegida || categoria.totalPuntos > 0;
              const motivo = categoria.protegida
                ? 'Es una categoría base y no se puede eliminar.'
                : categoria.totalPuntos > 0
                  ? `Tiene ${categoria.totalPuntos} punto(s) asociado(s). Cambialos de categoría o eliminalos primero.`
                  : 'Eliminar categoría';

              return (
                <li
                  key={categoria.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-arena-200 bg-arena-50/60 px-3 py-2 dark:border-white/10 dark:bg-white/5"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold text-white"
                      style={{ backgroundColor: categoria.color }}
                      aria-hidden="true"
                    >
                      {categoria.inicial}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-stone-900 dark:text-white">
                        {categoria.etiqueta}
                      </p>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400">
                        {categoria.totalPuntos} punto{categoria.totalPuntos === 1 ? '' : 's'}
                        {categoria.protegida ? ' · Categoría base' : ' · Personalizada'}
                      </p>
                    </div>
                  </div>

                  {categoria.protegida ? (
                    <span
                      className="inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-400 dark:text-stone-500"
                      title="Las categorías base no se pueden eliminar"
                    >
                      <IconoCandado />
                      Base
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => eliminar(categoria)}
                      disabled={noSePuedeEliminar || eliminandoId === categoria.id}
                      title={motivo}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-stone-400 disabled:hover:bg-transparent dark:text-red-300 dark:hover:bg-red-950/40 dark:disabled:text-stone-600"
                    >
                      <IconoBasura />
                      {eliminandoId === categoria.id ? 'Eliminando…' : 'Eliminar'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="border-t border-arena-200 pt-3 dark:border-white/10">
          <h3 className="etiqueta-campo">Nueva categoría</h3>

          <form onSubmit={crear} className="space-y-2.5">
            <div className="grid gap-2.5 sm:grid-cols-[1fr_auto_auto]">
              <div>
                <label htmlFor="nueva-categoria-nombre" className="etiqueta-campo text-xs">
                  Nombre
                </label>
                <input
                  id="nueva-categoria-nombre"
                  type="text"
                  value={nueva.nombre}
                  onChange={(evento) => cambiar('nombre', evento.target.value)}
                  maxLength={80}
                  required
                  placeholder="Comisaría, Destacamento…"
                  className="control-campo"
                  disabled={creando}
                />
              </div>
              <div>
                <label htmlFor="nueva-categoria-color" className="etiqueta-campo text-xs">
                  Color
                </label>
                <input
                  id="nueva-categoria-color"
                  type="color"
                  value={nueva.color}
                  onChange={(evento) => cambiar('color', evento.target.value)}
                  className="control-campo h-10 w-full cursor-pointer p-1 sm:w-16"
                  disabled={creando}
                />
              </div>
              <div>
                <label htmlFor="nueva-categoria-peso" className="etiqueta-campo text-xs">
                  Aporte
                </label>
                <input
                  id="nueva-categoria-peso"
                  type="number"
                  min="0"
                  max="30"
                  step="1"
                  value={nueva.peso}
                  onChange={(evento) => cambiar('peso', evento.target.value)}
                  className="control-campo w-full tabular-nums sm:w-20"
                  disabled={creando}
                />
              </div>
            </div>

            <p className="text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
              El aporte (0 a 30) se suma a la prioridad de los tramos que pasan a menos de 1 km.
              Hospital aporta 30, UPA 20 y Escuela 15.
            </p>

            {error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">
                {error}
              </p>
            ) : null}

            {mensaje ? (
              <p className="rounded-lg bg-verde-50 px-3 py-2 text-xs font-medium text-verde-800 dark:bg-verde-950/40 dark:text-verde-200" role="status">
                {mensaje}
              </p>
            ) : null}

            <button type="submit" className="boton-primario w-full sm:w-auto" disabled={creando}>
              {creando ? 'Creando…' : 'Crear categoría'}
            </button>
          </form>
        </section>
      </div>
    </Modal>
  );
}
