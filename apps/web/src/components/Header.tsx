'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useState } from 'react';
import {
  Activity,
  BarChart3,
  BookOpen,
  ClipboardList,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Route,
  ShieldCheck,
  TrendingUp,
  Upload,
  Sun,
  Tags,
  User,
  X,
} from 'lucide-react';
import { useTema } from './Providers';
import { useSyncStore } from '@/lib/stores';
import { limpiarTokenCache } from '@/lib/api-client';
import { cn } from '@/lib/utils';

const enlaces = [
  { href: '/', label: 'Mapa', icono: Route, roles: ['PUBLICO'] },
  { href: '/reportes', label: 'Reportes', icono: BarChart3, roles: ['PUBLICO'] },
  { href: '/prioridades', label: 'Prioridades', icono: TrendingUp, roles: ['PUBLICO'] },
  { href: '/carga', label: 'Carga', icono: ClipboardList, roles: ['EDITOR', 'ADMIN'] },
  { href: '/importar', label: 'Importar', icono: Upload, roles: ['EDITOR', 'ADMIN'] },
  { href: '/categorias', label: 'Categorías', icono: Tags, roles: ['EDITOR', 'ADMIN'] },
  { href: '/sugerencias', label: 'Sugerencias', icono: BookOpen, roles: ['EDITOR', 'ADMIN'] },
  { href: '/admin/usuarios', label: 'Usuarios', icono: User, roles: ['ADMIN'] },
  { href: '/admin/catalogos', label: 'Catálogos', icono: Activity, roles: ['ADMIN'] },
  { href: '/admin/auditoria', label: 'Auditoría', icono: ShieldCheck, roles: ['ADMIN'] },
];

export function Header() {
  const { data: sesion, status } = useSession();
  const { tema, alternar } = useTema();
  const { online, pendientes } = useSyncStore();
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);

  const rol = sesion?.user.rol ?? 'PUBLICO';
  const visibles = enlaces.filter((enlace) => enlace.roles.includes(rol) || enlace.roles.includes('PUBLICO'));

  return (
    <header className="relative z-[1100] flex h-14 items-center justify-between border-b border-borde bg-panel px-3 sm:px-5">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-marca text-white">
            <Route size={18} />
          </span>
          <span className="hidden sm:inline">Vialidad SDE</span>
        </Link>
        <span
          className={cn(
            'chip',
            online ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-amber-100 text-amber-800'
          )}
          title={online ? 'Con conexión' : 'Sin conexión'}
        >
          <span className={cn('h-2 w-2 rounded-full', online ? 'bg-emerald-500' : 'bg-amber-500')} />
          {online ? 'En línea' : 'Offline'}
          {pendientes > 0 ? ` · ${pendientes}` : ''}
        </span>
      </div>

      <nav className="hidden items-center gap-1 lg:flex">
        {visibles.map((enlace) => {
          const Icono = enlace.icono;
          return (
            <Link
              key={enlace.href}
              href={enlace.href}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-suave hover:bg-fondo hover:text-texto',
                pathname === enlace.href && 'bg-fondo text-texto'
              )}
            >
              <Icono size={16} />
              {enlace.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-1">
        <button className="boton-secundario !px-2" onClick={alternar} aria-label="Cambiar tema">
          {tema === 'claro' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
        {status === 'authenticated' ? (
          <>
            <Link href="/perfil" className="boton-secundario hidden sm:inline-flex">
              <User size={16} /> {sesion?.user.name}
            </Link>
            <button className="boton-secundario !px-2" onClick={() => {
                limpiarTokenCache();
                void signOut({ callbackUrl: '/' });
              }} title="Cerrar sesión">
              <LogOut size={16} />
            </button>
          </>
        ) : (
          <Link href="/login" className="boton-primario">
            <LogIn size={16} /> Ingresar
          </Link>
        )}
        <button className="boton-secundario !px-2 lg:hidden" onClick={() => setAbierto((valor) => !valor)} aria-label="Menú">
          {abierto ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {abierto && (
        <div className="absolute left-0 right-0 top-14 border-b border-borde bg-panel p-3 shadow-panel lg:hidden">
          <div className="grid gap-1">
            {visibles.map((enlace) => {
              const Icono = enlace.icono;
              return (
                <Link
                  key={enlace.href}
                  href={enlace.href}
                  onClick={() => setAbierto(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm hover:bg-fondo"
                >
                  <Icono size={16} /> {enlace.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
