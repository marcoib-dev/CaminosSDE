import { requerirSesion } from '@/lib/session';
import { UsuariosClient } from '@/components/UsuariosClient';

export const dynamic = 'force-dynamic';

export default async function PaginaUsuarios() {
  await requerirSesion(['ADMIN']);
  return <UsuariosClient />;
}
