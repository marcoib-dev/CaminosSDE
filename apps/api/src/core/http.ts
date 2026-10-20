import type { Response } from 'express';

export const ok = <T>(res: Response, datos: T) => res.json({ datos });
export const created = <T>(res: Response, datos: T, mensaje?: string) =>
  res.status(201).json(mensaje ? { datos, mensaje } : { datos });
export const mensaje = (res: Response, texto: string) => res.json({ mensaje: texto });
