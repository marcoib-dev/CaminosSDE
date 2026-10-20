import { requerirSesion } from '@/lib/session';
import { AuditoriaClient } from '@/components/AuditoriaClient';

export const dynamic = 'force-dynamic';

export default async function PaginaAuditoria() {
  await requerirSesion(['ADMIN']);
  return <AuditoriaClient />;
}
