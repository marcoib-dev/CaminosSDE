import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Encabezado from './components/Encabezado.jsx';
import RutaProtegida from './components/RutaProtegida.jsx';
import AuditoriaPage from './pages/AuditoriaPage.jsx';
import ImportarPage from './pages/ImportarPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import MapaPage from './pages/MapaPage.jsx';
import PerfilPage from './pages/PerfilPage.jsx';
import PrioridadesPage from './pages/PrioridadesPage.jsx';
// import SugerenciasPage from './pages/SugerenciasPage.jsx'; // Oculto temporalmente
import UsuariosPage from './pages/UsuariosPage.jsx';

const ROLES_EDITOR = ['EDITOR', 'ADMIN'];
const ROLES_ADMIN = ['ADMIN'];

function Rutas() {
  return (
    <Routes>
      <Route path="/" element={<MapaPage />} />
      <Route path="/prioridades" element={<PrioridadesPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Ruta de sugerencias oculta temporalmente
      <Route
        path="/sugerencias"
        element={
          <RutaProtegida roles={ROLES_EDITOR}>
            <SugerenciasPage />
          </RutaProtegida>
        }
      /> */}
      <Route
        path="/perfil"
        element={
          <RutaProtegida>
            <PerfilPage />
          </RutaProtegida>
        }
      />
      <Route
        path="/importar"
        element={
          <RutaProtegida roles={ROLES_EDITOR}>
            <ImportarPage />
          </RutaProtegida>
        }
      />
      <Route
        path="/usuarios"
        element={
          <RutaProtegida roles={ROLES_ADMIN}>
            <UsuariosPage />
          </RutaProtegida>
        }
      />
      <Route
        path="/auditoria"
        element={
          <RutaProtegida roles={ROLES_ADMIN}>
            <AuditoriaPage />
          </RutaProtegida>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const { pathname } = useLocation();
  const esLogin = pathname === '/login';

  if (esLogin) {
    return (
      <div className="min-h-dvh bg-arena-50 dark:bg-slate-950">
        <Rutas />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-arena-50 dark:bg-slate-950">
      <Encabezado />
      <div className="lg:pl-64">
        <main className="h-dvh overflow-hidden pt-16">
          <Rutas />
        </main>
      </div>
    </div>
  );
}
