import { describe, expect, it } from 'vitest';
import { caminoCreateSchema, operacionSyncSchema, tramoCreateSchema } from '@sde/shared';
import { featureCollection } from '../core/features.js';

describe('contratos compartidos', () => {
  it('valida un camino con geometría LineString', () => {
    const resultado = caminoCreateSchema.safeParse({
      nombre: 'Camino de prueba',
      localidad: 'Añatuya',
      tipoViaId: 'tipo-rural',
      geom: { type: 'LineString', coordinates: [[-62.8, -28.4], [-62.7, -28.3]] },
    });
    expect(resultado.success).toBe(true);
  });

  it('rechaza un camino sin geometría', () => {
    const resultado = caminoCreateSchema.safeParse({
      nombre: 'Camino sin geometría',
      localidad: 'Añatuya',
      tipoViaId: 'tipo-rural',
    });
    expect(resultado.success).toBe(false);
  });

  it('valida un tramo con estado opcional', () => {
    const resultado = tramoCreateSchema.safeParse({
      geometria: { type: 'LineString', coordinates: [[-62.8, -28.4], [-62.7, -28.3]] },
    });
    expect(resultado.success).toBe(true);
  });

  it('acepta la operación de fusión offline', () => {
    const resultado = operacionSyncSchema.safeParse({
      id: 'operacion-123',
      tipo: 'FUSIONAR_TRAMO',
      payload: { tramoId: 'a', tramoAdyacenteId: 'b' },
    });
    expect(resultado.success).toBe(true);
  });
});

describe('FeatureCollection', () => {
  it('convierte tramos en features con geometría y propiedades', () => {
    const coleccion = featureCollection(
      [
        {
          id: 'tramo-1',
          geometria: { type: 'LineString', coordinates: [[-63, -28], [-62, -27]] },
          longitudKm: 10,
        },
      ],
      ({ geometria: _geometria, ...resto }) => resto as Record<string, unknown>
    );

    expect(coleccion.type).toBe('FeatureCollection');
    expect(coleccion.features[0]?.id).toBe('tramo-1');
    expect(coleccion.features[0]?.geometry).toEqual({
      type: 'LineString',
      coordinates: [[-63, -28], [-62, -27]],
    });
    expect(coleccion.features[0]?.properties).toEqual({ id: 'tramo-1', longitudKm: 10 });
  });
});
