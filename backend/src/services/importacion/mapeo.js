/**
 * Mapeo de atributos del archivo importado a los campos del dominio.
 * Los nombres de campo y los valores se comparan sin distinguir mayúsculas,
 * acentos ni separadores.
 */

export const ESTADO_POR_DEFECTO = 'REGULAR';
export const TIPO_POR_DEFECTO = 'TIERRA';

export const CAMPOS_NOMBRE = ['nombre', 'name', 'camino', 'ruta', 'denominacion', 'via', 'tramo'];
export const CAMPOS_LOCALIDAD = ['localidad', 'municipio', 'pueblo', 'paraje', 'ciudad'];
export const CAMPOS_DEPARTAMENTO = ['departamento', 'dpto', 'depto', 'partido'];
export const CAMPOS_ESTADO = [
  'estado',
  'estado_camino',
  'estado_via',
  'condicion',
  'transitabilidad',
  'situacion',
];
export const CAMPOS_TIPO = [
  'tipo',
  'tipo_camino',
  'tipo_superficie',
  'superficie',
  'material',
  'calzada',
];

const ESTADOS_VALIDOS = new Set(['TRANSITABLE', 'REGULAR', 'INTRANSITABLE', 'EN_OBRA']);
const TIPOS_VALIDOS = new Set(['TIERRA', 'RIPIO', 'ENRIPIADO_MEJORADO', 'PAVIMENTADO']);

const CATALOGO_ESTADO = {
  transitable: 'TRANSITABLE',
  bueno: 'TRANSITABLE',
  buena: 'TRANSITABLE',
  optimo: 'TRANSITABLE',
  optima: 'TRANSITABLE',
  apto: 'TRANSITABLE',
  bien: 'TRANSITABLE',
  regular: 'REGULAR',
  aceptable: 'REGULAR',
  con_precaucion: 'REGULAR',
  intransitable: 'INTRANSITABLE',
  malo: 'INTRANSITABLE',
  mala: 'INTRANSITABLE',
  cortado: 'INTRANSITABLE',
  no_transitable: 'INTRANSITABLE',
  inhabilitado: 'INTRANSITABLE',
  en_obra: 'EN_OBRA',
  obra: 'EN_OBRA',
  en_construccion: 'EN_OBRA',
  construccion: 'EN_OBRA',
};

const CATALOGO_TIPO = {
  tierra: 'TIERRA',
  suelo_natural: 'TIERRA',
  natural: 'TIERRA',
  ripio: 'RIPIO',
  grava: 'RIPIO',
  enripiado: 'ENRIPIADO_MEJORADO',
  enripiado_mejorado: 'ENRIPIADO_MEJORADO',
  mejorado: 'ENRIPIADO_MEJORADO',
  pavimentado: 'PAVIMENTADO',
  pavimento: 'PAVIMENTADO',
  asfalto: 'PAVIMENTADO',
  asfaltado: 'PAVIMENTADO',
};

/**
 * Normaliza un texto para comparar: minúsculas, sin acentos y con `_`.
 */
export function normalizarClave(texto) {
  return String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function valorDeCampo(atributos, campo) {
  const buscado = normalizarClave(campo);

  for (const [clave, valor] of Object.entries(atributos ?? {})) {
    if (normalizarClave(clave) !== buscado) continue;
    if (valor === null || valor === undefined || valor === '') continue;
    return valor;
  }

  return null;
}

function primerValor(atributos, campos) {
  for (const campo of campos) {
    const valor = valorDeCampo(atributos, campo);
    if (valor !== null) return valor;
  }
  return null;
}

function resolverValor(valor, regla, catalogo, validos) {
  if (valor === null || valor === undefined || valor === '') return null;

  const clave = normalizarClave(valor);

  if (regla?.valores && Object.prototype.hasOwnProperty.call(regla.valores, clave)) {
    return regla.valores[clave];
  }

  if (Object.prototype.hasOwnProperty.call(catalogo, clave)) {
    return catalogo[clave];
  }

  const directo = String(valor).trim().toUpperCase();
  if (validos.has(directo)) return directo;

  return null;
}

/**
 * Convierte la configuración de mapeo recibida en reglas normalizadas.
 */
export function normalizarMapeo(mapeo) {
  const normalizarRegla = (regla) => {
    if (!regla) return null;

    const valores = {};
    for (const [clave, valor] of Object.entries(regla.valores ?? {})) {
      valores[normalizarClave(clave)] = valor;
    }

    return {
      campo: regla.campo ?? null,
      valores,
      porDefecto: regla.porDefecto ?? null,
    };
  };

  return {
    estado: normalizarRegla(mapeo?.estado),
    tipo: normalizarRegla(mapeo?.tipo),
  };
}

export function inferirEstado(atributos, regla) {
  const valor = regla?.campo
    ? valorDeCampo(atributos, regla.campo)
    : primerValor(atributos, CAMPOS_ESTADO);

  return (
    resolverValor(valor, regla, CATALOGO_ESTADO, ESTADOS_VALIDOS) ??
    regla?.porDefecto ??
    ESTADO_POR_DEFECTO
  );
}

export function inferirTipo(atributos, regla) {
  const valor = regla?.campo
    ? valorDeCampo(atributos, regla.campo)
    : primerValor(atributos, CAMPOS_TIPO);

  return (
    resolverValor(valor, regla, CATALOGO_TIPO, TIPOS_VALIDOS) ??
    regla?.porDefecto ??
    TIPO_POR_DEFECTO
  );
}

export function inferirNombre(atributos) {
  const valor = primerValor(atributos, CAMPOS_NOMBRE);
  return valor === null ? null : String(valor).trim();
}

export function inferirLocalidad(atributos) {
  const valor = primerValor(atributos, CAMPOS_LOCALIDAD);
  return valor === null ? null : String(valor).trim();
}

export function inferirDepartamento(atributos) {
  const valor = primerValor(atributos, CAMPOS_DEPARTAMENTO);
  return valor === null ? null : String(valor).trim();
}
