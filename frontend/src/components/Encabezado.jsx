import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTema } from '../context/TemaContext.jsx';

function IconoCamino({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M5 21 9 3h6l4 18" strokeLinejoin="round" />
      <path d="M12 7v2.5M12 12.5V15M12 18v1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconoMapa({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" strokeLinejoin="round" />
      <path d="M9 4v14M15 6v14" strokeLinecap="round" />
    </svg>
  );
}

function IconoRanking({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M4 20h16M7 20v-6M12 20V8M17 20v-9" strokeLinecap="round" />
    </svg>
  );
}

function IconoSugerencia({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.9 8.9 0 0 1-3.8-.9L3 21l1.9-4.6A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z" strokeLinejoin="round" />
      <path d="M12 8v4M12 15h.01" strokeLinecap="round" />
    </svg>
  );
}

function IconoImportar({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M12 3v10M8 9l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" />
    </svg>
  );
}

function IconoUsuarios({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 5.5a3 3 0 0 1 0 5.8M17.5 19a5.4 5.4 0 0 0-2.2-4.3" strokeLinecap="round" />
    </svg>
  );
}

function IconoAuditoria({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M8 4h8M9 3h6a1 1 0 0 1 1 1v1H8V4a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
      <path d="M6 5h12v16H6z" strokeLinejoin="round" />
      <path d="M9 10h6M9 14h6M9 18h3" strokeLinecap="round" />
    </svg>
  );
}

function IconoPerfil({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" strokeLinecap="round" />
    </svg>
  );
}

function IconoSalir({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 8l-4 4 4 4M6 12h9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconoIngresar({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M14 8l4 4-4 4M18 12H9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconoMenu({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

function IconoCerrar({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}

function IconoSol({ className = 'h-[18px] w-[18px]' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" strokeLinecap="round" />
    </svg>
  );
}

function IconoLuna({ className = 'h-[18px] w-[18px]' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" strokeLinejoin="round" />
    </svg>
  );
}

function IconoCampana({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 21h4" strokeLinecap="round" />
    </svg>
  );
}

const clasesEnlace = ({ isActive }) =>
  [
    'flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200',
    isActive
      ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-md'
      : 'text-gray-700 hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-800',
  ].join(' ');

const ETIQUETA_ROL = { ADMIN: 'Administrador', EDITOR: 'Editor' };

export default function Encabezado() {
  const { esOscuro, alternarTema } = useTema();
  const { usuario, cargando, esEditor, esAdmin, cerrarSesion } = useAuth();
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const [menuMovil, setMenuMovil] = useState(false);
  const [menuUsuario, setMenuUsuario] = useState(false);

  useEffect(() => {
    setMenuMovil(false);
    setMenuUsuario(false);
  }, [ubicacion.pathname]);

  const enlaces = [
    { to: '/', etiqueta: 'Mapa', Icono: IconoMapa, end: true },
    { to: '/prioridades', etiqueta: 'Prioridades', Icono: IconoRanking },
    // { to: '/sugerencias', etiqueta: 'Sugerencias', Icono: IconoSugerencia }, // Oculto temporalmente
    ...(esEditor ? [{ to: '/importar', etiqueta: 'Importar', Icono: IconoImportar }] : []),
    ...(esAdmin
      ? [
          { to: '/usuarios', etiqueta: 'Usuarios', Icono: IconoUsuarios },
          { to: '/auditoria', etiqueta: 'Auditoría', Icono: IconoAuditoria },
        ]
      : []),
    ...(usuario ? [{ to: '/perfil', etiqueta: 'Mi perfil', Icono: IconoPerfil }] : []),
  ];

  const salir = () => {
    cerrarSesion();
    setMenuUsuario(false);
    setMenuMovil(false);
    navegar('/');
  };

  const inicial = usuario?.nombre?.trim()?.charAt(0)?.toUpperCase() || '?';

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-[1170] h-16 border-b border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex h-full items-center gap-3 px-4 lg:px-6">
          <button
            type="button"
            onClick={() => setMenuMovil((actual) => !actual)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white lg:hidden"
            aria-label={menuMovil ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuMovil}
            aria-controls="menu-lateral"
          >
            {menuMovil ? <IconoCerrar /> : <IconoMenu />}
          </button>

          <NavLink to="/" className="flex min-w-0 items-center gap-2.5 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/70">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-600 to-teal-600 text-white shadow-sm">
              <IconoCamino />
            </span>
            <span className="min-w-0">
              <span className="block truncate bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-base font-bold leading-tight text-transparent sm:text-xl">
                <span className="sm:hidden">Caminos Rurales</span>
                <span className="hidden sm:inline">Caminos Rurales de SDE</span>
              </span>
              <span className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-slate-400 sm:block">
                Santiago del Estero
              </span>
            </span>
          </NavLink>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {/* Icono de sugerencias (campana) oculto temporalmente
            {esEditor ? (
              <NavLink
                to="/sugerencias"
                className="relative hidden h-10 w-10 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white sm:inline-flex"
                aria-label="Ver sugerencias"
                title="Sugerencias"
              >
                <IconoCampana />
              </NavLink>
            ) : null} */}

            <button
              type="button"
              onClick={alternarTema}
              className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white sm:inline-flex"
              aria-label={esOscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
              title={esOscuro ? 'Tema claro' : 'Tema oscuro'}
            >
              {esOscuro ? <IconoSol /> : <IconoLuna />}
            </button>

            {!cargando && !usuario ? (
              <NavLink to="/login" className="boton-primario hidden px-3 py-2 text-sm sm:inline-flex">
                <IconoIngresar className="h-4 w-4" />
                Ingresar
              </NavLink>
            ) : null}

            {usuario ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuUsuario((actual) => !actual)}
                  aria-expanded={menuUsuario}
                  aria-haspopup="menu"
                  className="flex items-center gap-2 rounded-full p-0.5 transition hover:bg-gray-100 dark:hover:bg-slate-800"
                  title={usuario.nombre}
                  aria-label={`Menú de ${usuario.nombre}`}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-600 text-sm font-bold text-white shadow-sm">
                    {inicial}
                  </span>
                </button>

                {menuUsuario ? (
                  <>
                    <button
                      type="button"
                      className="fixed inset-0 z-10 cursor-default"
                      onClick={() => setMenuUsuario(false)}
                      aria-label="Cerrar menú de usuario"
                      tabIndex={-1}
                    />
                    <div className="absolute right-0 top-full z-20 mt-2 w-64 animate-aparecer overflow-hidden rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg dark:border-slate-800 dark:bg-slate-900" role="menu">
                      <div className="border-b border-gray-100 px-3 py-2.5 dark:border-slate-800">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{usuario.nombre}</p>
                        <p className="truncate text-xs text-gray-500 dark:text-slate-400">{usuario.email}</p>
                      </div>
                      <NavLink
                        to="/perfil"
                        className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        role="menuitem"
                      >
                        <IconoPerfil className="h-4 w-4" />
                        Mi perfil
                      </NavLink>
                      <button
                        type="button"
                        onClick={salir}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30"
                        role="menuitem"
                      >
                        <IconoSalir className="h-4 w-4" />
                        Cerrar sesión
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {menuMovil ? (
        <button
          type="button"
          onClick={() => setMenuMovil(false)}
          className="fixed inset-0 top-16 z-[1150] bg-slate-950/40 backdrop-blur-[1px] lg:hidden"
          aria-label="Cerrar menú"
        />
      ) : null}

      <aside
        id="menu-lateral"
        className={[
          'fixed left-0 top-16 z-[1160] flex h-[calc(100dvh-4rem)] w-72 flex-col border-r border-gray-200 bg-white transition-transform duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-900 lg:w-64 lg:translate-x-0',
          menuMovil ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        aria-label="Menú principal"
      >
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          <p className="px-4 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400 dark:text-slate-500">
            Menú principal
          </p>
          {enlaces.map(({ to, etiqueta, Icono, end }) => (
            <NavLink key={to} to={to} end={end} className={clasesEnlace}>
              <Icono className="h-5 w-5 shrink-0" />
              <span>{etiqueta}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-200 p-4 dark:border-slate-800">
          <div className="mb-3 flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 dark:border-slate-800 sm:hidden">
            <span className="text-xs font-medium text-gray-600 dark:text-slate-300">Apariencia</span>
            <button
              type="button"
              onClick={alternarTema}
              className="flex items-center gap-1.5 text-xs font-semibold text-cyan-700 transition hover:text-cyan-800 dark:text-cyan-300 dark:hover:text-cyan-200"
            >
              {esOscuro ? <IconoSol className="h-4 w-4" /> : <IconoLuna className="h-4 w-4" />}
              {esOscuro ? 'Tema claro' : 'Tema oscuro'}
            </button>
          </div>
          {usuario ? (
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-600 to-teal-600 text-sm font-bold text-white">
                {inicial}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{usuario.nombre}</p>
                <p className="truncate text-xs text-cyan-700 dark:text-cyan-300">{ETIQUETA_ROL[usuario.rol]}</p>
              </div>
              <button
                type="button"
                onClick={salir}
                className="rounded-md p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                <IconoSalir className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-cyan-100 bg-cyan-50/70 p-3 dark:border-cyan-900/60 dark:bg-cyan-950/30">
              <p className="text-xs font-semibold text-gray-900 dark:text-white">Acceso institucional</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-gray-500 dark:text-slate-400">
                Ingresá para editar caminos, tramos y puntos de interés.
              </p>
              <NavLink to="/login" className="boton-primario mt-2.5 w-full px-3 py-2 text-xs">
                <IconoIngresar className="h-4 w-4" />
                Ingresar
              </NavLink>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
