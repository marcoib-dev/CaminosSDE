import { useCallback, useEffect, useState } from 'react';
import { cambiarEstadoUsuario, crearUsuario, obtenerUsuarios } from '../services/api.js';
import { formatearFecha } from '../utils/formato.js';

const CAMPOS_INICIALES = { nombre: '', email: '', password: '' };

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const [campos, setCampos] = useState(CAMPOS_INICIALES);
  const [creando, setCreando] = useState(false);
  const [errorForm, setErrorForm] = useState('');
  const [procesandoId, setProcesandoId] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');

    try {
      setUsuarios(await obtenerUsuarios());
    } catch (err) {
      setError(err?.message || 'No se pudieron cargar los usuarios.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cambiar = (campo, valor) => setCampos((actual) => ({ ...actual, [campo]: valor }));

  const crear = async (evento) => {
    evento.preventDefault();
    setErrorForm('');
    setMensaje('');

    if (campos.password.length < 8) {
      setErrorForm('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setCreando(true);
    try {
      const respuesta = await crearUsuario({
        nombre: campos.nombre.trim(),
        email: campos.email.trim(),
        password: campos.password,
      });
      setMensaje(respuesta?.mensaje || 'Usuario editor creado correctamente.');
      setCampos(CAMPOS_INICIALES);
      await cargar();
    } catch (err) {
      setErrorForm(err?.message || 'No se pudo crear el usuario.');
    } finally {
      setCreando(false);
    }
  };

  const alternarEstado = async (usuario) => {
    if (usuario.activo) {
      const confirmado = window.confirm(
        `¿Desactivar a ${usuario.nombre}? No va a poder iniciar sesión ni usar la API.`
      );
      if (!confirmado) return;
    }

    setProcesandoId(usuario.id);
    setMensaje('');
    setError('');

    try {
      const respuesta = await cambiarEstadoUsuario(usuario.id, !usuario.activo);
      setMensaje(respuesta?.mensaje || 'Usuario actualizado correctamente.');
      await cargar();
    } catch (err) {
      setError(err?.message || 'No se pudo actualizar el usuario.');
    } finally {
      setProcesandoId(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-arena-50 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-verde-700 dark:text-verde-300">
          Administración
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-stone-900 dark:text-white sm:text-4xl">
          Usuarios
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-stone-600 dark:text-stone-300">
          Creá usuarios editores y activá o desactivá su acceso. Los administradores no se pueden
          desactivar desde acá.
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-[22rem_1fr]">
          <section className="tarjeta h-fit p-5">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 dark:text-stone-400">
              Nuevo editor
            </h2>

            <form onSubmit={crear} className="mt-3 space-y-3">
              <div>
                <label htmlFor="usuario-nombre" className="etiqueta-campo">
                  Nombre
                </label>
                <input
                  id="usuario-nombre"
                  type="text"
                  value={campos.nombre}
                  onChange={(evento) => cambiar('nombre', evento.target.value)}
                  maxLength={150}
                  required
                  className="control-campo"
                  disabled={creando}
                />
              </div>
              <div>
                <label htmlFor="usuario-email" className="etiqueta-campo">
                  Email
                </label>
                <input
                  id="usuario-email"
                  type="email"
                  value={campos.email}
                  onChange={(evento) => cambiar('email', evento.target.value)}
                  required
                  placeholder="editor@ejemplo.com"
                  className="control-campo"
                  disabled={creando}
                />
              </div>
              <div>
                <label htmlFor="usuario-password" className="etiqueta-campo">
                  Contraseña inicial
                </label>
                <input
                  id="usuario-password"
                  type="password"
                  value={campos.password}
                  onChange={(evento) => cambiar('password', evento.target.value)}
                  minLength={8}
                  maxLength={72}
                  required
                  autoComplete="new-password"
                  className="control-campo"
                  disabled={creando}
                />
                <p className="mt-1 text-[10px] text-stone-500 dark:text-stone-400">
                  Mínimo 8 caracteres. El editor puede cambiarla desde “Mi perfil”.
                </p>
              </div>

              {errorForm ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">
                  {errorForm}
                </p>
              ) : null}

              <button type="submit" className="boton-primario w-full" disabled={creando}>
                {creando ? 'Creando…' : 'Crear editor'}
              </button>
            </form>
          </section>

          <section>
            {mensaje ? (
              <p className="mb-3 rounded-xl bg-verde-50 px-3.5 py-2.5 text-xs font-medium text-verde-800 dark:bg-verde-950/40 dark:text-verde-200" role="status">
                {mensaje}
              </p>
            ) : null}

            {error ? (
              <p className="mb-3 rounded-xl bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">
                {error}
              </p>
            ) : null}

            {cargando ? (
              <div className="space-y-2">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="tarjeta h-16 animate-pulse bg-white/60 dark:bg-white/5" />
                ))}
              </div>
            ) : (
              <ul className="space-y-2">
                {usuarios.map((usuario) => (
                  <li key={usuario.id} className="tarjeta flex flex-wrap items-center justify-between gap-3 p-3.5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate font-semibold text-stone-900 dark:text-white">
                          {usuario.nombre}
                        </p>
                        <span
                          className={[
                            'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset',
                            usuario.rol === 'ADMIN'
                              ? 'bg-verde-100 text-verde-800 ring-verde-600/20 dark:bg-verde-950/60 dark:text-verde-300 dark:ring-verde-400/30'
                              : 'bg-arena-100 text-stone-600 ring-stone-500/20 dark:bg-white/10 dark:text-stone-300 dark:ring-white/10',
                          ].join(' ')}
                        >
                          {usuario.rol === 'ADMIN' ? 'Administrador' : 'Editor'}
                        </span>
                        <span
                          className={[
                            'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                            usuario.activo
                              ? 'bg-verde-50 text-verde-700 dark:bg-verde-950/40 dark:text-verde-300'
                              : 'bg-stone-200 text-stone-500 dark:bg-white/10 dark:text-stone-400',
                          ].join(' ')}
                        >
                          {usuario.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-stone-500 dark:text-stone-400">
                        {usuario.email} · alta {formatearFecha(usuario.creadoEn)}
                      </p>
                    </div>

                    {usuario.rol === 'EDITOR' ? (
                      <button
                        type="button"
                        onClick={() => alternarEstado(usuario)}
                        disabled={procesandoId === usuario.id}
                        className={[
                          'boton px-3 py-1.5 text-xs',
                          usuario.activo
                            ? 'border border-red-600/25 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-400/20 dark:bg-red-950/30 dark:text-red-300'
                            : 'bg-verde-700 text-white hover:bg-verde-800 dark:bg-verde-600',
                        ].join(' ')}
                      >
                        {procesandoId === usuario.id
                          ? 'Guardando…'
                          : usuario.activo
                            ? 'Desactivar'
                            : 'Activar'}
                      </button>
                    ) : (
                      <span className="text-[11px] text-stone-400 dark:text-stone-500">
                        Cuenta administradora
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
