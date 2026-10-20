import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import type { Rol } from '@sde/shared';
import { authOptions } from './auth';

export async function requerirSesion(roles?: Rol[]) {
  const sesion = await getServerSession(authOptions);
  if (!sesion?.user) redirect('/login');
  if (roles && !roles.includes(sesion.user.rol)) redirect('/');
  return sesion;
}
