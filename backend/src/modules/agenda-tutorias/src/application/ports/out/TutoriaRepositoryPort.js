'use strict';
// APLICACIÓN · PUERTO DE SALIDA (patrón Repository). El núcleo depende de ESTA abstracción (DIP),
// no de SQLite. Trabaja con entidades de dominio, jamás con filas SQL.
class TutoriaRepositoryPort {
  /** Inserta (id null) o actualiza. Devuelve la tutoría persistida con su id. */
  // eslint-disable-next-line no-unused-vars
  async guardar(tutoria) { throw new Error('no implementado'); }
  /** @returns {Promise<Tutoria|null>} */
  // eslint-disable-next-line no-unused-vars
  async buscarPorId(id) { throw new Error('no implementado'); }
  /** Filtra por { estudianteId?, docenteId?, estado?, fecha? }. */
  // eslint-disable-next-line no-unused-vars
  async listar(filtros) { throw new Error('no implementado'); }
  /** Tutorías ACTIVAS (pendiente/confirmada) del docente en esa fecha. */
  // eslint-disable-next-line no-unused-vars
  async buscarActivasDeDocenteEnFecha(docenteId, fecha) { throw new Error('no implementado'); }
  /** Tutorías ACTIVAS del estudiante en esa fecha. */
  // eslint-disable-next-line no-unused-vars
  async buscarActivasDeEstudianteEnFecha(estudianteId, fecha) { throw new Error('no implementado'); }
  /** @returns {Promise<boolean>} true si existía. */
  // eslint-disable-next-line no-unused-vars
  async eliminar(id) { throw new Error('no implementado'); }
}
module.exports = { TutoriaRepositoryPort };
