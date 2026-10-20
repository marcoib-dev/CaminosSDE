import { requerirSesion } from '@/lib/session';
import { CargaClient } from '@/components/CargaClient';

export const dynamic = 'force-dynamic';

export default async function PaginaCarga() {
  await requerirSesion(['EDITOR', 'ADMIN']);
  return <CargaClient />;
}
