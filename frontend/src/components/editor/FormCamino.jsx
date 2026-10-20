import { useState } from 'react';
import Modal from '../Modal.jsx';
import { actualizarCamino, crearCamino } from '../../services/api.js';

const CAMPOS_INICIALES = {
  nombre: '',
  localidad: '',
  departamento: '',
  descripcion: '',
  activo: true,
};

export default function FormCamino({ camino, onGuardar, onCerrar }) {
  const [campos, setCampos] = useState(() =>
    camino
      ? {
          nombre: camino.nombre ?? '',
          localidad: camino.localidad ?? '',
          departamento: camino.departamento ?? '',
          descripcion: camino.descripcion ?? '',
          activo: camino.activo ?? true,
        }
      : CAMPOS_INICIALES
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const esEdicion = Boolean(camino);

  const cambiar = (campo, valor) => {
    setCampos((actual) => ({ ...actual, [campo]: valor }));
  };

  const enviar = async (evento) => {
    evento.preventDefault();
    setError('');
    setGuardando(true);

    const datos = {
      nombre: campos.nombre.trim(),
      localidad: campos.localidad.trim(),
      departamento: campos.departamento.trim(),
      descripcion: campos.descripcion.trim() || null,
    };

    if (esEdicion) datos.activo = campos.activo;

    try {
      const respuesta = esEdicion
        ? await actualizarCamino(camino.id, datos)
        : await crearCamino(datos);

      onGuardar(respuesta?.datos, respuesta?.mensaje);
    } catch (err) {
      setError(err?.message || 'No se pudo guardar el camino.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      titulo={esEdicion ? 'Editar camino' : 'Nuevo camino'}
      descripcion={
        esEdicion
          ? 'Actualizá los datos generales del camino.'
          : 'Después de crearlo vas a poder dibujar sus tramos en el mapa.'
      }
      onCerrar={onCerrar}
    >
      <form onSubmit={enviar} className="space-y-3">
        <div>
          <label htmlFor="camino-nombre" className="etiqueta-campo">
            Nombre
          </label>
          <input
            id="camino-nombre"
            type="text"
            value={campos.nombre}
            onChange={(evento) => cambiar('nombre', evento.target.value)}
            maxLength={150}
            required
            autoFocus
            placeholder="Camino rural a…"
            className="control-campo"
            disabled={guardando}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="camino-localidad" className="etiqueta-campo">
              Localidad
            </label>
            <input
              id="camino-localidad"
              type="text"
              value={campos.localidad}
              onChange={(evento) => cambiar('localidad', evento.target.value)}
              maxLength={150}
              required
              className="control-campo"
              disabled={guardando}
            />
          </div>
          <div>
            <label htmlFor="camino-departamento" className="etiqueta-campo">
              Departamento
            </label>
            <input
              id="camino-departamento"
              type="text"
              value={campos.departamento}
              onChange={(evento) => cambiar('departamento', evento.target.value)}
              maxLength={150}
              required
              className="control-campo"
              disabled={guardando}
            />
          </div>
        </div>

        <div>
          <label htmlFor="camino-descripcion" className="etiqueta-campo">
            Descripción <span className="font-normal normal-case tracking-normal">(opcional)</span>
          </label>
          <textarea
            id="camino-descripcion"
            value={campos.descripcion}
            onChange={(evento) => cambiar('descripcion', evento.target.value)}
            rows={3}
            maxLength={2000}
            className="control-campo resize-none"
            disabled={guardando}
          />
        </div>

        {esEdicion ? (
          <label className="flex items-center gap-2.5 rounded-xl border border-arena-200 bg-arena-50/70 px-3 py-2.5 text-sm text-stone-700 dark:border-white/10 dark:bg-white/5 dark:text-stone-200">
            <input
              type="checkbox"
              checked={campos.activo}
              onChange={(evento) => cambiar('activo', evento.target.checked)}
              disabled={guardando}
              className="h-4 w-4 rounded border-arena-400 text-verde-700 focus:ring-verde-500"
            />
            Camino activo (visible en el mapa público)
          </label>
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
            {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear camino'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
