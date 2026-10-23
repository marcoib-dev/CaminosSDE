// Aplica el tema antes del primer pintado para evitar el destello claro.
// Se carga como archivo externo (public/tema.js) para que la CSP de Nginx
// pueda usar script-src 'self' sin 'unsafe-inline'.
(function () {
  try {
    var guardado = localStorage.getItem('caminos-rurales-tema');
    var oscuro =
      guardado === 'oscuro' ||
      (!guardado && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (oscuro) document.documentElement.classList.add('dark');
  } catch (error) {
    /* Sin localStorage se mantiene el tema claro. */
  }
})();
