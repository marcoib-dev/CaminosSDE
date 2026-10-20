export class ApiError extends Error {
  constructor(status, mensaje, detalles = undefined) {
    super(mensaje);
    this.name = 'ApiError';
    this.status = status;
    this.mensaje = mensaje;
    this.detalles = detalles;
  }
}
