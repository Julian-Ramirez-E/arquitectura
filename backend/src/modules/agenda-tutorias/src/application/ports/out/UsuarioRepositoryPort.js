'use strict';
// APLICACIÓN · PUERTO DE SALIDA. El módulo de agenda solo necesita SABER si un usuario existe y qué rol tiene.
// (ISP: solo 3 consultas de LECTURA; el CRUD de usuarios pertenece a otro módulo.)
class UsuarioRepositoryPort {
  /** @returns {Promise<{id:number, rol:string, activo:boolean, nombre:string}|null>} */
  // eslint-disable-next-line no-unused-vars
  async buscarPorId(id) { throw new Error('no implementado'); }
  /** Docentes activos para poblar el selector de tutor. @returns {Promise<Array<{id:number, nombre:string}>>} */
  async listarDocentesActivos() { throw new Error('no implementado'); }
  /** Resuelve el código institucional ("2024001234") a un estudiante. @returns {Promise<{id:number, rol:string, activo:boolean, nombre:string}|null>} */
  // eslint-disable-next-line no-unused-vars
  async buscarEstudiantePorCodigo(codigo) { throw new Error('no implementado'); }
}
module.exports = { UsuarioRepositoryPort };
