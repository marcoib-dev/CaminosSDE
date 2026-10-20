import type { Metadata, Viewport } from 'next';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import './globals.css';
import { Providers } from '@/components/Providers';
import { Header } from '@/components/Header';

export const metadata: Metadata = {
  title: 'Vialidad SDE — Sistema Provincial',
  description: 'Sistema de información provincial para la gestión de caminos rurales de Santiago del Estero.',
  manifest: '/manifest.webmanifest',
  applicationName: 'Vialidad SDE',
};

export const viewport: Viewport = {
  themeColor: '#0d7490',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <Providers>
          <Header />
          <main className="min-h-[calc(100vh-3.5rem)]">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
