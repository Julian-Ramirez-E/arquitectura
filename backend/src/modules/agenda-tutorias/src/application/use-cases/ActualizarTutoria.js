'use strict';
// APLICACIÓN · Caso de uso: reprogramar/editar (PUT). Reprogramar equivale a cancelar + crear de nuevo, así que:
//   · reutiliza la MISMA estrategia de cancelación para exigir el plazo (RN-03) → DRY,
//   · reaplica RN-02, RN-04 y RN-01 sobre el nuevo horario (ignorando la propia tutoría).
const { CasoDeUsoPort } = require('../ports/in/CasoDeUsoPort');
const { cargarTutoriaGestionable } = require('./cargarTutoriaGestionable');
const { RangoHorario } = require('../../domain/value-objects/RangoHorario');
const reglas = require('../../domain/services/ReglasAgenda');

class ActualizarTutoria extends CasoDeUsoPort {
  constructor({ tutoriaRepo, notificador, reloj, selectorPolitica, horasAnticipacionMin }) {
    super();
    Object.assign(this, { tutoriaRepo, notificador, reloj, selectorPolitica, horasAnticipacionMin });
  }

  async ejecutar({ actor, id, cambios }) {
    const tutoria = await cargarTutoriaGestionable(this.tutoriaRepo, id, actor);
    tutoria.asegurarActiva('modificar');
    const ahora = this.reloj.ahoraMs();
    this.selectorPolitica.para(actor.rol).verificar(tutoria, ahora);                        // RN-03 (Strategy)

    const nuevoRango = new RangoHorario({
      fecha: cambios.fecha,
      hora: cambios.hora,
      duracionMin: cambios.duracionMin ?? tutoria.rango.duracionMin,
    });
    reglas.verificarHorarioInstitucional(nuevoRango);                                       // RN-04
    reglas.verificarAnticipacion(nuevoRango, ahora, this.horasAnticipacionMin);             // RN-02
    reglas.verificarSinSolapamiento(nuevoRango,                                             // RN-01
      await this.tutoriaRepo.buscarActivasDeDocenteEnFecha(tutoria.docenteId, nuevoRango.fecha), 'El docente', tutoria.id);
    reglas.verificarSinSolapamiento(nuevoRango,
      await this.tutoriaRepo.buscarActivasDeEstudianteEnFecha(tutoria.estudianteId, nuevoRango.fecha), 'El estudiante', tutoria.id);

    tutoria.reprogramar({
      rango: nuevoRango,
      asignatura: cambios.asignatura,
      modalidad: cambios.modalidad,
      observaciones: cambios.observaciones ?? tutoria.observaciones,
    });
    const guardada = await this.tutoriaRepo.guardar(tutoria);

    await this.notificador.notificar(guardada.contraparteDe(actor.id), {
      icono: '🔁', titulo: 'Tutoría reprogramada',
      descripcion: `${guardada.asignatura} ahora es el ${guardada.rango.fecha} a las ${guardada.rango.hora}`,
    });
    return guardada;
  }
}
module.exports = { ActualizarTutoria };
