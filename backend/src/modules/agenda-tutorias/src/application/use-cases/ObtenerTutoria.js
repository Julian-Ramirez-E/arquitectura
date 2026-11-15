'use strict';
const { CasoDeUsoPort } = require('../ports/in/CasoDeUsoPort');
const { cargarTutoriaGestionable } = require('./cargarTutoriaGestionable');

class ObtenerTutoria extends CasoDeUsoPort {
  constructor({ tutoriaRepo }) { super(); this.tutoriaRepo = tutoriaRepo; }
  async ejecutar({ actor, id }) { return cargarTutoriaGestionable(this.tutoriaRepo, id, actor); }
}
module.exports = { ObtenerTutoria };
