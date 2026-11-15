'use strict';
// APLICACIÓN · Eliminación física: solo administración (el flujo normal de usuarios es CANCELAR, que conserva historial).
const { CasoDeUsoPort } = require('../ports/in/CasoDeUsoPort');
const { ProhibidoError, NoEncontradoError } = require('../../domain/errors/ErroresDominio');
const { Rol } = require('../../domain/value-objects/Catalogos');

class EliminarTutoria extends CasoDeUsoPort {
  constructor({ tutoriaRepo }) { super(); this.tutoriaRepo = tutoriaRepo; }

  async ejecutar({ actor, id }) {
    if (actor.rol !== Rol.ADMIN) throw new ProhibidoError('Solo un administrador puede eliminar tutorías; usa "cancelar"');
    const existia = await this.tutoriaRepo.eliminar(id);
    if (!existia) throw new NoEncontradoError(`La tutoría ${id} no existe`);
  }
}
module.exports = { EliminarTutoria };
