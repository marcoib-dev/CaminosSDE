import type {
  AccionAuditoria,
  EstadoSugerencia,
  EstadoTramoClave,
  Rol,
  TipoInfraestructura,
  TipoMantenimiento,
} from './enums.js';
import type { LineStringGeoJSON, PointGeoJSON } from './geo.js';

export interface UsuarioDTO {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

export interface DepartamentoDTO {
  id: string;
  nombre: string;
  codigoIndec: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface TipoViaDTO {
  id: string;
  clave: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  activo: boolean;
}

export interface EstadoTramoDTO {
  id: string;
  clave: EstadoTramoClave | string;
  nombre: string;
  colorHex: string;
  orden: number;
  activo: boolean;
}

export interface TramoDTO {
  id: string;
  caminoId: string;
  geometria: LineStringGeoJSON;
  longitudKm: number;
  estadoId: string;
  estado: EstadoTramoDTO;
  observaciones: string | null;
  version: number;
  creadoEn: string;
  actualizadoEn: string;
}

export interface CaminoDTO {
  id: string;
  nombre: string;
  localidad: string;
  tipoViaId: string;
  tipoVia: TipoViaDTO;
  departamentoId: string | null;
  departamento: DepartamentoDTO | null;
  descripcion: string | null;
  activo: boolean;
  geom: LineStringGeoJSON | null;
  longitudKm: number;
  creadoEn: string;
  actualizadoEn: string;
  tramos?: TramoDTO[];
}

export interface MantenimientoDTO {
  id: string;
  tramoId: string;
  tipo: TipoMantenimiento;
  descripcion: string | null;
  fecha: string;
  costo: number | null;
  usuarioId: string | null;
  usuario: Pick<UsuarioDTO, 'id' | 'nombre' | 'email'> | null;
  creadoEn: string;
}

export interface FotoDTO {
  id: string;
  url: string;
  descripcion: string | null;
  caminoId: string;
  tramoId: string | null;
  mantenimientoId: string | null;
  creadoEn: string;
}

export interface InfraestructuraDTO {
  id: string;
  tipo: TipoInfraestructura;
  geom: PointGeoJSON;
  caminoId: string | null;
  descripcion: string | null;
  creadoEn: string;
}

export interface CategoriaPuntoDTO {
  id: string;
  clave: string;
  nombre: string;
  color: string;
  inicial: string;
  peso: number;
  orden: number;
  protegida: boolean;
  totalPuntos?: number;
}

export interface PuntoInteresDTO {
  id: string;
  nombre: string;
  categoria: string;
  categoriaPunto: CategoriaPuntoDTO;
  latitud: number;
  longitud: number;
  creadoEn: string;
  actualizadoEn: string;
}

export interface SugerenciaDTO {
  id: string;
  texto: string;
  contacto: string | null;
  estado: EstadoSugerencia;
  caminoId: string | null;
  tramoId: string | null;
  revisadoPorId: string | null;
  revisadoEn: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface AuditoriaDTO {
  id: string;
  usuarioId: string | null;
  usuario: Pick<UsuarioDTO, 'id' | 'nombre' | 'email'> | null;
  accion: AccionAuditoria;
  entidad: string;
  entidadId: string | null;
  detalle: unknown;
  ip: string | null;
  fecha: string;
}

export interface CapaDTO {
  id: string;
  clave: string;
  nombre: string;
  organismo: string;
  activa: boolean;
}

export interface PermisoCapaDTO {
  id: string;
  rol: Rol;
  capaId: string;
  capa: CapaDTO;
  puedeVer: boolean;
  puedeCrear: boolean;
  puedeEditar: boolean;
  puedeBorrar: boolean;
}

export interface FeatureCollectionDTO<P = Record<string, unknown>> {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    id?: string;
    geometry: LineStringGeoJSON | PointGeoJSON | null;
    properties: P;
  }>;
}

export interface PrioridadDTO {
  id: string;
  caminoId: string;
  longitudKm: number;
  estadoId: string;
  estado: EstadoTramoClave;
  estadoNombre: string;
  estadoColor: string;
  caminoNombre: string;
  localidad: string;
  tipoVia: string;
  observaciones: string | null;
  geometria: LineStringGeoJSON;
  puntajeEstado: number;
  puntajeTipo: number;
  puntajeCercania: number;
  puntaje: number;
}
