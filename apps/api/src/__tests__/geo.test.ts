import { describe, expect, it } from 'vitest';
import { assertDentroDeProvincia, assertLineaValida, geojsonDeCoordenadas } from '../core/geo.js';
import { ApiError } from '../core/ApiError.js';

describe('validaciones geográficas', () => {
  it('acepta una línea dentro de Santiago del Estero', () => {
    expect(() =>
      assertLineaValida([
        [-63.45, -28.97],
        [-63.44, -28.98],
      ])
    ).not.toThrow();
  });

  it('rechaza una línea con menos de dos puntos', () => {
    expect(() => assertLineaValida([[-63.45, -28.97]])).toThrow(ApiError);
  });

  it('rechaza una línea con puntos repetidos', () => {
    expect(() =>
      assertLineaValida([
        [-63.45, -28.97],
        [-63.45, -28.97],
      ])
    ).toThrow(/dos puntos distintos/);
  });

  it('rechaza coordenadas fuera del área provincial', () => {
    expect(() => assertDentroDeProvincia([[-58.38, -34.6]])).toThrow(/fuera del área/);
  });

  it('serializa una línea como GeoJSON', () => {
    expect(JSON.parse(geojsonDeCoordenadas([[-63.4, -28.9], [-63.3, -28.8]]))).toEqual({
      type: 'LineString',
      coordinates: [
        [-63.4, -28.9],
        [-63.3, -28.8],
      ],
    });
  });
});
