'use strict';
// APLICACIÓN · Caso de uso: docentes disponibles para el selector "Tutor" del formulario.
const { CasoDeUsoPort } = require('../ports/in/CasoDeUsoPort');

class ListarDocentes extends CasoDeUsoPort {
  constructor({ usuarioRepo }) { super(); this.usuarioRepo = usuarioRepo; }
  async ejecutar() { return this.usuarioRepo.listarDocentesActivos(); }
}
module.exports = { ListarDocentes };
