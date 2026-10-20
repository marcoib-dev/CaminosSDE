import { createContext, useContext, useEffect, useState } from 'react';

const CLAVE_TEMA = 'caminos-rurales-tema';
const TemaContext = createContext(null);

function temaInicial() {
  try {
    const guardado = localStorage.getItem(CLAVE_TEMA);
    if (guardado === 'claro' || guardado === 'oscuro') return guardado;
  } catch {
    // Sin acceso a localStorage se usa la preferencia del sistema.
  }

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
}

export function TemaProvider({ children }) {
  const [tema, setTema] = useState(temaInicial);

  useEffect(() => {
    const oscuro = tema === 'oscuro';
    document.documentElement.classList.toggle('dark', oscuro);
    document.documentElement.style.colorScheme = oscuro ? 'dark' : 'light';
    localStorage.setItem(CLAVE_TEMA, tema);
  }, [tema]);

  const alternarTema = () => {
    setTema((actual) => (actual === 'oscuro' ? 'claro' : 'oscuro'));
  };

  return (
    <TemaContext.Provider value={{ tema, esOscuro: tema === 'oscuro', alternarTema }}>
      {children}
    </TemaContext.Provider>
  );
}

export function useTema() {
  const contexto = useContext(TemaContext);
  if (!contexto) {
    throw new Error('useTema debe usarse dentro de TemaProvider.');
  }
  return contexto;
}
