import { useState } from 'react';
import Modal from '../Modal.jsx';
import { CATEGORIAS_POI, ORDEN_CATEGORIAS_POI } from '../../constants/dominio.js';
import { actualizarPuntoInteres, crearPuntoInteres } from '../../services/api.js';

export default function FormPuntoInteres({ punto, coordenada, onGuardar, onCerrar }) {
  const esEdicion = Boolean(punto);

  const [campos, setCampos] = useState(() => ({
    nombre: punto?.nombre ?? '',
    categoria: punto?.categoria ?? 'HOSPITAL',
    latitud: punto?.latitud ?? coordenada?.lat ?? '',
    longitud: punto?.longitud ?? coordenada?.lng ?? '',
  }));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const cambiar = (campo, valor) => {
    setCampos((actual) => ({ ...actual, [campo]: valor }));
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
          <label htmlFor="punto-categoria" className="etiqueta-campo">
            Categoría
          </label>
          <select
            id="punto-categoria"
            value={campos.categoria}
            onChange={(evento) => cambiar('categoria', evento.target.value)}
            className="control-campo"
            disabled={guardando}
          >
            {ORDEN_CATEGORIAS_POI.map((clave) => (
              <option key={clave} value={clave}>
                {CATEGORIAS_POI[clave].etiqueta}
              </option>
            ))}
          </select>
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
          <button type="submit" className="boton-primario" disabled={guardando}>
            {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear punto'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
