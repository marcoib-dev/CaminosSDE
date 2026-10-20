'use client';

import { X } from 'lucide-react';

export function Modal({
  abierto,
  titulo,
  onCerrar,
  children,
  ancho = 'max-w-lg',
}: {
  abierto: boolean;
  titulo: string;
  onCerrar: () => void;
  children: React.ReactNode;
  ancho?: string;
}) {
  if (!abierto) return null;
  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className={`max-h-[92vh] w-full ${ancho} overflow-y-auto rounded-t-2xl bg-panel p-5 shadow-panel sm:rounded-2xl`}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold">{titulo}</h2>
          <button className="rounded-lg p-1 text-suave hover:bg-fondo" onClick={onCerrar} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
