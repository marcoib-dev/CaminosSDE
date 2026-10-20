import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function IconoCamino({ className = 'h-8 w-8' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M5 21 9 3h6l4 18" strokeLinejoin="round" />
      <path d="M12 7v2.5M12 12.5V15M12 18v1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconoCorreo({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconoCandado({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" strokeLinecap="round" />
    </svg>
  );
}

export default function LoginPage() {
  const { usuario, cargando, iniciar } = useAuth();
  const navegar = useNavigate();
  const ubicacion = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const destino =
    typeof ubicacion.state?.desde === 'string' && ubicacion.state.desde.startsWith('/')
      ? ubicacion.state.desde
      : '/';

  if (cargando) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-cyan-50 via-blue-50 to-teal-50">
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-cyan-600/30 border-t-cyan-600" />
      </div>
    );
  }

  if (usuario) {
    return <Navigate to={destino} replace />;
  }

  const enviar = async (evento) => {
    evento.preventDefault();
    setError('');
    setEnviando(true);

    try {
      await iniciar(email.trim(), password);
      navegar(destino, { replace: true });
    } catch (err) {
      setError(err?.message || 'No se pudo iniciar sesión.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center overflow-y-auto bg-gradient-to-br from-cyan-50 via-blue-50 to-teal-50 p-4 py-8">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-cyan-100 bg-white p-6 shadow-xl sm:p-8">
          <div className="mb-8 text-center">
            <div className="mb-4 flex items-center justify-center gap-3">
              <span className="flex h-16 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-600 to-teal-600 text-white shadow-md">
                <IconoCamino />
              </span>
              <h1 className="bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-2xl font-bold leading-tight text-transparent">
                Caminos Rurales de SDE
              </h1>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Iniciar Sesión</h2>
            <p className="mt-1 text-sm text-gray-500">Accede a tu cuenta</p>
          </div>

          <form onSubmit={enviar} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-gray-900">
                Email
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <IconoCorreo />
                </span>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(evento) => setEmail(evento.target.value)}
                  autoComplete="username"
                  required
                  autoFocus
                  placeholder="tu@email.com"
                  className="control-campo pl-10"
                  disabled={enviando}
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-gray-900">
                Contraseña
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <IconoCandado />
                </span>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(evento) => setPassword(evento.target.value)}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className="control-campo pl-10"
                  disabled={enviando}
                />
              </div>
            </div>

            {error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700" role="alert">
                {error}
              </p>
            ) : null}

            <button type="submit" className="boton-primario w-full" disabled={enviando}>
              {enviando ? 'Ingresando…' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">¿Tienes problemas para iniciar sesión?</p>
            <p className="mt-1 text-sm font-semibold text-cyan-600">
              Contacta con un administrador para obtener ayuda
            </p>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Link to="/" className="text-sm text-gray-500 transition hover:text-gray-700">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
