import { useState } from 'react';
import Modal from '../Modal.jsx';
import { useCategorias } from '../../context/CategoriasContext.jsx';
import {
  actualizarPuntoInteres,
  crearCategoriaPunto,
  crearPuntoInteres,
} from '../../services/api.js';

const COLOR_NUEVO = '#0e7490';

export default function FormPuntoInteres({ punto, coordenada, onGuardar, onCerrar }) {
  const esEdicion = Boolean(punto);
  const { categorias, recargar: recargarCategorias } = useCategorias();

  const [campos, setCampos] = useState(() => ({
    nombre: punto?.nombre ?? '',
    categoria: punto?.categoria ?? categorias[0]?.clave ?? 'HOSPITAL',
    latitud: punto?.latitud ?? coordenada?.lat ?? '',
    longitud: punto?.longitud ?? coordenada?.lng ?? '',
  }));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const [mostrarNuevaCategoria, setMostrarNuevaCategoria] = useState(false);
  const [nuevaCategoria, setNuevaCategoria] = useState({ nombre: '', color: COLOR_NUEVO });
  const [creandoCategoria, setCreandoCategoria] = useState(false);
  const [errorCategoria, setErrorCategoria] = useState('');

  const cambiar = (campo, valor) => {
    setCampos((actual) => ({ ...actual, [campo]: valor }));
  };

  const agregarCategoria = async (evento) => {
    evento.preventDefault();
    setErrorCategoria('');

    const nombre = nuevaCategoria.nombre.trim();

    if (!nombre) {
      setErrorCategoria('Escribí un nombre para la categoría.');
      return;
    }

    setCreandoCategoria(true);

    try {
      const respuesta = await crearCategoriaPunto({
        nombre,
        color: nuevaCategoria.color,
      });
      const clave = respuesta?.datos?.clave;

      await recargarCategorias();

      if (clave) cambiar('categoria', clave);

      setNuevaCategoria({ nombre: '', color: COLOR_NUEVO });
      setMostrarNuevaCategoria(false);
    } catch (err) {
      setErrorCategoria(err?.message || 'No se pudo crear la categoría.');
    } finally {
      setCreandoCategoria(false);
    }
  };

  const enviar = async (evento) => {
    evento.preventDefault();
    setError('');

    const latitud = Number(campos.latitud);
    const longitud = Number(campos.longitud);

    if (!Number.isFinite(latitud) || latitud < -90 || latitud > 90) {
      setError('La latitud debe ser un número entre -90 y 90.');
      return;
    }

    if (!Number.isFinite(longitud) || longitud < -180 || longitud > 180) {
      setError('La longitud debe ser un número entre -180 y 180.');
      return;
    }

    setGuardando(true);

    const datos = {
      nombre: campos.nombre.trim(),
      categoria: campos.categoria,
      latitud,
      longitud,
    };

    try {
      const respuesta = esEdicion
        ? await actualizarPuntoInteres(punto.id, datos)
        : await crearPuntoInteres(datos);

      onGuardar(respuesta?.datos, respuesta?.mensaje);
    } catch (err) {
      setError(err?.message || 'No se pudo guardar el punto de interés.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      titulo={esEdicion ? 'Editar punto de interés' : 'Nuevo punto de interés'}
      descripcion="Los puntos de interés suman prioridad a los tramos cercanos."
      onCerrar={onCerrar}
      ancho="max-w-md"
    >
      <form onSubmit={enviar} className="space-y-3">
        <div>
          <label htmlFor="punto-nombre" className="etiqueta-campo">
            Nombre
          </label>
          <input
            id="punto-nombre"
            type="text"
            value={campos.nombre}
            onChange={(evento) => cambiar('nombre', evento.target.value)}
            maxLength={150}
            required
            autoFocus
            placeholder="Hospital Zonal de…"
            className="control-campo"
            disabled={guardando}
          />
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="punto-categoria" className="etiqueta-campo mb-1.5">
              Categoría
            </label>
            <button
              type="button"
              onClick={() => {
                setMostrarNuevaCategoria((actual) => !actual);
                setErrorCategoria('');
              }}
              className="mb-1.5 text-[11px] font-semibold text-cyan-700 transition hover:text-cyan-900 dark:text-cyan-300 dark:hover:text-cyan-100"
            >
              {mostrarNuevaCategoria ? 'Cancelar' : '+ Nueva categoría'}
            </button>
          </div>
          <select
            id="punto-categoria"
            value={campos.categoria}
            onChange={(evento) => cambiar('categoria', evento.target.value)}
            className="control-campo"
            disabled={guardando || creandoCategoria}
          >
            {categorias.map((categoria) => (
              <option key={categoria.clave} value={categoria.clave}>
                {categoria.etiqueta}
              </option>
            ))}
          </select>

          {mostrarNuevaCategoria ? (
            <div className="mt-2 rounded-xl border border-cyan-200 bg-cyan-50/60 p-3 dark:border-cyan-900/60 dark:bg-cyan-950/20">
              <p className="text-[11px] font-semibold text-cyan-900 dark:text-cyan-100">
                Nueva categoría
              </p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-cyan-800/80 dark:text-cyan-200/80">
                Se agrega a la lista para este y otros puntos de interés.
              </p>

              <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
                <div>
                  <label htmlFor="categoria-nombre" className="etiqueta-campo text-xs">
                    Nombre
                  </label>
                  <input
                    id="categoria-nombre"
                    type="text"
                    value={nuevaCategoria.nombre}
                    onChange={(evento) =>
                      setNuevaCategoria((actual) => ({ ...actual, nombre: evento.target.value }))
                    }
                    maxLength={80}
                    placeholder="Comisaría, Destacamento…"
                    className="control-campo"
                    disabled={creandoCategoria}
                  />
                </div>
                <div>
                  <label htmlFor="categoria-color" className="etiqueta-campo text-xs">
                    Color
                  </label>
                  <input
                    id="categoria-color"
                    type="color"
                    value={nuevaCategoria.color}
                    onChange={(evento) =>
                      setNuevaCategoria((actual) => ({ ...actual, color: evento.target.value }))
                    }
                    className="control-campo h-10 w-full cursor-pointer p-1 sm:w-16"
                    disabled={creandoCategoria}
                  />
                </div>
              </div>

              {errorCategoria ? (
                <p className="mt-2 text-[11px] font-medium text-red-700 dark:text-red-300" role="alert">
                  {errorCategoria}
                </p>
              ) : null}

              <button
                type="button"
                onClick={agregarCategoria}
                disabled={creandoCategoria}
                className="boton-primario mt-2 w-full py-1.5 text-xs sm:w-auto"
              >
                {creandoCategoria ? 'Creando…' : 'Crear y usar categoría'}
              </button>
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="punto-latitud" className="etiqueta-campo">
              Latitud
            </label>
            <input
              id="punto-latitud"
              type="number"
              step="any"
              value={campos.latitud}
              onChange={(evento) => cambiar('latitud', evento.target.value)}
              required
              className="control-campo tabular-nums"
              disabled={guardando}
            />
          </div>
          <div>
            <label htmlFor="punto-longitud" className="etiqueta-campo">
              Longitud
            </label>
            <input
              id="punto-longitud"
              type="number"
              step="any"
              value={campos.longitud}
              onChange={(evento) => cambiar('longitud', evento.target.value)}
              required
              className="control-campo tabular-nums"
              disabled={guardando}
            />
          </div>
        </div>

        {!esEdicion ? (
          <p className="rounded-lg bg-arena-100/80 px-3 py-2 text-[11px] leading-relaxed text-stone-600 dark:bg-white/5 dark:text-stone-300">
            Las coordenadas se completaron con el punto elegido en el mapa. Podés ajustarlas a mano.
          </p>
        ) : null}

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCerrar} className="boton-suave" disabled={guardando}>
            Cancelar
          </button>
          <button type="submit" className="boton-primario" disabled={guardando || creandoCategoria}>
            {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear punto'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
