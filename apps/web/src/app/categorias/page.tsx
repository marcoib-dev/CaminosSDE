import { requerirSesion } from '@/lib/session';
import { CategoriasClient } from '@/components/CategoriasClient';

export const dynamic = 'force-dynamic';

export default async function PaginaCategorias() {
  await requerirSesion(['EDITOR', 'ADMIN']);
  return <CategoriasClient />;
}
