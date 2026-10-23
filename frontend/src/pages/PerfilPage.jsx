import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { cambiarPassword } from '../services/api.js';
import { guardarToken } from '../services/token.js';
import { formatearFecha } from '../utils/formato.js';

const ETIQUETA_ROL = { ADMIN: 'Administrador', EDITOR: 'Editor' };

export default function PerfilPage() {
  const { usuario } = useAuth();

  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const enviar = async (evento) => {
    evento.preventDefault();
    setError('');
    setMensaje('');

    if (passwordNueva.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (passwordNueva !== repetir) {
      setError('Las contraseñas nuevas no coinciden.');
      return;
    }

    setGuardando(true);

    try {
      const respuesta = await cambiarPassword({ passwordActual, passwordNueva });
      // El backend revoca los tokens anteriores y devuelve uno nuevo.
      if (respuesta?.datos?.token) {
        guardarToken(respuesta.datos.token);
      }
      setMensaje(respuesta?.mensaje || 'Contraseña actualizada correctamente.');
      setPasswordActual('');
      setPasswordNueva('');
      setRepetir('');
    } catch (err) {
      setError(err?.message || 'No se pudo cambiar la contraseña.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-arena-50 dark:bg-slate-950">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:py-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-verde-700 dark:text-verde-300">
          Cuenta
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-stone-900 dark:text-white">
          Mi perfil
        </h1>
        <p className="mt-1.5 text-sm text-stone-600 dark:text-stone-300">
          Datos de tu cuenta y cambio de contraseña.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <section className="tarjeta p-5">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 dark:text-stone-400">
              Datos de la cuenta
            </h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-400 dark:text-stone-500">
                  Nombre
                </dt>
                <dd className="mt-0.5 font-semibold text-stone-900 dark:text-white">{usuario?.nombre}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-400 dark:text-stone-500">
                  Email
                </dt>
                <dd className="mt-0.5 break-all text-stone-700 dark:text-stone-200">{usuario?.email}</dd>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-400 dark:text-stone-500">
                    Rol
                  </dt>
                  <dd className="mt-0.5">
                    <span className="inline-flex rounded-full bg-verde-100 px-2 py-0.5 text-[11px] font-bold text-verde-800 dark:bg-verde-950/60 dark:text-verde-300">
                      {ETIQUETA_ROL[usuario?.rol] ?? usuario?.rol}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-400 dark:text-stone-500">
                    Alta
                  </dt>
                  <dd className="mt-0.5 text-stone-700 dark:text-stone-200">{formatearFecha(usuario?.creadoEn)}</dd>
                </div>
              </div>
            </dl>

            <div className="mt-4 rounded-xl bg-arena-100/80 px-3 py-2.5 text-[11px] leading-relaxed text-stone-600 dark:bg-white/5 dark:text-stone-300">
              {usuario?.rol === 'ADMIN'
                ? 'Como administrador podés gestionar usuarios editores y consultar la auditoría.'
                : 'Como editor podés crear y modificar caminos, tramos, fotos y puntos de interés, y revisar sugerencias.'}
            </div>
          </section>

          <section className="tarjeta p-5">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 dark:text-stone-400">
              Cambiar contraseña
            </h2>

            <form onSubmit={enviar} className="mt-3 space-y-3">
              <div>
                <label htmlFor="password-actual" className="etiqueta-campo">
                  Contraseña actual
                </label>
                <input
                  id="password-actual"
                  type="password"
                  value={passwordActual}
                  onChange={(evento) => setPasswordActual(evento.target.value)}
                  autoComplete="current-password"
                  required
                  className="control-campo"
                  disabled={guardando}
                />
              </div>

              <div>
                <label htmlFor="password-nueva" className="etiqueta-campo">
                  Nueva contraseña
                </label>
                <input
                  id="password-nueva"
                  type="password"
                  value={passwordNueva}
                  onChange={(evento) => setPasswordNueva(evento.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  required
                  className="control-campo"
                  disabled={guardando}
                />
                <p className="mt-1 text-[10px] text-stone-500 dark:text-stone-400">
                  Mínimo 8 caracteres.
                </p>
              </div>

              <div>
                <label htmlFor="password-repetir" className="etiqueta-campo">
                  Repetir nueva contraseña
                </label>
                <input
                  id="password-repetir"
                  type="password"
                  value={repetir}
                  onChange={(evento) => setRepetir(evento.target.value)}
                  autoComplete="new-password"
                  required
                  className="control-campo"
                  disabled={guardando}
                />
              </div>

              {error ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">
                  {error}
                </p>
              ) : null}

              {mensaje ? (
                <p className="rounded-lg bg-verde-50 px-3 py-2 text-xs font-medium text-verde-800 dark:bg-verde-950/40 dark:text-verde-200" role="status">
                  {mensaje}
                </p>
              ) : null}

              <button type="submit" className="boton-primario w-full" disabled={guardando}>
                {guardando ? 'Guardando…' : 'Cambiar contraseña'}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
