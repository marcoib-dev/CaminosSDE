import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function RutaProtegida({ roles, children }) {
  const { usuario, cargando } = useAuth();
  const ubicacion = useLocation();

  if (cargando) {
    return (
      <div className="flex h-full items-center justify-center bg-arena-50 dark:bg-slate-950">
        <div className="tarjeta flex items-center gap-3 px-5 py-4">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-verde-600/30 border-t-verde-700 dark:border-verde-300/30 dark:border-t-verde-300" />
          <span className="text-sm font-medium text-stone-700 dark:text-stone-200">
            Verificando sesión…
          </span>
        </div>
      </div>
    );
  }

  if (!usuario) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ desde: `${ubicacion.pathname}${ubicacion.search}` }}
      />
    );
  }

  if (roles && !roles.includes(usuario.rol)) {
    return (
      <div className="flex h-full items-center justify-center bg-arena-50 p-4 dark:bg-slate-950">
        <div className="tarjeta w-full max-w-md p-6 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-red-700 dark:text-red-300">
            Acceso restringido
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-stone-900 dark:text-white">
            No tenés permisos para esta sección
          </h1>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
            Tu rol actual es {usuario.rol === 'ADMIN' ? 'administrador' : 'editor'}. Esta página
            requiere rol {roles.includes('ADMIN') ? 'administrador' : 'editor'}.
          </p>
          <Link to="/" className="boton-primario mt-5">
            Volver al mapa
          </Link>
        </div>
      </div>
    );
  }

  return children;
}
