'use strict';
const { UsuarioRepositoryPort } = require('../../../../application/ports/out/UsuarioRepositoryPort');

const aUsuario = (f) => ({ id: f.id, rol: f.rol, activo: f.activo === 1, nombre: `${f.nombres} ${f.apellidos}` });

class SqliteUsuarioRepository extends UsuarioRepositoryPort {
  constructor(db) { super(); this.db = db; }

  async buscarPorId(id) {
    const f = this.db.prepare('SELECT id, nombres, apellidos, rol, activo FROM usuarios WHERE id=?').get(id);
    return f ? aUsuario(f) : null;
  }

  async listarDocentesActivos() {
    return this.db.prepare("SELECT id, nombres, apellidos, rol, activo FROM usuarios WHERE rol='docente' AND activo=1 ORDER BY nombres, apellidos")
      .all().map((f) => ({ id: f.id, nombre: `${f.nombres} ${f.apellidos}` }));
  }

  async buscarEstudiantePorCodigo(codigo) {
    const f = this.db.prepare(`SELECT u.id, u.nombres, u.apellidos, u.rol, u.activo
      FROM usuarios u JOIN perfiles_estudiante pe ON pe.usuario_id = u.id
      WHERE pe.codigo = ? AND u.rol = 'estudiante'`).get(codigo);
    return f ? aUsuario(f) : null;
  }
}
module.exports = { SqliteUsuarioRepository };
