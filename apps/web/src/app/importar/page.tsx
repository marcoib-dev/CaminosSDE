import { requerirSesion } from '@/lib/session';
import { ImportarClient } from '@/components/ImportarClient';

export const dynamic = 'force-dynamic';

export default async function PaginaImportar() {
  await requerirSesion(['EDITOR', 'ADMIN']);
  return <ImportarClient />;
}
