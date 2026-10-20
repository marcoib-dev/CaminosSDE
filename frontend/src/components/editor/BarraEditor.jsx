function IconoCamino() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
      <path d="M5 21 9 3h6l4 18" strokeLinejoin="round" />
      <path d="M12 7v2.5M12 12.5V15M12 18v1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconoTramo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
      <path d="M4 19 9 7l5 10 6-12" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="4" cy="19" r="1.6" />
      <circle cx="20" cy="5" r="1.6" />
    </svg>
  );
}

function IconoPunto() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
      <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function IconoLista() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
      <path d="M8 6h12M8 12h12M8 18h12" strokeLinecap="round" />
      <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

const botonBase =
  'inline-flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] font-semibold transition';

export default function BarraEditor({
  onNuevoCamino,
  onDibujarTramo,
  onNuevoPunto,
  onAdministrarCaminos,
  activo,
  deshabilitado,
}) {
  const opciones = [
    {
      clave: 'lista',
      etiqueta: 'Caminos',
      icono: <IconoLista />,
      accion: onAdministrarCaminos,
      titulo: 'Administrar caminos existentes',
    },
    {
      clave: 'camino',
      etiqueta: 'Nuevo camino',
      icono: <IconoCamino />,
      accion: onNuevoCamino,
      titulo: 'Crear un camino',
    },
    {
      clave: 'tramo',
      etiqueta: 'Dibujar tramo',
      icono: <IconoTramo />,
      accion: onDibujarTramo,
      titulo: 'Dibujar un tramo sobre el mapa',
    },
    {
      clave: 'punto',
      etiqueta: 'Nuevo punto',
      icono: <IconoPunto />,
      accion: onNuevoPunto,
      titulo: 'Agregar un punto de interés',
    },
  ];

  return (
    <div className="absolute right-3 top-[4.5rem] z-[1045] sm:right-4" aria-label="Herramientas de edición">
      <div className="tarjeta flex flex-col gap-0.5 p-1.5">
        <p className="px-2 pb-1 pt-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-stone-400 dark:text-stone-500">
          Edición
        </p>
        {opciones.map((opcion) => (
          <button
            key={opcion.clave}
            type="button"
            onClick={opcion.accion}
            disabled={deshabilitado}
            title={opcion.titulo}
            className={[
              botonBase,
              activo === opcion.clave
                ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-sm'
                : 'text-stone-700 hover:bg-stone-900/5 dark:text-stone-200 dark:hover:bg-white/10',
            ].join(' ')}
          >
            {opcion.icono}
            <span>{opcion.etiqueta}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
