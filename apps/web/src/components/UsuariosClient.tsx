'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import type { UsuarioDTO } from '@sde/shared';
import { apiDatos } from '@/lib/api-client';
import { formatearFecha } from '@/lib/utils';
import { Modal } from './ui/Modal';
import { Aviso } from './ui/Aviso';

export function UsuariosClient() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(false);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const usuarios = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => apiDatos<UsuarioDTO[]>('/usuarios'),
  });

  const crear = useMutation({
    mutationFn: () =>
      apiDatos<UsuarioDTO>('/usuarios', {
        method: 'POST',
        body: JSON.stringify({ nombre, email, password, rol: 'EDITOR' }),
      }),
    onSuccess: () => {
      setModal(false);
      setNombre('');
      setEmail('');
      setPassword('');
      setError('');
      void queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
    onError: (fallo) => setError(fallo instanceof Error ? fallo.message : 'No se pudo crear.'),
  });

  const cambiarEstado = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      apiDatos<UsuarioDTO>(`/usuarios/${id}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ activo }),
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['usuarios'] }),
    onError: (fallo) => setError(fallo instanceof Error ? fallo.message : 'No se pudo actualizar.'),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Usuarios editores</h1>
          <p className="text-sm text-suave">Altas y bajas de cuentas con permisos de edición.</p>
        </div>
        <button className="boton-primario" onClick={() => setModal(true)}>
          <UserPlus size={16} /> Nuevo editor
        </button>
      </div>

      {error && <Aviso tipo="error">{error}</Aviso>}

      <div className="tarjeta overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-borde text-left text-xs uppercase tracking-wide text-suave">
            <tr>
              <th className="py-2">Nombre</th>
              <th className="py-2">Email</th>
              <th className="py-2">Rol</th>
              <th className="py-2">Alta</th>
              <th className="py-2">Estado</th>
              <th className="py-2 text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            {(usuarios.data ?? []).map((usuario) => (
              <tr key={usuario.id} className="border-b border-borde/60 last:border-0">
                <td className="py-2 font-medium">{usuario.nombre}</td>
                <td className="py-2">{usuario.email}</td>
                <td className="py-2">{usuario.rol}</td>
                <td className="py-2">{formatearFecha(usuario.creadoEn)}</td>
                <td className="py-2">
                  <span className={`chip ${usuario.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                    {usuario.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="py-2 text-right">
                  {usuario.rol !== 'ADMIN' && (
                    <button
                      className="boton-secundario"
                      disabled={cambiarEstado.isPending}
                      onClick={() => cambiarEstado.mutate({ id: usuario.id, activo: !usuario.activo })}
                    >
                      {usuario.activo ? 'Desactivar' : 'Reactivar'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal abierto={modal} titulo="Nuevo usuario editor" onCerrar={() => setModal(false)}>
        <form
          className="space-y-4"
          onSubmit={(evento) => {
            evento.preventDefault();
            crear.mutate();
          }}
        >
          <div>
            <label className="etiqueta">Nombre</label>
            <input className="campo" value={nombre} onChange={(e) => setNombre(e.target.value)} required minLength={2} />
          </div>
          <div>
            <label className="etiqueta">Email</label>
            <input type="email" className="campo" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="etiqueta">Contraseña inicial</label>
            <input
              type="password"
              className="campo"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          {error && <Aviso tipo="error">{error}</Aviso>}
          <button className="boton-primario w-full" disabled={crear.isPending}>
            {crear.isPending ? 'Creando…' : 'Crear usuario'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
