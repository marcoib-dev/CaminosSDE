export { default } from 'next-auth/middleware';

export const config = {
  matcher: ['/carga/:path*', '/perfil/:path*', '/sugerencias/:path*', '/admin/:path*'],
};
