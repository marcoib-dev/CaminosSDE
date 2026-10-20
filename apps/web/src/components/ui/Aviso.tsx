export function Aviso({ tipo = 'info', children }: { tipo?: 'info' | 'error' | 'ok'; children: React.ReactNode }) {
  const estilos = {
    info: 'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100',
    error: 'border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100',
    ok: 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100',
  }[tipo];
  return <div className={`rounded-lg border px-3 py-2 text-sm ${estilos}`}>{children}</div>;
}
