'use strict';
// INFRAESTRUCTURA · ADAPTADOR DE SALIDA que implementa TutoriaRepositoryPort con SQLite.
// Solo traduce fila ⇄ entidad. CERO reglas de negocio: ni solapes, ni plazos, ni permisos.
const { TutoriaRepositoryPort } = require('../../../../application/ports/out/TutoriaRepositoryPort');
const { Tutoria } = require('../../../../domain/entities/Tutoria');
const { RangoHorario } = require('../../../../domain/value-objects/RangoHorario');
const { ESTADOS_ACTIVOS } = require('../../../../domain/value-objects/Catalogos');

const LIMITE_LISTADO = 200;
const ACTIVOS_SQL = ESTADOS_ACTIVOS.map((e) => `'${e}'`).join(','); // constantes de dominio, no input del usuario

class SqliteTutoriaRepository extends TutoriaRepositoryPort {
  constructor(db) { super(); this.db = db; }

  #aEntidad(fila) {
    return new Tutoria({
      id: fila.id,
      estudianteId: fila.estudiante_id,
      docenteId: fila.docente_id,
      asignatura: fila.asignatura,
      modalidad: fila.modalidad,
      rango: new RangoHorario({ fecha: fila.fecha, hora: fila.hora, duracionMin: fila.duracion_min }),
      estado: fila.estado,
      observaciones: fila.observaciones ?? '',
      creadaEn: fila.creada_en,
    });
  }

  async guardar(t) {
    let id = t.id;
    if (id == null) {
      id = Number(this.db.prepare(`
        INSERT INTO tutorias (estudiante_id, docente_id, asignatura, fecha, hora, duracion_min, modalidad, estado, observaciones)
        VALUES (?,?,?,?,?,?,?,?,?)`).run(
        t.estudianteId, t.docenteId, t.asignatura, t.rango.fecha, t.rango.hora, t.rango.duracionMin,
        t.modalidad, t.estado, t.observaciones).lastInsertRowid);
    } else {
      this.db.prepare(`
        UPDATE tutorias SET asignatura=?, fecha=?, hora=?, duracion_min=?, modalidad=?, estado=?, observaciones=?
        WHERE id=?`).run(t.asignatura, t.rango.fecha, t.rango.hora, t.rango.duracionMin, t.modalidad, t.estado, t.observaciones, id);
    }
    return this.buscarPorId(id);
  }

  async buscarPorId(id) {
    const fila = this.db.prepare('SELECT * FROM tutorias WHERE id=?').get(id);
    return fila ? this.#aEntidad(fila) : null;
  }

  async listar({ estudianteId, docenteId, estado, fecha } = {}) {
    const condiciones = [];
    const params = [];
    if (estudianteId != null) { condiciones.push('estudiante_id=?'); params.push(estudianteId); }
    if (docenteId != null) { condiciones.push('docente_id=?'); params.push(docenteId); }
    if (estado) { condiciones.push('estado=?'); params.push(estado); }
    if (fecha) { condiciones.push('fecha=?'); params.push(fecha); }
    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
    return this.db.prepare(`SELECT * FROM tutorias ${where} ORDER BY fecha DESC, hora DESC LIMIT ${LIMITE_LISTADO}`)
      .all(...params).map((f) => this.#aEntidad(f));
  }

  async buscarActivasDeDocenteEnFecha(docenteId, fecha) {
    return this.db.prepare(`SELECT * FROM tutorias WHERE docente_id=? AND fecha=? AND estado IN (${ACTIVOS_SQL})`)
      .all(docenteId, fecha).map((f) => this.#aEntidad(f));
  }

  async buscarActivasDeEstudianteEnFecha(estudianteId, fecha) {
    return this.db.prepare(`SELECT * FROM tutorias WHERE estudiante_id=? AND fecha=? AND estado IN (${ACTIVOS_SQL})`)
      .all(estudianteId, fecha).map((f) => this.#aEntidad(f));
  }

  async eliminar(id) {
    return this.db.prepare('DELETE FROM tutorias WHERE id=?').run(id).changes > 0;
  }
}

module.exports = { SqliteTutoriaRepository };
