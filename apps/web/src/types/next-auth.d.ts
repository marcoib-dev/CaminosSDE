import type { DefaultSession } from 'next-auth';
import type { Rol } from '@sde/shared';

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & { id: string; rol: Rol };
  }
  interface User {
    rol: Rol;
    activo: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    rol?: Rol;
  }
}
