'use strict';
const { CasoDeUsoPort } = require('../ports/in/CasoDeUsoPort');
const { cargarTutoriaGestionable } = require('./cargarTutoriaGestionable');
const { ProhibidoError } = require('../../domain/errors/ErroresDominio');
const { Rol } = require('../../domain/value-objects/Catalogos');

class RealizarTutoria extends CasoDeUsoPort {
  constructor({ tutoriaRepo, reloj }) { super(); Object.assign(this, { tutoriaRepo, reloj }); }

  async ejecutar({ actor, id }) {
    const tutoria = await cargarTutoriaGestionable(this.tutoriaRepo, id, actor);
    if (actor.rol !== Rol.ADMIN && !tutoria.esDocenteDe(actor)) {
      throw new ProhibidoError('Solo el docente asignado puede marcar la tutoría como realizada');
    }
    tutoria.completar(this.reloj.ahoraMs());                                   // RN-05 / RN-06
    return this.tutoriaRepo.guardar(tutoria);
  }
}
module.exports = { RealizarTutoria };
