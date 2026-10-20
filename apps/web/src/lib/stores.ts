import { create } from 'zustand';

export type Herramienta = 'navegar' | 'trazar' | 'punto' | 'infraestructura' | 'medir';

interface EstadoMapa {
  herramienta: Herramienta;
  puntosBorrador: [number, number][];
  colorPor: 'estado' | 'tipoVia';
  setHerramienta: (herramienta: Herramienta) => void;
  agregarPunto: (punto: [number, number]) => void;
  quitarUltimoPunto: () => void;
  limpiarBorrador: () => void;
  setColorPor: (colorPor: 'estado' | 'tipoVia') => void;
}

export const useMapStore = create<EstadoMapa>((set) => ({
  herramienta: 'navegar',
  puntosBorrador: [],
  colorPor: 'estado',
  setHerramienta: (herramienta) =>
    set((estado) => ({
      herramienta,
      puntosBorrador: herramienta === 'navegar' ? [] : estado.puntosBorrador,
    })),
  agregarPunto: (punto) => set((estado) => ({ puntosBorrador: [...estado.puntosBorrador, punto] })),
  quitarUltimoPunto: () => set((estado) => ({ puntosBorrador: estado.puntosBorrador.slice(0, -1) })),
  limpiarBorrador: () => set({ puntosBorrador: [] }),
  setColorPor: (colorPor) => set({ colorPor }),
}));

interface EstadoSync {
  online: boolean;
  pendientes: number;
  sincronizando: boolean;
  ultimoError: string | null;
  setOnline: (online: boolean) => void;
  setPendientes: (pendientes: number) => void;
  setSincronizando: (sincronizando: boolean) => void;
  setUltimoError: (error: string | null) => void;
}

export const useSyncStore = create<EstadoSync>((set) => ({
  online: true,
  pendientes: 0,
  sincronizando: false,
  ultimoError: null,
  setOnline: (online) => set({ online }),
  setPendientes: (pendientes) => set({ pendientes }),
  setSincronizando: (sincronizando) => set({ sincronizando }),
  setUltimoError: (ultimoError) => set({ ultimoError }),
}));
