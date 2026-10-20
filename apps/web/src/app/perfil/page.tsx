import { requerirSesion } from '@/lib/session';
import { PerfilCliente } from '@/components/PerfilCliente';

export const dynamic = 'force-dynamic';

export default async function PaginaPerfil() {
  await requerirSesion();
  return <PerfilCliente />;
}
