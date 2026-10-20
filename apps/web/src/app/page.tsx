import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DashboardMap } from '@/components/DashboardMap';

export const dynamic = 'force-dynamic';

export default async function PaginaMapa() {
  const sesion = await getServerSession(authOptions);
  return <DashboardMap rol={sesion?.user.rol ?? null} />;
}
