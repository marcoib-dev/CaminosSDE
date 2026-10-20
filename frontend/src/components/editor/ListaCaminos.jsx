import { useMemo, useState } from 'react';
import Modal from '../Modal.jsx';
import { normalizarTexto } from '../../utils/formato.js';

export default function ListaCaminos({
  caminos,
  onCerrar,
  onEditar,
  onEliminar,
  onDibujarTramo,
}) {
  const [busqueda, setBusqueda] = useState('');
  const [eliminandoId, setEliminandoId] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const filtrados = useMemo(() => {
    const texto = normalizarTexto(busqueda);
    if (!texto) return caminos;

    return caminos.filter((camino) =>
      normalizarTexto(`${camino.nombre} ${camino.localidad} ${camino.departamento}`).includes(texto)
    );
  }, [caminos, busqueda]);

  const eliminar = async (camino) => {
    setEliminandoId(camino.id);
    setMensaje('');
    setError('');

    try {
      const texto = await onEliminar(camino);
      if (texto) setMensaje(texto);
    } catch (err) {
      setError(err?.message || 'No se pudo eliminar el camino.');
    } finally {
      setEliminandoId(null);
    }
  };

  return (
    <Modal
      titulo="Administrar caminos"
      descripcion="Editá los datos, dibujá tramos o eliminá caminos, incluso los que no tienen tramos."
      onCerrar={onCerrar}
      ancho="max-w-2xl"
    >
      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder="Buscar por nombre, localidad o departamento…"
          className="control-campo pl-9"
          autoFocus
          aria-label="Buscar caminos"
        />
      </div>

      {mensaje ? (
        <p className="mt-3 rounded-lg bg-verde-50 px-3 py-2 text-xs font-medium text-verde-800 dark:bg-verde-950/40 dark:text-verde-200" role="status">
          {mensaje}
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      {filtrados.length === 0 ? (
        <p className="mt-4 rounded-xl bg-arena-100/80 px-3 py-4 text-center text-sm text-stone-600 dark:bg-white/5 dark:text-stone-300">
          {caminos.length === 0
            ? 'Todavía no hay caminos. Creá el primero con “Nuevo camino”.'
            : 'No hay caminos que coincidan con la búsqueda.'}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {filtrados.map((camino) => (
            <li
              key={camino.id}
              className="rounded-xl border border-arena-200/80 p-3 dark:border-white/10"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-sm font-semibold text-stone-900 dark:text-white">
                      {camino.nombre}
                    </p>
                    {!camino.activo ? (
                      <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-stone-600 dark:bg-white/10 dark:text-stone-400">
                        Inactivo
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                    {camino.localidad} · {camino.departamento} ·{' '}
                    {camino.tramos?.length ?? 0} tramo
                    {(camino.tramos?.length ?? 0) === 1 ? '' : 's'}
                  </p>
                </div>
              </div>

              <div className="mt-2.5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onDibujarTramo(camino)}
                  className="boton-primario px-2.5 py-1.5 text-xs"
                >
                  Dibujar tramo
                </button>
                <button
                  type="button"
                  onClick={() => onEditar(camino)}
                  className="boton-suave px-2.5 py-1.5 text-xs"
                >
                  Editar datos
                </button>
                <button
                  type="button"
                  onClick={() => eliminar(camino)}
                  disabled={eliminandoId === camino.id}
                  className="boton px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30"
                >
                  {eliminandoId === camino.id ? 'Eliminando…' : 'Eliminar'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
