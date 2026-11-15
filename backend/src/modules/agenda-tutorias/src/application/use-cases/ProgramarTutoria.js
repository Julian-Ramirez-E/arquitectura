'use strict';
// APLICACIÓN · Caso de uso: programar/solicitar una tutoría. Orquesta; NO contiene reglas propias:
// delega en TutoriaFactory (creación), ReglasAgenda (RN-01/02/04) y los puertos (persistencia, aviso).
const { CasoDeUsoPort } = require('../ports/in/CasoDeUsoPort');
const { TutoriaFactory } = require('../../domain/factories/TutoriaFactory');
const reglas = require('../../domain/services/ReglasAgenda');
const { NoEncontradoError, ValidacionError } = require('../../domain/errors/ErroresDominio');
const { Rol, EstadoTutoria } = require('../../domain/value-objects/Catalogos');

class ProgramarTutoria extends CasoDeUsoPort {
  // DIP: todas las dependencias llegan por constructor y son PUERTOS, no clases concretas.
  constructor({ tutoriaRepo, usuarioRepo, notificador, reloj, horasAnticipacionMin }) {
    super();
    Object.assign(this, { tutoriaRepo, usuarioRepo, notificador, reloj, horasAnticipacionMin });
  }

  async ejecutar({ actor, datos }) {
    const tutoria = TutoriaFactory.crear({ actor, ...(await this.#resolverEstudiante(actor, datos)) });

    await this.#exigirUsuario(tutoria.estudianteId, Rol.ESTUDIANTE, 'estudiante');
    await this.#exigirUsuario(tutoria.docenteId, Rol.DOCENTE, 'docente');

    reglas.verificarHorarioInstitucional(tutoria.rango);                                   // RN-04
    reglas.verificarAnticipacion(tutoria.rango, this.reloj.ahoraMs(), this.horasAnticipacionMin); // RN-02
    reglas.verificarSinSolapamiento(                                                       // RN-01 (docente)
      tutoria.rango, await this.tutoriaRepo.buscarActivasDeDocenteEnFecha(tutoria.docenteId, tutoria.rango.fecha), 'El docente');
    reglas.verificarSinSolapamiento(                                                       // RN-01 (estudiante)
      tutoria.rango, await this.tutoriaRepo.buscarActivasDeEstudianteEnFecha(tutoria.estudianteId, tutoria.rango.fecha), 'El estudiante');

    const guardada = await this.tutoriaRepo.guardar(tutoria);

    const pendiente = guardada.estado === EstadoTutoria.PENDIENTE;
    const detalle = `${guardada.asignatura} el ${guardada.rango.fecha} a las ${guardada.rango.hora}`;
    await this.notificador.notificar(guardada.estudianteId, {
      icono: '📅', titulo: pendiente ? 'Tutoría solicitada' : 'Tutoría programada', descripcion: detalle,
    });
    await this.notificador.notificar(guardada.docenteId, {
      icono: '📅', titulo: pendiente ? 'Nueva solicitud de tutoría' : 'Nueva tutoría asignada', descripcion: detalle,
    });
    return guardada;
  }

  /** El docente (en la UI) identifica al estudiante por su CÓDIGO institucional; aquí se traduce a id. */
  async #resolverEstudiante(actor, datos) {
    if (actor.rol === Rol.ESTUDIANTE || datos.estudianteId != null || !datos.estudianteCodigo) return datos;
    const estudiante = await this.usuarioRepo.buscarEstudiantePorCodigo(datos.estudianteCodigo);
    if (!estudiante) throw new NoEncontradoError(`No existe un estudiante con código ${datos.estudianteCodigo}`);
    return { ...datos, estudianteId: estudiante.id };
  }

  async #exigirUsuario(id, rolEsperado, etiqueta) {
    const usuario = await this.usuarioRepo.buscarPorId(id);
    if (!usuario) throw new NoEncontradoError(`No existe el ${etiqueta} con id ${id}`);
    if (usuario.rol !== rolEsperado || !usuario.activo) {
      throw new ValidacionError(`El usuario ${id} no es un ${etiqueta} activo`, [{ campo: `${etiqueta}_id`, mensaje: `Debe ser un ${etiqueta} activo` }]);
    }
  }
}

module.exports = { ProgramarTutoria };
