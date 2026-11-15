'use strict';
// DOMINIO · Excepciones propias del negocio. No saben nada de HTTP:
// la capa de infraestructura es quien las traduce a códigos de estado (SRP).

class ErrorDominio extends Error {
  constructor(mensaje, codigo) {
    super(mensaje);
    this.name = this.constructor.name;
    this.codigo = codigo;
  }
}

/** Datos mal formados o inválidos (→ 400). */
class ValidacionError extends ErrorDominio {
  constructor(mensaje, detalles = []) {
    super(mensaje, 'VALIDACION');
    this.detalles = detalles; // [{ campo, mensaje }]
  }
}

/** El actor no tiene permiso sobre el recurso (→ 403). */
class ProhibidoError extends ErrorDominio {
  constructor(mensaje = 'No tienes permiso para esta operación') {
    super(mensaje, 'PROHIBIDO');
  }
}

/** El recurso no existe (→ 404). */
class NoEncontradoError extends ErrorDominio {
  constructor(mensaje) {
    super(mensaje, 'NO_ENCONTRADO');
  }
}

/** Se violó una regla de negocio (→ 409). El código es RN-01 … RN-06. */
class ReglaNegocioError extends ErrorDominio {
  constructor(mensaje, codigoRegla) {
    super(mensaje, codigoRegla);
  }
}

module.exports = { ErrorDominio, ValidacionError, ProhibidoError, NoEncontradoError, ReglaNegocioError };
