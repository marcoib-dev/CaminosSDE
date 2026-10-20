'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Tag, Trash2 } from 'lucide-react';
import type { CategoriaPuntoDTO } from '@sde/shared';
import { apiDatos } from '@/lib/api-client';
import { Aviso } from './ui/Aviso';

export function CategoriasClient() {
  const queryClient = useQueryClient();
  const [nombre, setNombre] = useState('');
  const [color, setColor] = useState('#0e7490');
  const [inicial, setInicial] = useState('');
  const [peso, setPeso] = useState('10');
  const [orden, setOrden] = useState('100');
  const [error, setError] = useState('');

  const categorias = useQuery({
    queryKey: ['categorias-puntos'],
    queryFn: () => apiDatos<CategoriaPuntoDTO[]>('/categorias-puntos'),
  });

  const refrescar = () => {
    void queryClient.invalidateQueries({ queryKey: ['categorias-puntos'] });
    void queryClient.invalidateQueries({ queryKey: ['puntos-carga'] });
  };

  const crear = useMutation({
    mutationFn: () =>
      apiDatos<CategoriaPuntoDTO>('/categorias-puntos', {
        method: 'POST',
        body: JSON.stringify({
          nombre,
          color,
          inicial: inicial.trim() || undefined,
          peso: Number(peso),
          orden: Number(orden),
        }),
      }),
    onSuccess: () => {
      setNombre('');
      setInicial('');
      setError('');
      refrescar();
    },
    onError: (fallo) => setError(fallo instanceof Error ? fallo.message : 'No se pudo crear la categoría.'),
  });

  const eliminar = useMutation({
    mutationFn: (id: string) => apiDatos(`/categorias-puntos/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      setError('');
      refrescar();
    },
    onError: (fallo) => setError(fallo instanceof Error ? fallo.message : 'No se pudo eliminar la categoría.'),
  });

  const lista = categorias.data ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Categorías de puntos de interés</h1>
        <p className="text-sm text-suave">
          Las categorías base están protegidas. Una categoría propia solo se puede eliminar si no tiene puntos
          asociados.
        </p>
      </div>

      {error && <Aviso tipo="error">{error}</Aviso>}
      {categorias.error && (
        <Aviso tipo="error">
          {categorias.error instanceof Error ? categorias.error.message : 'No se pudieron cargar las categorías.'}
        </Aviso>
      )}

      <section className="tarjeta">
        <h2 className="mb-3 font-semibold">Nueva categoría</h2>
        <form
          className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.4fr_auto_auto_auto_auto] lg:items-end"
          onSubmit={(evento) => {
            evento.preventDefault();
            crear.mutate();
          }}
        >
          <div>
            <label className="etiqueta">Nombre</label>
            <input className="campo" value={nombre} onChange={(evento) => setNombre(evento.target.value)} required />
          </div>
          <div>
            <label className="etiqueta">Color</label>
            <input
              type="color"
              className="campo h-[38px] w-16 p-1"
              value={color}
              onChange={(evento) => setColor(evento.target.value)}
            />
          </div>
          <div className="w-20">
            <label className="etiqueta">Inicial</label>
            <input
              className="campo"
              maxLength={1}
              value={inicial}
              onChange={(evento) => setInicial(evento.target.value.toUpperCase())}
              placeholder={nombre.slice(0, 1).toUpperCase() || 'A'}
            />
          </div>
          <div className="w-24">
            <label className="etiqueta">Peso</label>
            <input
              type="number"
              min={0}
              max={30}
              className="campo"
              value={peso}
              onChange={(evento) => setPeso(evento.target.value)}
            />
          </div>
          <div className="w-24">
            <label className="etiqueta">Orden</label>
            <input
              type="number"
              min={0}
              className="campo"
              value={orden}
              onChange={(evento) => setOrden(evento.target.value)}
            />
          </div>
          <button className="boton-primario sm:col-span-2 lg:col-span-1" disabled={crear.isPending}>
            {crear.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Crear
          </button>
        </form>
        <p className="mt-2 text-xs text-suave">
          El peso (0 a 30) se suma al puntaje de prioridad de los tramos cercanos.
        </p>
      </section>

      <section className="tarjeta">
        <h2 className="mb-3 flex items-center gap-2 font-semibold">
          <Tag size={18} /> Categorías existentes
        </h2>
        {categorias.isLoading ? (
          <p className="flex items-center gap-2 text-sm text-suave">
            <Loader2 size={16} className="animate-spin" /> Cargando…
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {lista.map((categoria) => {
              const bloqueada = categoria.protegida || (categoria.totalPuntos ?? 0) > 0;
              return (
                <div
                  key={categoria.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-borde px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold text-white"
                      style={{ backgroundColor: categoria.color }}
                    >
                      {categoria.inicial}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{categoria.nombre}</p>
                      <p className="text-xs text-suave">
                        {categoria.protegida ? 'Protegida' : `${categoria.totalPuntos ?? 0} punto(s)`} · peso{' '}
                        {categoria.peso} · orden {categoria.orden}
                      </p>
                    </div>
                  </div>
                  <button
                    className="boton-secundario !px-2"
                    disabled={bloqueada || eliminar.isPending}
                    title={
                      categoria.protegida
                        ? 'Las categorías base no se pueden eliminar.'
                        : (categoria.totalPuntos ?? 0) > 0
                          ? 'La categoría tiene puntos asociados.'
                          : 'Eliminar categoría'
                    }
                    onClick={() => eliminar.mutate(categoria.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
