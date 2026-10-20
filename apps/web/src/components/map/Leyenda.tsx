'use client';

import type { EstadoTramoDTO, TipoViaDTO } from '@sde/shared';
import { colorEstado, colorTipoVia, estiloTipoVia } from '@/lib/constants';

export function Leyenda({
  estados,
  tiposVia,
  colorPor,
}: {
  estados: EstadoTramoDTO[];
  tiposVia: TipoViaDTO[];
  colorPor: 'estado' | 'tipoVia';
}) {
  return (
    <div className="rounded-xl border border-borde bg-panel/95 p-3 text-xs shadow-panel backdrop-blur">
      <p className="mb-2 font-semibold uppercase tracking-wide text-suave">
        {colorPor === 'estado' ? 'Estado' : 'Tipo de vía'}
      </p>
      <div className="grid gap-1.5">
        {(colorPor === 'estado' ? estados : tiposVia).map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            <span
              className="h-1 w-7 rounded"
              style={{
                backgroundColor: colorPor === 'estado' ? colorEstado(item as EstadoTramoDTO) : colorTipoVia(item as TipoViaDTO),
                borderTop:
                  colorPor === 'tipoVia' && estiloTipoVia(item as TipoViaDTO).dashArray
                    ? `2px dashed ${colorTipoVia(item as TipoViaDTO)}`
                    : undefined,
              }}
            />
            <span>{item.nombre}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
