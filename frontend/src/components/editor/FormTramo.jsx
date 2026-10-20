import { useState } from 'react';
import Modal from '../Modal.jsx';
import { ESTADOS, ORDEN_ESTADOS, ORDEN_TIPOS, TIPOS } from '../../constants/dominio.js';

export default function FormTramo({ caminos, caminoIdInicial, onComenzar, onCerrar }) {
  const [caminoId, setCaminoId] = useState(caminoIdInicial || caminos[0]?.id || '');
  const [estado, setEstado] = useState('REGULAR');
  const [tipo, setTipo] = useState('TIERRA');
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState('');

  const enviar = (evento) => {
    evento.preventDefault();

    if (!caminoId) {
      setError('Elegí el camino al que pertenece el tramo.');
      return;
    }

    onComenzar({
      caminoId,
      estado,
      tipo,
      observaciones: observaciones.trim() || null,
    });
  };

  return (
    <Modal
      titulo="Dibujar un tramo"
      descripcion="Elegí los datos del tramo y después marcá la línea sobre el mapa."
      onCerrar={onCerrar}
      ancho="max-w-md"
    >
      <form onSubmit={enviar} className="space-y-3">
        <div>
          <label htmlFor="tramo-camino" className="etiqueta-campo">
            Camino
          </label>
          <select
            id="tramo-camino"
            value={caminoId}
            onChange={(evento) => setCaminoId(evento.target.value)}
            className="control-campo"
            required
          >
            <option value="">Seleccioná un camino…</option>
            {caminos.map((camino) => (
              <option key={camino.id} value={camino.id}>
                {camino.nombre} — {camino.localidad}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="tramo-estado" className="etiqueta-campo">
              Estado
            </label>
            <select
              id="tramo-estado"
              value={estado}
              onChange={(evento) => setEstado(evento.target.value)}
              className="control-campo"
            >
              {ORDEN_ESTADOS.map((clave) => (
                <option key={clave} value={clave}>
                  {ESTADOS[clave].etiqueta}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tramo-tipo" className="etiqueta-campo">
              Superficie
            </label>
            <select
              id="tramo-tipo"
              value={tipo}
              onChange={(evento) => setTipo(evento.target.value)}
              className="control-campo"
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
          <label htmlFor="tramo-observaciones" className="etiqueta-campo">
            Observaciones <span className="font-normal normal-case tracking-normal">(opcional)</span>
          </label>
          <textarea
            id="tramo-observaciones"
            value={observaciones}
            onChange={(evento) => setObservaciones(evento.target.value)}
            rows={2}
            maxLength={2000}
            className="control-campo resize-none"
            placeholder="Por ejemplo: sector con anegamientos habituales."
          />
        </div>

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCerrar} className="boton-suave">
            Cancelar
          </button>
          <button type="submit" className="boton-primario">
            Comenzar a dibujar
          </button>
        </div>
      </form>
    </Modal>
  );
}
