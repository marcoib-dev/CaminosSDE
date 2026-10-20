'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Aviso } from './ui/Aviso';

const esquema = z.object({
  texto: z.string().trim().min(5, 'Contanos un poco más (mínimo 5 caracteres).').max(2000),
  contacto: z.string().trim().max(200).optional(),
});

type Formulario = z.infer<typeof esquema>;

export function SugerenciaForm({ caminoId, tramoId }: { caminoId?: string | null; tramoId?: string | null }) {
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'ok' | 'error'>('idle');
  const [mensaje, setMensaje] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Formulario>({ resolver: zodResolver(esquema), defaultValues: { texto: '', contacto: '' } });

  const enviar = async (datos: Formulario) => {
    setEstado('enviando');
    setMensaje('');
    try {
      const respuesta = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api'}/sugerencias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...datos, caminoId, tramoId }),
      });
      const cuerpo = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error((cuerpo as { mensaje?: string }).mensaje ?? 'No se pudo enviar.');
      setEstado('ok');
      setMensaje('¡Gracias! Tu sugerencia fue registrada.');
      reset();
    } catch (error) {
      setEstado('error');
      setMensaje(error instanceof Error ? error.message : 'No se pudo enviar la sugerencia.');
    }
  };

  return (
    <form onSubmit={handleSubmit(enviar)} className="space-y-3">
      <div>
        <label className="etiqueta">Sugerencia</label>
        <textarea
          {...register('texto')}
          rows={4}
          className="campo resize-none"
          placeholder="Ej.: el tramo está anegado desde el km 2, falta mantenimiento…"
        />
        {errors.texto && <p className="mt-1 text-xs text-red-600">{errors.texto.message}</p>}
      </div>
      <div>
        <label className="etiqueta">Contacto (opcional)</label>
        <input {...register('contacto')} className="campo" placeholder="Teléfono o email" />
      </div>
      {mensaje && <Aviso tipo={estado === 'ok' ? 'ok' : 'error'}>{mensaje}</Aviso>}
      <button className="boton-primario w-full" disabled={estado === 'enviando'}>
        {estado === 'enviando' ? 'Enviando…' : 'Enviar sugerencia'}
      </button>
    </form>
  );
}
