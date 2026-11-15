'use strict';
// APLICACIÓN · PUERTO DE ENTRADA. Es lo único que los adaptadores de entrada (REST hoy; CLI o
// GraphQL mañana) conocen del núcleo. Cada caso de uso lo implementa con un solo método (ISP).
class CasoDeUsoPort {
  // eslint-disable-next-line no-unused-vars
  async ejecutar(comando) { throw new Error(`${this.constructor.name}.ejecutar() no implementado`); }
}
module.exports = { CasoDeUsoPort };
