import { requerirSesion } from '@/lib/session';
import { SugerenciasClient } from '@/components/SugerenciasClient';

export const dynamic = 'force-dynamic';

export default async function PaginaSugerencias() {
  await requerirSesion(['EDITOR', 'ADMIN']);
  return <SugerenciasClient />;
}
