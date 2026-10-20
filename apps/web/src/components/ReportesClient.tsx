'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, MapPinned, Route, Wrench } from 'lucide-react';
import { getPublico } from '@/lib/api-client';
import { formatearKm, formatearMoneda } from '@/lib/utils';

const GraficoEstados = dynamic(() => import('./GraficosReportes').then((modulo) => modulo.GraficoEstados), { ssr: false });
const GraficoDepartamentos = dynamic(
  () => import('./GraficosReportes').then((modulo) => modulo.GraficoDepartamentos),
  { ssr: false }
);
const GraficoMantenimientos = dynamic(
  () => import('./GraficosReportes').then((modulo) => modulo.GraficoMantenimientos),
  { ssr: false }
);

interface Resumen {
  caminos: number;
  tramos: number;
  km: number;
  puntos: number;
  mantenimientos: number;
}
interface KmEstado {
  clave: string;
  nombre: string;
  colorHex: string;
  km: number;
  tramos: number;
}
interface KmDepartamento {
  id: string | null;
  nombre: string;
  km: number;
  tramos: number;
  caminos: number;
}
interface MantenimientoMes {
  mes: number;
  tipo: string;
  cantidad: number;
  costo: number;
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function ReportesClient() {
  const [anio, setAnio] = useState(new Date().getFullYear());

  const resumen = useQuery({ queryKey: ['reporte-resumen'], queryFn: () => getPublico<Resumen>('/reportes/resumen') });
  const estados = useQuery({
    queryKey: ['reporte-estados'],
    queryFn: () => getPublico<KmEstado[]>('/reportes/km-por-estado'),
  });
  const departamentos = useQuery({
    queryKey: ['reporte-departamentos'],
    queryFn: () => getPublico<KmDepartamento[]>('/reportes/km-por-departamento'),
  });
  const mantenimientos = useQuery({
    queryKey: ['reporte-mantenimientos', anio],
    queryFn: () => getPublico<MantenimientoMes[]>(`/reportes/mantenimientos-anuales?anio=${anio}`),
  });

  const datosMantenimiento = useMemo(() => {
    return MESES.map((nombre, indice) => {
      const filas = (mantenimientos.data ?? []).filter((fila) => fila.mes === indice + 1);
      return {
        mes: nombre,
        cantidad: filas.reduce((total, fila) => total + fila.cantidad, 0),
        costo: filas.reduce((total, fila) => total + fila.costo, 0),
      };
    });
  }, [mantenimientos.data]);

  const tarjetas = [
    { titulo: 'Caminos', valor: resumen.data?.caminos ?? 0, icono: Route },
    { titulo: 'Tramos', valor: resumen.data?.tramos ?? 0, icono: MapPinned },
    { titulo: 'Kilómetros', valor: formatearKm(resumen.data?.km ?? 0), icono: BarChart3 },
    { titulo: 'Mantenimientos', valor: resumen.data?.mantenimientos ?? 0, icono: Wrench },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Reportes</h1>
          <p className="text-sm text-suave">Indicadores de la red vial provincial.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-suave">Año de mantenimientos</label>
          <input
            type="number"
            className="campo w-24"
            value={anio}
            min={2000}
            max={new Date().getFullYear() + 1}
            onChange={(evento) => setAnio(Number(evento.target.value))}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tarjetas.map(({ titulo, valor, icono: Icono }) => (
          <div key={titulo} className="tarjeta flex items-center justify-between">
            <div>
              <p className="text-sm text-suave">{titulo}</p>
              <p className="text-2xl font-semibold">{valor}</p>
            </div>
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-marca/10 text-marca">
              <Icono size={22} />
            </span>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="tarjeta">
          <h2 className="mb-3 font-semibold">Kilómetros por estado</h2>
          <GraficoEstados
            datos={(estados.data ?? []).map((item) => ({ nombre: item.nombre, km: item.km, colorHex: item.colorHex }))}
          />
        </section>
        <section className="tarjeta">
          <h2 className="mb-3 font-semibold">Distribución por departamento</h2>
          <GraficoDepartamentos
            datos={(departamentos.data ?? []).slice(0, 8).map((item) => ({ nombre: item.nombre, km: item.km }))}
          />
        </section>
      </div>

      <section className="tarjeta">
        <h2 className="mb-3 font-semibold">Mantenimientos {anio}</h2>
        <GraficoMantenimientos datos={datosMantenimiento} />
      </section>

      <section className="tarjeta overflow-x-auto">
        <h2 className="mb-3 font-semibold">Detalle por estado</h2>
        <table className="w-full min-w-[520px] text-sm">
          <thead className="border-b border-borde text-left text-xs uppercase tracking-wide text-suave">
            <tr>
              <th className="py-2">Estado</th>
              <th className="py-2">Tramos</th>
              <th className="py-2 text-right">Kilómetros</th>
            </tr>
          </thead>
          <tbody>
            {(estados.data ?? []).map((item) => (
              <tr key={item.clave} className="border-b border-borde/60 last:border-0">
                <td className="py-2">
                  <span className="chip text-white" style={{ backgroundColor: item.colorHex }}>
                    {item.nombre}
                  </span>
                </td>
                <td className="py-2">{item.tramos}</td>
                <td className="py-2 text-right">{formatearKm(item.km)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="tarjeta overflow-x-auto">
        <h2 className="mb-3 font-semibold">Kilómetros por departamento</h2>
        <table className="w-full min-w-[520px] text-sm">
          <thead className="border-b border-borde text-left text-xs uppercase tracking-wide text-suave">
            <tr>
              <th className="py-2">Departamento</th>
              <th className="py-2">Caminos</th>
              <th className="py-2">Tramos</th>
              <th className="py-2 text-right">Kilómetros</th>
            </tr>
          </thead>
          <tbody>
            {(departamentos.data ?? []).map((item) => (
              <tr key={item.id ?? item.nombre} className="border-b border-borde/60 last:border-0">
                <td className="py-2">{item.nombre}</td>
                <td className="py-2">{item.caminos}</td>
                <td className="py-2">{item.tramos}</td>
                <td className="py-2 text-right">{formatearKm(item.km)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-suave">
          Costo total de mantenimientos del año: {formatearMoneda(datosMantenimiento.reduce((total, fila) => total + fila.costo, 0))}
        </p>
      </section>
    </div>
  );
}
