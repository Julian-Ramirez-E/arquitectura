'use strict';
// APLICACIÓN · Caso de uso: cancelar (endpoint propio de la regla de negocio RN-03).
// OCP/DIP: no hay `if (rol === ...)`; la estrategia correcta la entrega el selector.
const { CasoDeUsoPort } = require('../ports/in/CasoDeUsoPort');
const { cargarTutoriaGestionable } = require('./cargarTutoriaGestionable');

class CancelarTutoria extends CasoDeUsoPort {
  constructor({ tutoriaRepo, notificador, reloj, selectorPolitica }) {
    super();
    Object.assign(this, { tutoriaRepo, notificador, reloj, selectorPolitica });
  }

  async ejecutar({ actor, id }) {
    const tutoria = await cargarTutoriaGestionable(this.tutoriaRepo, id, actor);
    tutoria.asegurarActiva('cancelar');                                      // RN-05
    this.selectorPolitica.para(actor.rol).verificar(tutoria, this.reloj.ahoraMs()); // RN-03 (Strategy)
    tutoria.cancelar();
    const guardada = await this.tutoriaRepo.guardar(tutoria);

    await this.notificador.notificar(guardada.contraparteDe(actor.id), {
      icono: '❌', titulo: 'Tutoría cancelada',
      descripcion: `${guardada.asignatura} del ${guardada.rango.fecha} a las ${guardada.rango.hora}`,
    });
    return guardada;
  }
}
module.exports = { CancelarTutoria };
