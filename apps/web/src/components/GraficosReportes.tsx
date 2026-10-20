'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export function GraficoEstados({
  datos,
}: {
  datos: { nombre: string; km: number; colorHex: string }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={datos} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
        <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} unit=" km" />
        <Tooltip formatter={(valor: number) => `${valor.toFixed(2)} km`} />
        <Bar dataKey="km" name="Kilómetros" radius={[6, 6, 0, 0]}>
          {datos.map((item) => (
            <Cell key={item.nombre} fill={item.colorHex} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function GraficoDepartamentos({ datos }: { datos: { nombre: string; km: number }[] }) {
  const colores = ['#0d7490', '#0ea5e9', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6', '#14b8a6'];
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={datos} dataKey="km" nameKey="nombre" outerRadius={95} label={(entrada) => entrada.nombre}>
          {datos.map((item, indice) => (
            <Cell key={item.nombre} fill={colores[indice % colores.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(valor: number) => `${valor.toFixed(2)} km`} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function GraficoMantenimientos({
  datos,
}: {
  datos: { mes: string; cantidad: number; costo: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={datos} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
        <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
        <YAxis yAxisId="izq" tick={{ fontSize: 12 }} />
        <YAxis yAxisId="der" orientation="right" tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        <Bar yAxisId="izq" dataKey="cantidad" name="Cantidad" fill="#0d7490" radius={[6, 6, 0, 0]} />
        <Bar yAxisId="der" dataKey="costo" name="Costo" fill="#f59e0b" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
