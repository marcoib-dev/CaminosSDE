'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { lineString, length } from '@turf/turf';
import imageCompression from 'browser-image-compression';
import {
  Camera,
  CircleDot,
  Construction,
  Eraser,
  Hand,
  Loader2,
  LocateFixed,
  MapPin,
  Navigation,
  PenLine,
  Plus,
  Ruler,
  Save,
  Scissors,
  Trash2,
  Undo2,
  Upload,
  Wrench,
} from 'lucide-react';
import type {
  CaminoDTO,
  CategoriaPuntoDTO,
  DepartamentoDTO,
  EstadoTramoDTO,
  FeatureCollectionDTO,
  FotoDTO,
  InfraestructuraDTO,
  PuntoInteresDTO,
  TipoViaDTO,
  TramoDTO,
} from '@sde/shared';
import { api, apiDatos, getPublico } from '@/lib/api-client';
import { contarPendientes, encolar } from '@/lib/offline/db';
import { sincronizar } from '@/lib/offline/sync';
import { useMapStore, useSyncStore, type Herramienta } from '@/lib/stores';
import { TIPOS_INFRAESTRUCTURA, TIPOS_MANTENIMIENTO } from '@/lib/constants';
import { formatearKm } from '@/lib/utils';
import { MapView } from './map/MapView';
import type { TramoProps } from './map/MapCanvas';
import { Modal } from './ui/Modal';
import { Aviso } from './ui/Aviso';

type TramoFC = FeatureCollectionDTO<TramoProps>;
type Bbox = [number, number, number, number];

interface CaminoDetalle extends CaminoDTO {
  fotos: FotoDTO[];
  tramos: TramoDTO[];
}

interface FormCamino {
  nombre: string;
  localidad: string;
  tipoViaId: string;
  departamentoId: string;
  descripcion: string;
  estadoId: string;
  observaciones: string;
}

interface FormPunto {
  nombre: string;
  categoria: string;
}

interface FormMantenimiento {
  tipo: string;
  fecha: string;
  costo: string;
  descripcion: string;
}

interface FormInfraestructura {
  tipo: string;
  descripcion: string;
  caminoId: string;
}

interface FormCaminoDatos {
  nombre: string;
  localidad: string;
  tipoViaId: string;
  departamentoId: string;
  descripcion: string;
  activo: boolean;
}

const hoy = () => new Date().toISOString().slice(0, 10);
const uuid = () => crypto.randomUUID();

export function CargaClient() {
  const queryClient = useQueryClient();
  const { herramienta, setHerramienta, puntosBorrador, agregarPunto, quitarUltimoPunto, limpiarBorrador, colorPor, setColorPor } =
    useMapStore();
  const { online, pendientes, setPendientes, setOnline } = useSyncStore();

  const [bbox, setBbox] = useState<Bbox | null>(null);
  const [mostrarPuntos, setMostrarPuntos] = useState(true);
  const [mostrarGps, setMostrarGps] = useState(false);
  const [centrarEn, setCentrarEn] = useState<[number, number] | null>(null);
  const [tramoSeleccionado, setTramoSeleccionado] = useState<TramoProps | null>(null);
  const [modalCamino, setModalCamino] = useState(false);
  const [modalPunto, setModalPunto] = useState(false);
  const [modalInfra, setModalInfra] = useState(false);
  const [puntoNuevo, setPuntoNuevo] = useState<[number, number] | null>(null);
  const [puntoSeleccionado, setPuntoSeleccionado] = useState<PuntoInteresDTO | null>(null);
  const [infraSeleccionada, setInfraSeleccionada] = useState<InfraestructuraDTO | null>(null);
  const [error, setError] = useState('');
  const [errorModal, setErrorModal] = useState('');
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error' | 'info'; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [sincronizandoManual, setSincronizandoManual] = useState(false);

  const [formCamino, setFormCamino] = useState<FormCamino>({
    nombre: '',
    localidad: '',
    tipoViaId: '',
    departamentoId: '',
    descripcion: '',
    estadoId: '',
    observaciones: '',
  });
  const [formCaminoEdicion, setFormCaminoEdicion] = useState<FormCaminoDatos>({
    nombre: '',
    localidad: '',
    tipoViaId: '',
    departamentoId: '',
    descripcion: '',
    activo: true,
  });
  const [formPunto, setFormPunto] = useState<FormPunto>({ nombre: '', categoria: 'HOSPITAL' });
  const [formInfra, setFormInfra] = useState<FormInfraestructura>({ tipo: 'ALCANTARILLA', descripcion: '', caminoId: '' });
  const [formPuntoEdicion, setFormPuntoEdicion] = useState<FormPunto>({ nombre: '', categoria: 'HOSPITAL' });
  const [formInfraEdicion, setFormInfraEdicion] = useState<FormInfraestructura>({
    tipo: 'ALCANTARILLA',
    descripcion: '',
    caminoId: '',
  });
  const [editEstadoId, setEditEstadoId] = useState('');
  const [editObservaciones, setEditObservaciones] = useState('');
  const [splitKm, setSplitKm] = useState('');
  const [mergeId, setMergeId] = useState('');
  const [mantenimiento, setMantenimiento] = useState<FormMantenimiento>({
    tipo: 'PREVENTIVO',
    fecha: hoy(),
    costo: '',
    descripcion: '',
  });
  const [fotoDescripcion, setFotoDescripcion] = useState('');
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const archivoFoto = useRef<HTMLInputElement>(null);

  const { data: estados = [] } = useQuery({
    queryKey: ['estados-tramo'],
    queryFn: () => getPublico<EstadoTramoDTO[]>('/catalogos/estados-tramo'),
  });
  const { data: tiposVia = [] } = useQuery({
    queryKey: ['tipos-via'],
    queryFn: () => getPublico<TipoViaDTO[]>('/catalogos/tipos-via'),
  });
  const { data: departamentos = [] } = useQuery({
    queryKey: ['departamentos'],
    queryFn: () => getPublico<DepartamentoDTO[]>('/departamentos'),
  });
  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias-puntos'],
    queryFn: () => getPublico<CategoriaPuntoDTO[]>('/categorias-puntos'),
  });

  const tramosQuery = useQuery({
    queryKey: ['tramos-carga', bbox],
    queryFn: () => getPublico<TramoFC>(`/tramos?bbox=${bbox!.join(',')}&zoom=14`),
    enabled: Boolean(bbox),
    refetchInterval: online ? 25_000 : false,
    placeholderData: (anterior) => anterior,
  });

  const puntosQuery = useQuery({
    queryKey: ['puntos-carga', bbox],
    queryFn: () => getPublico<PuntoInteresDTO[]>(`/puntos-interes?bbox=${bbox!.join(',')}`),
    enabled: Boolean(bbox) && mostrarPuntos,
  });

  const infraQuery = useQuery({
    queryKey: ['infra-carga', bbox],
    queryFn: () => getPublico<InfraestructuraDTO[]>(`/infraestructura?bbox=${bbox!.join(',')}`),
    enabled: Boolean(bbox),
  });

  const detalleQuery = useQuery({
    queryKey: ['camino-detalle', tramoSeleccionado?.camino.id],
    queryFn: () => apiDatos<CaminoDetalle>(`/caminos/${tramoSeleccionado!.camino.id}`),
    enabled: Boolean(tramoSeleccionado),
  });

  const distanciaBorrador = useMemo(() => {
    if (puntosBorrador.length < 2) return 0;
    return length(lineString(puntosBorrador), { units: 'kilometers' }) ?? 0;
  }, [puntosBorrador]);

  const candidatosFusion = useMemo(() => {
    if (!tramoSeleccionado) return [];
    return (tramosQuery.data?.features ?? [])
      .map((feature) => feature.properties)
      .filter(
        (tramo) =>
          tramo.caminoId === tramoSeleccionado.caminoId &&
          tramo.id !== tramoSeleccionado.id &&
          tramo.estadoId === tramoSeleccionado.estadoId
      );
  }, [tramosQuery.data, tramoSeleccionado]);

  useEffect(() => {
    if (!mensaje) return;
    const temporizador = window.setTimeout(() => setMensaje(null), 6500);
    return () => window.clearTimeout(temporizador);
  }, [mensaje]);

  useEffect(() => {
    if (!tramoSeleccionado) return;
    setEditEstadoId(tramoSeleccionado.estadoId);
    setEditObservaciones(tramoSeleccionado.observaciones ?? '');
    setSplitKm('');
    setMergeId('');
    setErrorModal('');
    setMantenimiento({ tipo: 'PREVENTIVO', fecha: hoy(), costo: '', descripcion: '' });
    setFotoDescripcion('');
    setFormCaminoEdicion({
      nombre: tramoSeleccionado.camino.nombre,
      localidad: tramoSeleccionado.camino.localidad,
      tipoViaId: tramoSeleccionado.camino.tipoViaId,
      departamentoId: tramoSeleccionado.camino.departamentoId ?? '',
      descripcion: '',
      activo: true,
    });
  }, [tramoSeleccionado?.id]);

  useEffect(() => {
    const detalle = detalleQuery.data;
    if (!detalle || !tramoSeleccionado || detalle.id !== tramoSeleccionado.camino.id) return;
    setFormCaminoEdicion((actual) => ({
      ...actual,
      descripcion: detalle.descripcion ?? '',
      activo: detalle.activo,
    }));
  }, [detalleQuery.data, tramoSeleccionado?.id]);

  const invalidar = () => {
    void queryClient.invalidateQueries({ queryKey: ['tramos-carga'] });
    void queryClient.invalidateQueries({ queryKey: ['puntos-carga'] });
    void queryClient.invalidateQueries({ queryKey: ['infra-carga'] });
    void queryClient.invalidateQueries({ queryKey: ['camino-detalle'] });
    void queryClient.invalidateQueries({ queryKey: ['tramos-mapa'] });
    void queryClient.invalidateQueries({ queryKey: ['reporte-estados'] });
    void queryClient.invalidateQueries({ queryKey: ['reporte-resumen'] });
  };

  const activarHerramienta = (nueva: Herramienta) => {
    limpiarBorrador();
    setError('');
    setHerramienta(nueva);
  };

  const manejarClickMapa = (punto: [number, number]) => {
    if (herramienta === 'navegar') return;
    if (herramienta === 'punto') {
      setPuntoNuevo(punto);
      setFormPunto({ nombre: '', categoria: categorias[0]?.clave ?? 'HOSPITAL' });
      setModalPunto(true);
      return;
    }
    if (herramienta === 'infraestructura') {
      if (!online) {
        setMensaje({ tipo: 'error', texto: 'Para crear infraestructura necesitás conexión.' });
        return;
      }
      setPuntoNuevo(punto);
      setFormInfra({ tipo: 'ALCANTARILLA', descripcion: '', caminoId: '' });
      setModalInfra(true);
      return;
    }
    agregarPunto(punto);
  };

  const abrirModalCamino = () => {
    if (puntosBorrador.length < 2) {
      setMensaje({ tipo: 'error', texto: 'Marcá al menos dos puntos sobre el mapa.' });
      return;
    }
    setFormCamino({
      nombre: '',
      localidad: '',
      tipoViaId: tiposVia.find((tipo) => tipo.clave === 'CAMINO_RURAL')?.id ?? tiposVia[0]?.id ?? '',
      departamentoId: '',
      descripcion: '',
      estadoId: estados.find((estado) => estado.clave === 'TRANSITABLE')?.id ?? estados[0]?.id ?? '',
      observaciones: '',
    });
    setError('');
    setModalCamino(true);
  };

  const guardarCamino = async () => {
    if (puntosBorrador.length < 2) return;
    setGuardando(true);
    setError('');
    const geometria = { type: 'LineString' as const, coordinates: puntosBorrador };
    const datos = {
      nombre: formCamino.nombre,
      localidad: formCamino.localidad,
      tipoViaId: formCamino.tipoViaId,
      departamentoId: formCamino.departamentoId || null,
      descripcion: formCamino.descripcion || null,
      geom: geometria,
    };

    try {
      if (!online) {
        await encolar({
          id: uuid(),
          tipo: 'CREAR_CAMINO',
          payload: {
            ...datos,
            tramo: {
              geometria,
              estadoId: formCamino.estadoId || undefined,
              observaciones: formCamino.observaciones || null,
            },
          },
        });
        setPendientes(await contarPendientes());
        setMensaje({ tipo: 'info', texto: 'Camino guardado sin conexión. Se sincronizará automáticamente.' });
      } else {
        const camino = await apiDatos<{ id: string }>('/caminos', {
          method: 'POST',
          body: JSON.stringify(datos),
        });
        try {
          await apiDatos(`/caminos/${camino.id}/tramos`, {
            method: 'POST',
            body: JSON.stringify({
              geometria,
              estadoId: formCamino.estadoId || undefined,
              observaciones: formCamino.observaciones || null,
            }),
          });
        } catch (fallo) {
          // Si falla el tramo inicial, no dejamos un camino vacío creado a medias.
          await apiDatos(`/caminos/${camino.id}`, { method: 'DELETE' }).catch(() => undefined);
          throw fallo;
        }
        setMensaje({ tipo: 'ok', texto: 'Camino y tramo inicial creados.' });
      }
      setModalCamino(false);
      limpiarBorrador();
      setHerramienta('navegar');
      invalidar();
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No se pudo guardar el camino.');
    } finally {
      setGuardando(false);
    }
  };

  const guardarPunto = async () => {
    if (!puntoNuevo) return;
    setGuardando(true);
    setError('');
    const datos = {
      nombre: formPunto.nombre,
      categoria: formPunto.categoria,
      latitud: puntoNuevo[1],
      longitud: puntoNuevo[0],
    };
    try {
      if (!online) {
        await encolar({ id: uuid(), tipo: 'CREAR_PUNTO_INTERES', payload: datos });
        setPendientes(await contarPendientes());
        setMensaje({ tipo: 'info', texto: 'Punto guardado sin conexión.' });
      } else {
        await apiDatos('/puntos-interes', { method: 'POST', body: JSON.stringify(datos) });
        setMensaje({ tipo: 'ok', texto: 'Punto de interés creado.' });
      }
      setModalPunto(false);
      setPuntoNuevo(null);
      invalidar();
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No se pudo guardar el punto.');
    } finally {
      setGuardando(false);
    }
  };

  const guardarInfraestructura = async () => {
    if (!puntoNuevo) return;
    if (!online) {
      setError('Para crear infraestructura necesitás conexión.');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      await apiDatos('/infraestructura', {
        method: 'POST',
        body: JSON.stringify({
          tipo: formInfra.tipo,
          descripcion: formInfra.descripcion || null,
          caminoId: formInfra.caminoId || null,
          geom: { type: 'Point', coordinates: puntoNuevo },
        }),
      });
      setModalInfra(false);
      setMensaje({ tipo: 'ok', texto: 'Infraestructura creada.' });
      void queryClient.invalidateQueries({ queryKey: ['infra-carga'] });
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No se pudo crear la infraestructura.');
    } finally {
      setGuardando(false);
    }
  };

  const abrirPunto = (punto: PuntoInteresDTO) => {
    setPuntoSeleccionado(punto);
    setFormPuntoEdicion({ nombre: punto.nombre, categoria: punto.categoria });
    setErrorModal('');
  };

  const guardarPuntoSeleccionado = async () => {
    if (!puntoSeleccionado) return;
    if (!online) {
      setErrorModal('Para editar un punto de interés necesitás conexión.');
      return;
    }
    setGuardando(true);
    setErrorModal('');
    try {
      await apiDatos(`/puntos-interes/${puntoSeleccionado.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          nombre: formPuntoEdicion.nombre,
          categoria: formPuntoEdicion.categoria,
        }),
      });
      setPuntoSeleccionado(null);
      setMensaje({ tipo: 'ok', texto: 'Punto de interés actualizado.' });
      invalidar();
    } catch (fallo) {
      setErrorModal(fallo instanceof Error ? fallo.message : 'No se pudo actualizar el punto.');
    } finally {
      setGuardando(false);
    }
  };

  const eliminarPuntoSeleccionado = async () => {
    if (!puntoSeleccionado) return;
    if (!window.confirm('¿Eliminar este punto de interés? La acción queda registrada en auditoría.')) return;
    if (!online) {
      setErrorModal('Para eliminar un punto de interés necesitás conexión.');
      return;
    }
    setGuardando(true);
    setErrorModal('');
    try {
      await api<{ mensaje: string }>(`/puntos-interes/${puntoSeleccionado.id}`, { method: 'DELETE' });
      setPuntoSeleccionado(null);
      setMensaje({ tipo: 'ok', texto: 'Punto de interés eliminado.' });
      invalidar();
    } catch (fallo) {
      setErrorModal(fallo instanceof Error ? fallo.message : 'No se pudo eliminar el punto.');
    } finally {
      setGuardando(false);
    }
  };

  const abrirInfraestructura = (item: InfraestructuraDTO) => {
    setInfraSeleccionada(item);
    setFormInfraEdicion({
      tipo: item.tipo,
      descripcion: item.descripcion ?? '',
      caminoId: item.caminoId ?? '',
    });
    setErrorModal('');
  };

  const guardarInfraestructuraSeleccionada = async () => {
    if (!infraSeleccionada) return;
    if (!online) {
      setErrorModal('Para editar infraestructura necesitás conexión.');
      return;
    }
    setGuardando(true);
    setErrorModal('');
    try {
      await apiDatos(`/infraestructura/${infraSeleccionada.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          tipo: formInfraEdicion.tipo,
          descripcion: formInfraEdicion.descripcion || null,
          caminoId: formInfraEdicion.caminoId || null,
        }),
      });
      setInfraSeleccionada(null);
      setMensaje({ tipo: 'ok', texto: 'Infraestructura actualizada.' });
      invalidar();
    } catch (fallo) {
      setErrorModal(fallo instanceof Error ? fallo.message : 'No se pudo actualizar la infraestructura.');
    } finally {
      setGuardando(false);
    }
  };

  const eliminarInfraestructuraSeleccionada = async () => {
    if (!infraSeleccionada) return;
    if (!window.confirm('¿Eliminar esta infraestructura? La acción queda registrada en auditoría.')) return;
    if (!online) {
      setErrorModal('Para eliminar infraestructura necesitás conexión.');
      return;
    }
    setGuardando(true);
    setErrorModal('');
    try {
      await api<{ mensaje: string }>(`/infraestructura/${infraSeleccionada.id}`, { method: 'DELETE' });
      setInfraSeleccionada(null);
      setMensaje({ tipo: 'ok', texto: 'Infraestructura eliminada.' });
      invalidar();
    } catch (fallo) {
      setErrorModal(fallo instanceof Error ? fallo.message : 'No se pudo eliminar la infraestructura.');
    } finally {
      setGuardando(false);
    }
  };

  const guardarDatosCamino = async () => {
    if (!tramoSeleccionado) return;
    if (!online) {
      setErrorModal('Para editar los datos del camino necesitás conexión.');
      return;
    }
    setGuardando(true);
    setErrorModal('');
    try {
      await apiDatos(`/caminos/${tramoSeleccionado.camino.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          nombre: formCaminoEdicion.nombre,
          localidad: formCaminoEdicion.localidad,
          tipoViaId: formCaminoEdicion.tipoViaId,
          departamentoId: formCaminoEdicion.departamentoId || null,
          descripcion: formCaminoEdicion.descripcion || null,
          activo: formCaminoEdicion.activo,
        }),
      });
      setMensaje({ tipo: 'ok', texto: 'Datos del camino actualizados.' });
      invalidar();
    } catch (fallo) {
      setErrorModal(fallo instanceof Error ? fallo.message : 'No se pudieron actualizar los datos del camino.');
    } finally {
      setGuardando(false);
    }
  };

  const eliminarCamino = async () => {
    if (!tramoSeleccionado) return;
    if (
      !window.confirm(
        `¿Eliminar el camino "${tramoSeleccionado.camino.nombre}"? Se eliminarán todos sus tramos, mantenimientos y fotos.`
      )
    ) {
      return;
    }
    if (!online) {
      setErrorModal('Para eliminar un camino necesitás conexión.');
      return;
    }
    setGuardando(true);
    setErrorModal('');
    try {
      await api<{ mensaje: string }>(`/caminos/${tramoSeleccionado.camino.id}`, { method: 'DELETE' });
      setTramoSeleccionado(null);
      setMensaje({ tipo: 'ok', texto: 'Camino eliminado.' });
      invalidar();
    } catch (fallo) {
      setErrorModal(fallo instanceof Error ? fallo.message : 'No se pudo eliminar el camino.');
    } finally {
      setGuardando(false);
    }
  };

  const guardarTramo = async () => {
    if (!tramoSeleccionado) return;
    setGuardando(true);
    setErrorModal('');
    try {
      if (!online) {
        await encolar({
          id: uuid(),
          tipo: 'EDITAR_TRAMO',
          payload: { tramoId: tramoSeleccionado.id, estadoId: editEstadoId, observaciones: editObservaciones || null },
        });
        setPendientes(await contarPendientes());
        setMensaje({ tipo: 'info', texto: 'Cambio guardado sin conexión.' });
      } else {
        await apiDatos(`/tramos/${tramoSeleccionado.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ estadoId: editEstadoId, observaciones: editObservaciones || null }),
        });
        setMensaje({ tipo: 'ok', texto: 'Tramo actualizado.' });
      }
      setTramoSeleccionado(null);
      invalidar();
    } catch (fallo) {
      setErrorModal(fallo instanceof Error ? fallo.message : 'No se pudo actualizar el tramo.');
    } finally {
      setGuardando(false);
    }
  };

  const dividirTramo = async () => {
    if (!tramoSeleccionado) return;
    const km = Number(splitKm);
    if (!Number.isFinite(km) || km <= 0 || km >= tramoSeleccionado.longitudKm) {
      setErrorModal(`Ingresá un km entre 0 y ${tramoSeleccionado.longitudKm.toFixed(3)}.`);
      return;
    }
    setGuardando(true);
    setErrorModal('');
    try {
      if (!online) {
        await encolar({ id: uuid(), tipo: 'DIVIDIR_TRAMO', payload: { tramoId: tramoSeleccionado.id, kmCorte: km } });
        setPendientes(await contarPendientes());
        setMensaje({ tipo: 'info', texto: 'División guardada sin conexión.' });
      } else {
        await apiDatos(`/tramos/${tramoSeleccionado.id}/dividir`, {
          method: 'POST',
          body: JSON.stringify({ kmCorte: km }),
        });
        setMensaje({ tipo: 'ok', texto: 'Tramo dividido.' });
      }
      setTramoSeleccionado(null);
      invalidar();
    } catch (fallo) {
      setErrorModal(fallo instanceof Error ? fallo.message : 'No se pudo dividir el tramo.');
    } finally {
      setGuardando(false);
    }
  };

  const fusionarTramo = async () => {
    if (!tramoSeleccionado || !mergeId) {
      setErrorModal('Elegí el tramo adyacente.');
      return;
    }
    setGuardando(true);
    setErrorModal('');
    try {
      if (!online) {
        await encolar({
          id: uuid(),
          tipo: 'FUSIONAR_TRAMO',
          payload: { tramoId: tramoSeleccionado.id, tramoAdyacenteId: mergeId },
        });
        setPendientes(await contarPendientes());
        setMensaje({ tipo: 'info', texto: 'Fusión guardada sin conexión.' });
      } else {
        await apiDatos(`/tramos/${tramoSeleccionado.id}/fusionar`, {
          method: 'POST',
          body: JSON.stringify({ tramoAdyacenteId: mergeId }),
        });
        setMensaje({ tipo: 'ok', texto: 'Tramos fusionados.' });
      }
      setTramoSeleccionado(null);
      invalidar();
    } catch (fallo) {
      setErrorModal(fallo instanceof Error ? fallo.message : 'No se pudieron fusionar los tramos.');
    } finally {
      setGuardando(false);
    }
  };

  const eliminarTramo = async () => {
    if (!tramoSeleccionado) return;
    if (!window.confirm('¿Eliminar este tramo? La acción queda registrada en auditoría.')) return;
    if (!online) {
      setErrorModal('Para eliminar un tramo necesitás conexión.');
      return;
    }
    setGuardando(true);
    try {
      await api<{ mensaje: string }>(`/tramos/${tramoSeleccionado.id}`, { method: 'DELETE' });
      setTramoSeleccionado(null);
      setMensaje({ tipo: 'ok', texto: 'Tramo eliminado.' });
      invalidar();
    } catch (fallo) {
      setErrorModal(fallo instanceof Error ? fallo.message : 'No se pudo eliminar.');
    } finally {
      setGuardando(false);
    }
  };

  const guardarMantenimiento = async () => {
    if (!tramoSeleccionado) return;
    setGuardando(true);
    setErrorModal('');
    const datos = {
      tramoId: tramoSeleccionado.id,
      tipo: mantenimiento.tipo,
      fecha: new Date(`${mantenimiento.fecha}T12:00:00`).toISOString(),
      costo: mantenimiento.costo ? Number(mantenimiento.costo) : null,
      descripcion: mantenimiento.descripcion || null,
    };
    try {
      if (!online) {
        await encolar({ id: uuid(), tipo: 'CREAR_MANTENIMIENTO', payload: datos });
        setPendientes(await contarPendientes());
        setMensaje({ tipo: 'info', texto: 'Mantenimiento guardado sin conexión.' });
      } else {
        await apiDatos(`/tramos/${tramoSeleccionado.id}/mantenimientos`, {
          method: 'POST',
          body: JSON.stringify({
            tipo: datos.tipo,
            fecha: datos.fecha,
            costo: datos.costo,
            descripcion: datos.descripcion,
          }),
        });
        setMensaje({ tipo: 'ok', texto: 'Mantenimiento registrado.' });
      }
      setMantenimiento({ tipo: 'PREVENTIVO', fecha: hoy(), costo: '', descripcion: '' });
      invalidar();
    } catch (fallo) {
      setErrorModal(fallo instanceof Error ? fallo.message : 'No se pudo registrar el mantenimiento.');
    } finally {
      setGuardando(false);
    }
  };

  const subirFoto = async (archivo: File) => {
    if (!tramoSeleccionado) return;
    if (!online) {
      setErrorModal('Para subir fotos necesitás conexión.');
      return;
    }
    setSubiendoFoto(true);
    setErrorModal('');
    try {
      const comprimida = await imageCompression(archivo, { maxSizeMB: 1.2, maxWidthOrHeight: 1600 });
      const firma = await apiDatos<{
        cloudName: string;
        apiKey: string;
        timestamp: number;
        folder: string;
        firma: string;
        urlSubida: string;
      }>('/fotos/upload-url', { method: 'POST' });
      const formulario = new FormData();
      formulario.append('file', comprimida);
      formulario.append('api_key', firma.apiKey);
      formulario.append('timestamp', String(firma.timestamp));
      formulario.append('folder', firma.folder);
      formulario.append('signature', firma.firma);
      const subida = await fetch(firma.urlSubida, { method: 'POST', body: formulario });
      const resultado = (await subida.json()) as { secure_url?: string; error?: { message?: string } };
      if (!subida.ok || !resultado.secure_url) {
        throw new Error(resultado.error?.message ?? 'Cloudinary rechazó la imagen.');
      }
      await apiDatos('/fotos', {
        method: 'POST',
        body: JSON.stringify({
          url: resultado.secure_url,
          descripcion: fotoDescripcion || null,
          caminoId: tramoSeleccionado.camino.id,
          tramoId: tramoSeleccionado.id,
        }),
      });
      setFotoDescripcion('');
      if (archivoFoto.current) archivoFoto.current.value = '';
      setMensaje({ tipo: 'ok', texto: 'Foto subida.' });
      void queryClient.invalidateQueries({ queryKey: ['camino-detalle'] });
    } catch (fallo) {
      setErrorModal(fallo instanceof Error ? fallo.message : 'No se pudo subir la foto.');
    } finally {
      setSubiendoFoto(false);
    }
  };

  const eliminarFoto = async (id: string) => {
    if (!window.confirm('¿Eliminar la foto?')) return;
    try {
      await api<{ mensaje: string }>(`/fotos/${id}`, { method: 'DELETE' });
      void queryClient.invalidateQueries({ queryKey: ['camino-detalle'] });
    } catch (fallo) {
      setErrorModal(fallo instanceof Error ? fallo.message : 'No se pudo eliminar la foto.');
    }
  };

  const sincronizarAhora = async () => {
    setSincronizandoManual(true);
    try {
      setOnline(await (await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api'}/health`)).ok);
      await sincronizar();
      setPendientes(await contarPendientes());
      invalidar();
      setMensaje({ tipo: 'ok', texto: 'Sincronización completada.' });
    } catch (fallo) {
      setMensaje({ tipo: 'error', texto: fallo instanceof Error ? fallo.message : 'No se pudo sincronizar.' });
    } finally {
      setSincronizandoManual(false);
    }
  };

  return (
    <div className="relative h-[calc(100vh-3.5rem)] w-full overflow-hidden">
      <MapView
        tramos={tramosQuery.data ?? { type: 'FeatureCollection', features: [] }}
        puntos={mostrarPuntos ? puntosQuery.data ?? [] : []}
        infraestructura={infraQuery.data ?? []}
        tiposVia={tiposVia}
        colorPor={colorPor}
        onViewportChange={setBbox}
        onTramoClick={setTramoSeleccionado}
        onPuntoClick={herramienta === 'navegar' ? abrirPunto : undefined}
        onInfraClick={herramienta === 'navegar' ? abrirInfraestructura : undefined}
        onMapClick={manejarClickMapa}
        draftPoints={puntosBorrador}
        dibujando={herramienta !== 'navegar'}
        mostrarGps={mostrarGps}
        centrarEn={centrarEn}
      />

      <div className="absolute left-3 top-3 z-[900] flex flex-col gap-2">
        <div className="flex flex-col gap-1 rounded-xl border border-borde bg-panel/95 p-1.5 shadow-panel backdrop-blur">
          {[
            { clave: 'navegar' as const, icono: Hand, titulo: 'Navegar' },
            { clave: 'trazar' as const, icono: PenLine, titulo: 'Trazar camino' },
            { clave: 'punto' as const, icono: CircleDot, titulo: 'Nuevo punto de interés' },
            { clave: 'infraestructura' as const, icono: Construction, titulo: 'Nueva infraestructura' },
            { clave: 'medir' as const, icono: Ruler, titulo: 'Medir distancia' },
          ].map(({ clave, icono: Icono, titulo }) => (
            <button
              key={clave}
              title={titulo}
              aria-label={titulo}
              className={`grid h-10 w-10 place-items-center rounded-lg transition ${
                herramienta === clave ? 'bg-marca text-white' : 'text-suave hover:bg-fondo'
              }`}
              onClick={() => activarHerramienta(clave)}
            >
              <Icono size={19} />
            </button>
          ))}
          <div className="my-1 h-px bg-borde" />
          <button
            title="GPS"
            aria-label="GPS"
            className={`grid h-10 w-10 place-items-center rounded-lg transition ${
              mostrarGps ? 'bg-sky-600 text-white' : 'text-suave hover:bg-fondo'
            }`}
            onClick={() => setMostrarGps((valor) => !valor)}
          >
            <Navigation size={19} />
          </button>
          <button
            title="Centrar en Santiago del Estero"
            aria-label="Centrar"
            className="grid h-10 w-10 place-items-center rounded-lg text-suave hover:bg-fondo"
            onClick={() => setCentrarEn([-27.8, -63.2])}
          >
            <LocateFixed size={19} />
          </button>
        </div>

        {herramienta !== 'navegar' && puntosBorrador.length > 0 && (
          <div className="w-56 rounded-xl border border-borde bg-panel/95 p-3 text-sm shadow-panel backdrop-blur">
            <p className="font-semibold">
              {herramienta === 'medir' ? 'Distancia' : 'Trazado en curso'}
            </p>
            <p className="text-2xl font-semibold text-marca">{formatearKm(distanciaBorrador)}</p>
            <p className="mb-2 text-xs text-suave">{puntosBorrador.length} puntos marcados</p>
            <div className="grid gap-1.5">
              {herramienta === 'trazar' && (
                <button className="boton-primario" onClick={abrirModalCamino}>
                  <Plus size={16} /> Finalizar trazado
                </button>
              )}
              <button className="boton-secundario" onClick={quitarUltimoPunto}>
                <Undo2 size={16} /> Deshacer punto
              </button>
              <button className="boton-secundario" onClick={limpiarBorrador}>
                <Eraser size={16} /> Limpiar
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="absolute right-3 top-3 z-[900] flex flex-col items-end gap-2">
        <div className="flex items-center gap-2 rounded-xl border border-borde bg-panel/95 px-3 py-2 text-xs shadow-panel backdrop-blur">
          <span className={`h-2 w-2 rounded-full ${online ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          <span>{online ? 'En línea' : 'Sin conexión'}</span>
          <span className="text-suave">{pendientes} pendientes</span>
          <button className="boton-secundario !px-2 !py-1" onClick={sincronizarAhora} disabled={sincronizandoManual}>
            {sincronizandoManual ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Sincronizar
          </button>
        </div>
        <label className="flex items-center gap-2 rounded-xl border border-borde bg-panel/95 px-3 py-2 text-xs shadow-panel backdrop-blur">
          <input type="checkbox" checked={mostrarPuntos} onChange={(evento) => setMostrarPuntos(evento.target.checked)} />
          Puntos de interés
        </label>
        <select className="rounded-lg border border-borde bg-panel/95 px-2 py-1.5 text-xs shadow-panel" value={colorPor} onChange={(evento) => setColorPor(evento.target.value as 'estado' | 'tipoVia')}>
          <option value="estado">Colorear por estado</option>
          <option value="tipoVia">Colorear por tipo</option>
        </select>
      </div>

      {mensaje && (
        <div className="absolute left-1/2 top-3 z-[1200] w-[min(92vw,520px)] -translate-x-1/2">
          <Aviso tipo={mensaje.tipo === 'ok' ? 'ok' : mensaje.tipo === 'error' ? 'error' : 'info'}>{mensaje.texto}</Aviso>
        </div>
      )}

      <Modal abierto={modalCamino} titulo="Nuevo camino" onCerrar={() => setModalCamino(false)} ancho="max-w-xl">
        <div className="space-y-3">
          <div className="rounded-lg bg-fondo p-3 text-sm">
            <p className="font-medium">Trazado de {formatearKm(distanciaBorrador)}</p>
            <p className="text-xs text-suave">{puntosBorrador.length} vértices capturados</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="etiqueta">Nombre *</label>
              <input className="campo" value={formCamino.nombre} onChange={(e) => setFormCamino({ ...formCamino, nombre: e.target.value })} />
            </div>
            <div>
              <label className="etiqueta">Localidad *</label>
              <input className="campo" value={formCamino.localidad} onChange={(e) => setFormCamino({ ...formCamino, localidad: e.target.value })} />
            </div>
            <div>
              <label className="etiqueta">Tipo de vía *</label>
              <select className="campo" value={formCamino.tipoViaId} onChange={(e) => setFormCamino({ ...formCamino, tipoViaId: e.target.value })}>
                {tiposVia.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="etiqueta">Departamento</label>
              <select className="campo" value={formCamino.departamentoId} onChange={(e) => setFormCamino({ ...formCamino, departamentoId: e.target.value })}>
                <option value="">Detectar por geometría</option>
                {departamentos.map((depto) => (
                  <option key={depto.id} value={depto.id}>
                    {depto.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="etiqueta">Descripción</label>
            <textarea className="campo resize-none" rows={2} value={formCamino.descripcion} onChange={(e) => setFormCamino({ ...formCamino, descripcion: e.target.value })} />
          </div>
          <div className="rounded-lg border border-borde p-3">
            <p className="mb-2 text-sm font-semibold">Primer tramo</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="etiqueta">Estado</label>
                <select className="campo" value={formCamino.estadoId} onChange={(e) => setFormCamino({ ...formCamino, estadoId: e.target.value })}>
                  {estados.map((estado) => (
                    <option key={estado.id} value={estado.id}>
                      {estado.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="etiqueta">Observaciones</label>
                <input className="campo" value={formCamino.observaciones} onChange={(e) => setFormCamino({ ...formCamino, observaciones: e.target.value })} />
              </div>
            </div>
          </div>
          {error && <Aviso tipo="error">{error}</Aviso>}
          <div className="flex justify-end gap-2">
            <button className="boton-secundario" onClick={() => setModalCamino(false)}>
              Cancelar
            </button>
            <button className="boton-primario" onClick={guardarCamino} disabled={guardando || !formCamino.nombre || !formCamino.localidad || !formCamino.tipoViaId}>
              <Save size={16} /> {guardando ? 'Guardando…' : 'Guardar camino'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal abierto={modalPunto} titulo="Nuevo punto de interés" onCerrar={() => setModalPunto(false)}>
        <div className="space-y-3">
          <div>
            <label className="etiqueta">Nombre *</label>
            <input className="campo" value={formPunto.nombre} onChange={(e) => setFormPunto({ ...formPunto, nombre: e.target.value })} />
          </div>
          <div>
            <label className="etiqueta">Categoría</label>
            <select className="campo" value={formPunto.categoria} onChange={(e) => setFormPunto({ ...formPunto, categoria: e.target.value })}>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.clave}>
                  {categoria.nombre}
                </option>
              ))}
            </select>
          </div>
          {puntoNuevo && (
            <p className="text-xs text-suave">
              Coordenadas: {puntoNuevo[1].toFixed(5)}, {puntoNuevo[0].toFixed(5)}
            </p>
          )}
          {error && <Aviso tipo="error">{error}</Aviso>}
          <div className="flex justify-end gap-2">
            <button className="boton-secundario" onClick={() => setModalPunto(false)}>
              Cancelar
            </button>
            <button className="boton-primario" onClick={guardarPunto} disabled={guardando || !formPunto.nombre}>
              <MapPin size={16} /> Guardar punto
            </button>
          </div>
        </div>
      </Modal>

      <Modal abierto={modalInfra} titulo="Nueva infraestructura" onCerrar={() => setModalInfra(false)}>
        <div className="space-y-3">
          <div>
            <label className="etiqueta">Tipo</label>
            <select
              className="campo"
              value={formInfra.tipo}
              onChange={(e) => setFormInfra({ ...formInfra, tipo: e.target.value })}
            >
              {TIPOS_INFRAESTRUCTURA.map((tipo) => (
                <option key={tipo.valor} value={tipo.valor}>
                  {tipo.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="etiqueta">Camino asociado (opcional)</label>
            <select
              className="campo"
              value={formInfra.caminoId}
              onChange={(e) => setFormInfra({ ...formInfra, caminoId: e.target.value })}
            >
              <option value="">Sin camino asociado</option>
              {Array.from(
                new Map(
                  (tramosQuery.data?.features ?? []).map((feature) => [
                    feature.properties.caminoId,
                    feature.properties.camino,
                  ])
                ).values()
              ).map((camino) => (
                <option key={camino.id} value={camino.id}>
                  {camino.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="etiqueta">Descripción (opcional)</label>
            <input
              className="campo"
              value={formInfra.descripcion}
              onChange={(e) => setFormInfra({ ...formInfra, descripcion: e.target.value })}
            />
          </div>
          {puntoNuevo && (
            <p className="text-xs text-suave">
              Coordenadas: {puntoNuevo[1].toFixed(5)}, {puntoNuevo[0].toFixed(5)}
            </p>
          )}
          {error && <Aviso tipo="error">{error}</Aviso>}
          <div className="flex justify-end gap-2">
            <button className="boton-secundario" onClick={() => setModalInfra(false)}>
              Cancelar
            </button>
            <button className="boton-primario" onClick={guardarInfraestructura} disabled={guardando}>
              <Construction size={16} /> Guardar infraestructura
            </button>
          </div>
        </div>
      </Modal>

      <Modal abierto={Boolean(puntoSeleccionado)} titulo="Editar punto de interés" onCerrar={() => setPuntoSeleccionado(null)}>
        {puntoSeleccionado && (
          <div className="space-y-3">
            <div>
              <label className="etiqueta">Nombre *</label>
              <input
                className="campo"
                value={formPuntoEdicion.nombre}
                onChange={(e) => setFormPuntoEdicion({ ...formPuntoEdicion, nombre: e.target.value })}
              />
            </div>
            <div>
              <label className="etiqueta">Categoría</label>
              <select
                className="campo"
                value={formPuntoEdicion.categoria}
                onChange={(e) => setFormPuntoEdicion({ ...formPuntoEdicion, categoria: e.target.value })}
              >
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.clave}>
                    {categoria.nombre}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-suave">
              Coordenadas: {puntoSeleccionado.latitud.toFixed(5)}, {puntoSeleccionado.longitud.toFixed(5)}
            </p>
            {errorModal && <Aviso tipo="error">{errorModal}</Aviso>}
            <div className="flex flex-wrap justify-between gap-2">
              <button className="boton-peligro" onClick={eliminarPuntoSeleccionado} disabled={guardando}>
                <Trash2 size={16} /> Eliminar
              </button>
              <div className="flex gap-2">
                <button className="boton-secundario" onClick={() => setPuntoSeleccionado(null)}>
                  Cancelar
                </button>
                <button
                  className="boton-primario"
                  onClick={guardarPuntoSeleccionado}
                  disabled={guardando || !formPuntoEdicion.nombre}
                >
                  <Save size={16} /> Guardar
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        abierto={Boolean(infraSeleccionada)}
        titulo="Editar infraestructura"
        onCerrar={() => setInfraSeleccionada(null)}
      >
        {infraSeleccionada && (
          <div className="space-y-3">
            <div>
              <label className="etiqueta">Tipo</label>
              <select
                className="campo"
                value={formInfraEdicion.tipo}
                onChange={(e) => setFormInfraEdicion({ ...formInfraEdicion, tipo: e.target.value })}
              >
                {TIPOS_INFRAESTRUCTURA.map((tipo) => (
                  <option key={tipo.valor} value={tipo.valor}>
                    {tipo.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="etiqueta">Camino asociado (opcional)</label>
              <select
                className="campo"
                value={formInfraEdicion.caminoId}
                onChange={(e) => setFormInfraEdicion({ ...formInfraEdicion, caminoId: e.target.value })}
              >
                <option value="">Sin camino asociado</option>
                {Array.from(
                  new Map(
                    (tramosQuery.data?.features ?? []).map((feature) => [
                      feature.properties.caminoId,
                      feature.properties.camino,
                    ])
                  ).values()
                ).map((camino) => (
                  <option key={camino.id} value={camino.id}>
                    {camino.nombre}
                  </option>
                ))}
                {formInfraEdicion.caminoId &&
                  !Array.from(
                    new Map(
                      (tramosQuery.data?.features ?? []).map((feature) => [
                        feature.properties.caminoId,
                        feature.properties.camino,
                      ])
                    ).values()
                  ).some((camino) => camino.id === formInfraEdicion.caminoId) && (
                    <option value={formInfraEdicion.caminoId}>Camino actual (fuera del área visible)</option>
                  )}
              </select>
            </div>
            <div>
              <label className="etiqueta">Descripción (opcional)</label>
              <input
                className="campo"
                value={formInfraEdicion.descripcion}
                onChange={(e) => setFormInfraEdicion({ ...formInfraEdicion, descripcion: e.target.value })}
              />
            </div>
            {errorModal && <Aviso tipo="error">{errorModal}</Aviso>}
            <div className="flex flex-wrap justify-between gap-2">
              <button className="boton-peligro" onClick={eliminarInfraestructuraSeleccionada} disabled={guardando}>
                <Trash2 size={16} /> Eliminar
              </button>
              <div className="flex gap-2">
                <button className="boton-secundario" onClick={() => setInfraSeleccionada(null)}>
                  Cancelar
                </button>
                <button className="boton-primario" onClick={guardarInfraestructuraSeleccionada} disabled={guardando}>
                  <Save size={16} /> Guardar
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        abierto={Boolean(tramoSeleccionado)}
        titulo={tramoSeleccionado ? tramoSeleccionado.camino.nombre : 'Tramo'}
        onCerrar={() => setTramoSeleccionado(null)}
        ancho="max-w-2xl"
      >
        {tramoSeleccionado && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="chip text-white" style={{ backgroundColor: tramoSeleccionado.estado.colorHex }}>
                {tramoSeleccionado.estado.nombre}
              </span>
              <span className="chip bg-fondo text-suave">{formatearKm(tramoSeleccionado.longitudKm)}</span>
              <span className="chip bg-fondo text-suave">{tramoSeleccionado.camino.localidad}</span>
              {tramoSeleccionado.camino.departamento && (
                <span className="chip bg-fondo text-suave">{tramoSeleccionado.camino.departamento.nombre}</span>
              )}
            </div>

            <section className="space-y-3 rounded-lg border border-borde p-3">
              <h3 className="text-sm font-semibold">Datos del camino</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="etiqueta">Nombre *</label>
                  <input
                    className="campo"
                    value={formCaminoEdicion.nombre}
                    onChange={(e) => setFormCaminoEdicion({ ...formCaminoEdicion, nombre: e.target.value })}
                  />
                </div>
                <div>
                  <label className="etiqueta">Localidad *</label>
                  <input
                    className="campo"
                    value={formCaminoEdicion.localidad}
                    onChange={(e) => setFormCaminoEdicion({ ...formCaminoEdicion, localidad: e.target.value })}
                  />
                </div>
                <div>
                  <label className="etiqueta">Tipo de vía *</label>
                  <select
                    className="campo"
                    value={formCaminoEdicion.tipoViaId}
                    onChange={(e) => setFormCaminoEdicion({ ...formCaminoEdicion, tipoViaId: e.target.value })}
                  >
                    {tiposVia.map((tipo) => (
                      <option key={tipo.id} value={tipo.id}>
                        {tipo.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="etiqueta">Departamento</label>
                  <select
                    className="campo"
                    value={formCaminoEdicion.departamentoId}
                    onChange={(e) => setFormCaminoEdicion({ ...formCaminoEdicion, departamentoId: e.target.value })}
                  >
                    <option value="">Sin departamento</option>
                    {departamentos.map((depto) => (
                      <option key={depto.id} value={depto.id}>
                        {depto.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="etiqueta">Descripción</label>
                <textarea
                  className="campo resize-none"
                  rows={2}
                  value={formCaminoEdicion.descripcion}
                  onChange={(e) => setFormCaminoEdicion({ ...formCaminoEdicion, descripcion: e.target.value })}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={formCaminoEdicion.activo}
                    onChange={(e) => setFormCaminoEdicion({ ...formCaminoEdicion, activo: e.target.checked })}
                  />
                  Camino activo
                </label>
                <div className="flex gap-2">
                  <button className="boton-peligro" onClick={eliminarCamino} disabled={guardando}>
                    <Trash2 size={16} /> Eliminar camino
                  </button>
                  <button
                    className="boton-primario"
                    onClick={guardarDatosCamino}
                    disabled={
                      guardando ||
                      !formCaminoEdicion.nombre ||
                      !formCaminoEdicion.localidad ||
                      !formCaminoEdicion.tipoViaId
                    }
                  >
                    <Save size={16} /> Guardar datos
                  </button>
                </div>
              </div>
            </section>

            <section className="space-y-3 rounded-lg border border-borde p-3">
              <h3 className="text-sm font-semibold">Estado y observaciones</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="etiqueta">Estado</label>
                  <select className="campo" value={editEstadoId} onChange={(e) => setEditEstadoId(e.target.value)}>
                    {estados.map((estado) => (
                      <option key={estado.id} value={estado.id}>
                        {estado.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="etiqueta">Observaciones</label>
                  <input className="campo" value={editObservaciones} onChange={(e) => setEditObservaciones(e.target.value)} />
                </div>
              </div>
              <button className="boton-primario" onClick={guardarTramo} disabled={guardando}>
                <Save size={16} /> Guardar cambios
              </button>
            </section>

            <section className="space-y-3 rounded-lg border border-borde p-3">
              <h3 className="text-sm font-semibold">Dividir tramo</h3>
              <p className="text-xs text-suave">El km se mide desde el inicio del tramo (0 a {tramoSeleccionado.longitudKm.toFixed(3)}).</p>
              <div className="flex flex-wrap items-end gap-2">
                <div className="w-40">
                  <label className="etiqueta">Km de corte</label>
                  <input type="number" step="0.001" min="0" max={tramoSeleccionado.longitudKm} className="campo" value={splitKm} onChange={(e) => setSplitKm(e.target.value)} />
                </div>
                <button className="boton-secundario" onClick={dividirTramo} disabled={guardando || !splitKm}>
                  <Scissors size={16} /> Dividir
                </button>
              </div>
            </section>

            <section className="space-y-3 rounded-lg border border-borde p-3">
              <h3 className="text-sm font-semibold">Fusionar con tramo adyacente</h3>
              {candidatosFusion.length === 0 ? (
                <p className="text-xs text-suave">No hay otros tramos con el mismo estado en este camino.</p>
              ) : (
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[220px] flex-1">
                    <label className="etiqueta">Tramo</label>
                    <select className="campo" value={mergeId} onChange={(e) => setMergeId(e.target.value)}>
                      <option value="">Elegir tramo…</option>
                      {candidatosFusion.map((tramo) => (
                        <option key={tramo.id} value={tramo.id}>
                          #{tramo.id.slice(0, 8)} · {formatearKm(tramo.longitudKm)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button className="boton-secundario" onClick={fusionarTramo} disabled={guardando || !mergeId}>
                    Fusionar
                  </button>
                </div>
              )}
            </section>

            <section className="space-y-3 rounded-lg border border-borde p-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Wrench size={16} /> Registrar mantenimiento
              </h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="etiqueta">Tipo</label>
                  <select className="campo" value={mantenimiento.tipo} onChange={(e) => setMantenimiento({ ...mantenimiento, tipo: e.target.value })}>
                    {TIPOS_MANTENIMIENTO.map((tipo) => (
                      <option key={tipo.valor} value={tipo.valor}>
                        {tipo.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="etiqueta">Fecha</label>
                  <input type="date" className="campo" value={mantenimiento.fecha} onChange={(e) => setMantenimiento({ ...mantenimiento, fecha: e.target.value })} />
                </div>
                <div>
                  <label className="etiqueta">Costo (ARS)</label>
                  <input type="number" min="0" className="campo" value={mantenimiento.costo} onChange={(e) => setMantenimiento({ ...mantenimiento, costo: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="etiqueta">Descripción</label>
                <input className="campo" value={mantenimiento.descripcion} onChange={(e) => setMantenimiento({ ...mantenimiento, descripcion: e.target.value })} />
              </div>
              <button className="boton-secundario" onClick={guardarMantenimiento} disabled={guardando}>
                <Plus size={16} /> Agregar mantenimiento
              </button>
            </section>

            <section className="space-y-3 rounded-lg border border-borde p-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Camera size={16} /> Fotos
              </h3>
              <div>
                <label className="etiqueta">Descripción (opcional)</label>
                <input className="campo" value={fotoDescripcion} onChange={(e) => setFotoDescripcion(e.target.value)} />
              </div>
              <input
                ref={archivoFoto}
                type="file"
                accept="image/*"
                className="campo"
                disabled={subiendoFoto}
                onChange={(e) => {
                  const archivo = e.target.files?.[0];
                  if (archivo) void subirFoto(archivo);
                }}
              />
              {subiendoFoto && <p className="text-xs text-suave">Comprimiendo y subiendo…</p>}
              {(detalleQuery.data?.fotos ?? []).length > 0 && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {(detalleQuery.data?.fotos ?? []).map((foto) => (
                    <div key={foto.id} className="group relative overflow-hidden rounded-lg border border-borde">
                      <img src={foto.url} alt={foto.descripcion ?? 'Foto del camino'} className="h-28 w-full object-cover" />
                      <button
                        className="absolute right-1 top-1 rounded-md bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
                        onClick={() => eliminarFoto(foto.id)}
                        title="Eliminar foto"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {errorModal && <Aviso tipo="error">{errorModal}</Aviso>}

            <div className="flex justify-between gap-2">
              <button className="boton-peligro" onClick={eliminarTramo} disabled={guardando}>
                <Trash2 size={16} /> Eliminar tramo
              </button>
              <button className="boton-secundario" onClick={() => setTramoSeleccionado(null)}>
                Cerrar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
