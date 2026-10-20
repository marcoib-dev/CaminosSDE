import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';

export const validarBody = (schema: ZodTypeAny) => (req: Request, _res: Response, next: NextFunction) => {
  const resultado = schema.safeParse(req.body);
  if (!resultado.success) return next(resultado.error);
  req.body = resultado.data;
  next();
};

export const validarQuery = (schema: ZodTypeAny) => (req: Request, _res: Response, next: NextFunction) => {
  const resultado = schema.safeParse(req.query);
  if (!resultado.success) return next(resultado.error);
  req.consulta = resultado.data;
  next();
};
