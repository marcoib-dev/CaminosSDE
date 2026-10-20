export function featureCollection<T extends { id: string; geom?: unknown; geometria?: unknown }>(
  items: T[],
  propiedades: (item: T) => Record<string, unknown>
) {
  return {
    type: 'FeatureCollection' as const,
    features: items.map((item) => ({
      type: 'Feature' as const,
      id: item.id,
      geometry: (item.geom ?? item.geometria ?? null) as never,
      properties: propiedades(item),
    })),
  };
}
