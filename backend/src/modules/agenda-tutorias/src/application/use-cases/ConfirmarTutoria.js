'use strict';
const { CasoDeUsoPort } = require('../ports/in/CasoDeUsoPort');
const { cargarTutoriaGestionable } = require('./cargarTutoriaGestionable');
const { ProhibidoError } = require('../../domain/errors/ErroresDominio');
const { Rol } = require('../../domain/value-objects/Catalogos');

class ConfirmarTutoria extends CasoDeUsoPort {
  constructor({ tutoriaRepo, notificador }) { super(); Object.assign(this, { tutoriaRepo, notificador }); }

  async ejecutar({ actor, id }) {
    const tutoria = await cargarTutoriaGestionable(this.tutoriaRepo, id, actor);
    if (actor.rol !== Rol.ADMIN && !tutoria.esDocenteDe(actor)) {
      throw new ProhibidoError('Solo el docente asignado puede confirmar la tutoría');
    }
    tutoria.confirmar();
    const guardada = await this.tutoriaRepo.guardar(tutoria);
    await this.notificador.notificar(guardada.estudianteId, {
      icono: '✅', titulo: 'Tutoría confirmada',
      descripcion: `${guardada.asignatura} el ${guardada.rango.fecha} a las ${guardada.rango.hora}`,
    });
    return guardada;
  }
}
module.exports = { ConfirmarTutoria };
