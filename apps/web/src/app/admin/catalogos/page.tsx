import { requerirSesion } from '@/lib/session';
import { CatalogosClient } from '@/components/CatalogosClient';

export const dynamic = 'force-dynamic';

export default async function PaginaCatalogos() {
  await requerirSesion(['ADMIN']);
  return <CatalogosClient />;
}
