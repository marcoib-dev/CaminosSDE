import type { Request } from 'express';

export const contexto = (req: Request) => ({
  usuarioId: req.usuario?.id ?? null,
  ip: req.ip ?? null,
});

export const consulta = <T>(req: Request) => req.consulta as T;
