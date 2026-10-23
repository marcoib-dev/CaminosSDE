/**
 * Traduce los parámetros `pagina` y `limite` (ya validados) a las opciones que
 * espera Prisma y arma la respuesta con los metadatos de paginación.
 */
export function opcionesPrisma(consulta) {
  const { pagina, limite } = consulta;
  return { skip: (pagina - 1) * limite, take: limite };
}

export function respuestaPaginada(datos, consulta, total) {
  const { pagina, limite } = consulta;

  return {
    datos,
    paginacion: {
      pagina,
      limite,
      total,
      totalPaginas: total === 0 ? 0 : Math.ceil(total / limite),
    },
  };
}
