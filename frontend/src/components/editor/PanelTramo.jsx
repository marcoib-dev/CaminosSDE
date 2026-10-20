import { useEffect, useRef, useState } from 'react';
import { ESTADOS, ORDEN_ESTADOS, ORDEN_TIPOS, TIPOS } from '../../constants/dominio.js';
import {
  actualizarTramo,
  eliminarCamino,
  eliminarFoto,
  eliminarTramo,
  obtenerHistorialTramo,
  subirFoto,
} from '../../services/api.js';
import { formatearFechaHora, formatearKm } from '../../utils/formato.js';

function Etiqueta({ etiqueta, color }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ color, backgroundColor: `${color}18` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
      {etiqueta}
    </span>
  );
}

export default function PanelTramo({
  tramo,
  onCerrar,
  onEditarCamino,
  onIniciarDivision,
  onRecargar,
  onMensaje,
}) {
  const camino = tramo.camino ?? {};
  const [estado, setEstado] = useState(tramo.estado);
  const [tipo, setTipo] = useState(tramo.tipo);
  const [observaciones, setObservaciones] = useState(tramo.observaciones ?? '');
  const [guardando, setGuardando] = useState(false);
  const [errorTramo, setErrorTramo] = useState('');
  const montadoRef = useRef(true);

  useEffect(() => {
    montadoRef.current = true;
    return () => { montadoRef.current = false; };
  }, []);

  const [historial, setHistorial] = useState(null);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [errorHistorial, setErrorHistorial] = useState('');

  const [descripcionFoto, setDescripcionFoto] = useState('');
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [errorFoto, setErrorFoto] = useState('');
  const entradaArchivo = useRef(null);

  const cambiarEstado = async (evento) => {
    evento.preventDefault();
    setErrorTramo('');
    setGuardando(true);

    // Actualización optimista inmediata en UI
    const nuevosDatos = {
      estado,
      tipo,
      observaciones: observaciones.trim() || null,
    };

    try {
      const respuesta = await actualizarTramo(tramo.id, nuevosDatos);
      onMensaje(respuesta?.mensaje || 'Tramo actualizado.');
      // Recarga en background SIN await - no bloquea el botón
      onRecargar();
    } catch (err) {
      // Revertir UI optimista si falla
      setEstado(tramo.estado);
      setTipo(tramo.tipo);
      setObservaciones(tramo.observaciones ?? '');
      setErrorTramo(err?.message || 'No se pudo actualizar el tramo.');
    } finally {
      if (montadoRef.current) setGuardando(false);
    }
  };

  const borrarTramo = async () => {
    const confirmado = window.confirm(
      `¿Eliminar este tramo de ${formatearKm(tramo.longitudKm)}? Esta acción no se puede deshacer.`
    );
    if (!confirmado) return;

    setGuardando(true);
    try {
      await eliminarTramo(tramo.id);
      onMensaje('Tramo eliminado correctamente.');
      onCerrar();
      onRecargar(); // background, sin await
    } catch (err) {
      setErrorTramo(err?.message || 'No se pudo eliminar el tramo.');
    } finally {
      if (montadoRef.current) setGuardando(false);
    }
  };

  const borrarCamino = async () => {
    const confirmado = window.confirm(
      `¿Eliminar el camino "${camino.nombre}" con todos sus tramos, fotos e historial? Esta acción no se puede deshacer.`
    );
    if (!confirmado) return;

    setGuardando(true);
    try {
      await eliminarCamino(camino.id);
      onMensaje('Camino eliminado correctamente.');
      onCerrar();
      onRecargar(); // background, sin await
    } catch (err) {
      setErrorTramo(err?.message || 'No se pudo eliminar el camino.');
    } finally {
      if (montadoRef.current) setGuardando(false);
    }
  };

  const verHistorial = async () => {
    if (historial) {
      setHistorial(null);
      return;
    }

    setCargandoHistorial(true);
    setErrorHistorial('');

    try {
      setHistorial(await obtenerHistorialTramo(tramo.id));
    } catch (err) {
      setErrorHistorial(err?.message || 'No se pudo cargar el historial.');
    } finally {
      setCargandoHistorial(false);
    }
  };

  const enviarFoto = async (evento) => {
    evento.preventDefault();
    setErrorFoto('');

    const archivo = entradaArchivo.current?.files?.[0];
    if (!archivo) {
      setErrorFoto('Elegí una imagen para subir.');
      return;
    }

    if (archivo.size > 10 * 1024 * 1024) {
      setErrorFoto('La imagen no puede superar los 10 MB.');
      return;
    }

    setSubiendoFoto(true);
    try {
      await subirFoto({
        archivo,
        caminoId: camino.id,
        tramoId: tramo.id,
        descripcion: descripcionFoto,
      });

      if (entradaArchivo.current) entradaArchivo.current.value = '';
      setDescripcionFoto('');
      onMensaje('Foto subida correctamente.');
      await onRecargar();
    } catch (err) {
      setErrorFoto(err?.message || 'No se pudo subir la foto.');
    } finally {
      setSubiendoFoto(false);
    }
  };

  const borrarFoto = async (foto) => {
    const confirmado = window.confirm('¿Eliminar esta foto del camino?');
    if (!confirmado) return;

    setErrorFoto('');
    try {
      await eliminarFoto(foto.id);
      onMensaje('Foto eliminada correctamente.');
      await onRecargar();
    } catch (err) {
      setErrorFoto(err?.message || 'No se pudo eliminar la foto.');
    }
  };

  const fotos = camino.fotos ?? [];

  return (
    <aside className="absolute inset-y-0 right-0 z-[1100] flex w-full max-w-md flex-col border-l border-arena-200/80 bg-arena-50 shadow-2xl dark:border-white/10 dark:bg-slate-950">
      <header className="flex items-start justify-between gap-3 border-b border-arena-200/80 px-4 py-3.5 dark:border-white/10">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500 dark:text-stone-400">
            {camino.localidad}
            {camino.departamento ? ` · ${camino.departamento}` : ''}
          </p>
          <h2 className="truncate font-display text-lg font-semibold leading-tight text-stone-900 dark:text-white">
            {camino.nombre || 'Camino sin nombre'}
          </h2>
          <p className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">
            Tramo de {formatearKm(tramo.longitudKm)} · datos del camino y del tramo
          </p>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          className="shrink-0 rounded-lg p-1.5 text-stone-500 transition hover:bg-stone-900/5 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-white/10 dark:hover:text-white"
          aria-label="Cerrar panel de edición"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <div className="panel-desplazable flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <section className="tarjeta p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500 dark:text-stone-400">
                Datos del camino
              </h3>
              <p className="mt-1 text-sm text-stone-700 dark:text-stone-200">
                {camino.descripcion || 'Sin descripción.'}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={onEditarCamino} className="boton-suave px-2.5 py-1.5 text-xs">
              Editar camino
            </button>
            <button
              type="button"
              onClick={borrarCamino}
              className="boton px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30"
            >
              Eliminar camino
            </button>
          </div>
        </section>

        <section className="tarjeta p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500 dark:text-stone-400">
              Datos del tramo
            </h3>
            <div className="flex flex-wrap gap-1">
              <Etiqueta etiqueta={ESTADOS[tramo.estado]?.etiqueta ?? tramo.estado} color={ESTADOS[tramo.estado]?.color ?? '#78716c'} />
              <Etiqueta etiqueta={TIPOS[tramo.tipo]?.etiqueta ?? tramo.tipo} color={TIPOS[tramo.tipo]?.color ?? '#78716c'} />
            </div>
          </div>

          <form onSubmit={cambiarEstado} className="mt-3 space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="editar-tramo-estado" className="etiqueta-campo">
                  Estado
                </label>
                <select
                  id="editar-tramo-estado"
                  value={estado}
                  onChange={(evento) => setEstado(evento.target.value)}
                  className="control-campo py-2 text-xs"
                  disabled={guardando}
                >
                  {ORDEN_ESTADOS.map((clave) => (
                    <option key={clave} value={clave}>
                      {ESTADOS[clave].etiqueta}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="editar-tramo-tipo" className="etiqueta-campo">
                  Superficie
                </label>
                <select
                  id="editar-tramo-tipo"
                  value={tipo}
                  onChange={(evento) => setTipo(evento.target.value)}
                  className="control-campo py-2 text-xs"
                  disabled={guardando}
                >
                  {ORDEN_TIPOS.map((clave) => (
                    <option key={clave} value={clave}>
                      {TIPOS[clave].etiqueta}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="editar-tramo-observaciones" className="etiqueta-campo">
                Observaciones
              </label>
              <textarea
                id="editar-tramo-observaciones"
                value={observaciones}
                onChange={(evento) => setObservaciones(evento.target.value)}
                rows={2}
                maxLength={2000}
                className="control-campo resize-none text-xs"
                placeholder="Sin observaciones."
                disabled={guardando}
              />
            </div>

            {errorTramo ? (
              <p className="rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">
                {errorTramo}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button type="submit" className="boton-primario px-3 py-1.5 text-xs" disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar cambios'}
              </button>
              <button
                type="button"
                onClick={() => onIniciarDivision(tramo)}
                className="boton-suave px-3 py-1.5 text-xs"
                disabled={guardando}
              >
                Dividir / reclasificar
              </button>
            </div>
          </form>
        </section>

        <section className="tarjeta p-3.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500 dark:text-stone-400">
              Historial de cambios
            </h3>
            <button type="button" onClick={verHistorial} className="boton-suave px-2.5 py-1 text-[11px]" disabled={cargandoHistorial}>
              {cargandoHistorial ? 'Cargando…' : historial ? 'Ocultar' : 'Ver historial'}
            </button>
          </div>

          {errorHistorial ? (
            <p className="mt-2 rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">
              {errorHistorial}
            </p>
          ) : null}

          {historial ? (
            historial.length === 0 ? (
              <p className="mt-2 text-xs italic text-stone-400 dark:text-stone-500">
                Todavía no hay cambios registrados para este tramo.
              </p>
            ) : (
              <ol className="mt-2.5 space-y-2">
                {historial.map((item) => (
                  <li key={item.id} className="rounded-xl border border-arena-200/80 px-2.5 py-2 text-[11px] dark:border-white/10">
                    <p className="font-semibold text-stone-700 dark:text-stone-200">
                      {formatearFechaHora(item.fecha)}
                      <span className="font-normal text-stone-500 dark:text-stone-400">
                        {' '}· {item.usuario?.nombre || 'Usuario eliminado'}
                      </span>
                    </p>
                    <p className="mt-0.5 text-stone-600 dark:text-stone-300">
                      Estado: {ESTADOS[item.estadoAnterior]?.etiqueta ?? item.estadoAnterior} →{' '}
                      {ESTADOS[item.estadoNuevo]?.etiqueta ?? item.estadoNuevo}
                    </p>
                    <p className="text-stone-600 dark:text-stone-300">
                      Superficie: {TIPOS[item.tipoAnterior]?.etiqueta ?? item.tipoAnterior} →{' '}
                      {TIPOS[item.tipoNuevo]?.etiqueta ?? item.tipoNuevo}
                    </p>
                  </li>
                ))}
              </ol>
            )
          ) : null}
        </section>

        <section className="tarjeta p-3.5">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500 dark:text-stone-400">
            Fotos del camino
          </h3>

          {fotos.length > 0 ? (
            <div className="mt-2 grid grid-cols-3 gap-2">
              {fotos.map((foto) => (
                <div key={foto.id} className="group relative overflow-hidden rounded-lg ring-1 ring-black/5 dark:ring-white/10">
                  <img
                    src={foto.url}
                    alt={foto.descripcion || `Foto de ${camino.nombre}`}
                    loading="lazy"
                    className="h-20 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => borrarFoto(foto)}
                    className="absolute right-1 top-1 rounded-md bg-stone-950/70 p-1 text-white opacity-100 transition hover:bg-red-700 focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    aria-label="Eliminar foto"
                    title="Eliminar foto"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5" aria-hidden="true">
                      <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs italic text-stone-400 dark:text-stone-500">Sin fotos cargadas.</p>
          )}

          <form onSubmit={enviarFoto} className="mt-3 space-y-2 border-t border-arena-200/80 pt-3 dark:border-white/10">
            <label htmlFor="foto-archivo" className="etiqueta-campo">
              Subir una foto
            </label>
            <input
              ref={entradaArchivo}
              id="foto-archivo"
              type="file"
              accept="image/*"
              className="block w-full text-xs text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-verde-700 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-verde-800 dark:text-stone-300 dark:file:bg-verde-600"
              disabled={subiendoFoto}
            />
            <input
              type="text"
              value={descripcionFoto}
              onChange={(evento) => setDescripcionFoto(evento.target.value)}
              maxLength={300}
              placeholder="Descripción opcional"
              className="control-campo py-2 text-xs"
              disabled={subiendoFoto}
            />

            {errorFoto ? (
              <p className="rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">
                {errorFoto}
              </p>
            ) : null}

            <button type="submit" className="boton-primario w-full py-2 text-xs" disabled={subiendoFoto}>
              {subiendoFoto ? 'Subiendo…' : 'Subir foto'}
            </button>
          </form>
        </section>

        <button
          type="button"
          onClick={borrarTramo}
          className="boton w-full border border-red-600/25 bg-red-50 py-2 text-xs text-red-700 hover:bg-red-100 dark:border-red-400/20 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50"
          disabled={guardando}
        >
          Eliminar este tramo
        </button>
      </div>
    </aside>
  );
}
