'use strict';
// APLICACIÓN · Caso de uso: ¿a qué horas está libre un docente? Reutiliza las mismas reglas que "programar".
const { CasoDeUsoPort } = require('../ports/in/CasoDeUsoPort');
const { NoEncontradoError, ValidacionError } = require('../../domain/errors/ErroresDominio');
const { RangoHorario } = require('../../domain/value-objects/RangoHorario');
const { Rol } = require('../../domain/value-objects/Catalogos');
const reglas = require('../../domain/services/ReglasAgenda');

class ConsultarDisponibilidad extends CasoDeUsoPort {
  constructor({ tutoriaRepo, usuarioRepo, reloj, horasAnticipacionMin }) {
    super();
    Object.assign(this, { tutoriaRepo, usuarioRepo, reloj, horasAnticipacionMin });
  }

  async ejecutar({ docenteId, fecha, duracionMin }) {
    const errores = RangoHorario.errores({ fecha, hora: '08:00', duracionMin });
    if (errores.length) throw new ValidacionError('Parámetros inválidos', errores.filter((e) => e.campo !== 'hora'));

    const docente = await this.usuarioRepo.buscarPorId(docenteId);
    if (!docente || docente.rol !== Rol.DOCENTE) throw new NoEncontradoError(`No existe el docente con id ${docenteId}`);

    const tutoriasDelDia = await this.tutoriaRepo.buscarActivasDeDocenteEnFecha(docenteId, fecha);
    return {
      docenteId, fecha, duracionMin,
      horariosLibres: reglas.calcularHuecosLibres({
        fecha, duracionMin, tutoriasDelDia, ahoraMs: this.reloj.ahoraMs(), horasAnticipacion: this.horasAnticipacionMin,
      }),
    };
  }
}
module.exports = { ConsultarDisponibilidad };
