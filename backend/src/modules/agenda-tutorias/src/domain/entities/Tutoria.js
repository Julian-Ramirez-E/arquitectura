'use strict';

const { ValidacionError, ReglaNegocioError } = require('../errors/ErroresDominio');
const { EstadoTutoria, ESTADOS_ACTIVOS, Modalidad, Rol, valores } = require('../value-objects/Catalogos');
const { RangoHorario } = require('../value-objects/RangoHorario');

class Tutoria {
  constructor({ id = null, estudianteId, docenteId, asignatura, modalidad, rango, estado,
    observaciones = '', creadaEn = null }) {
    const errores = [];
    if (!Number.isInteger(estudianteId) || estudianteId <= 0) errores.push({ campo: 'estudiante_id', mensaje: 'Es obligatorio' });
    if (!Number.isInteger(docenteId) || docenteId <= 0) errores.push({ campo: 'docente_id', mensaje: 'Es obligatorio' });
    if (estudianteId === docenteId) errores.push({ campo: 'docente_id', mensaje: 'El docente y el estudiante no pueden ser la misma persona' });
    const asig = typeof asignatura === 'string' ? asignatura.trim() : '';
    if (asig.length < 3 || asig.length > 100) errores.push({ campo: 'asignatura', mensaje: 'Debe tener entre 3 y 100 caracteres' });
    if (!valores(Modalidad).includes(modalidad)) errores.push({ campo: 'modalidad', mensaje: `Debe ser ${valores(Modalidad).join(' o ')}` });
    if (!valores(EstadoTutoria).includes(estado)) errores.push({ campo: 'estado', mensaje: 'Estado desconocido' });
    if (!(rango instanceof RangoHorario)) errores.push({ campo: 'rango', mensaje: 'Rango horario requerido' });
    if (errores.length) throw new ValidacionError('Tutoría inválida', errores);

    this.id = id;
    this.estudianteId = estudianteId;
    this.docenteId = docenteId;
    this.asignatura = asig;
    this.modalidad = modalidad;
    this.rango = rango;
    this.estado = estado;
    this.observaciones = (observaciones ?? '').trim();
    this.creadaEn = creadaEn;
  }

  // ── Consultas ────────────────────────────────────────
  estaActiva() { return ESTADOS_ACTIVOS.includes(this.estado); }
  esParticipante(usuarioId) { return usuarioId === this.estudianteId || usuarioId === this.docenteId; }
  esDocenteDe(actor) { return actor.rol === Rol.DOCENTE && actor.id === this.docenteId; }
  puedeSerGestionadaPor(actor) { return actor.rol === Rol.ADMIN || this.esParticipante(actor.id); }
  contraparteDe(usuarioId) { return usuarioId === this.docenteId ? this.estudianteId : this.docenteId; }

  // ── Comandos (cambian estado) ────────────────────────
  asegurarActiva(accion) {
    if (!this.estaActiva()) {
      throw new ReglaNegocioError(`No se puede ${accion} una tutoría en estado "${this.estado}"`, 'RN-05');
    }
  }

  confirmar() {
    if (this.estado !== EstadoTutoria.PENDIENTE) {
      throw new ReglaNegocioError(`Solo se confirman tutorías pendientes (estado actual: "${this.estado}")`, 'RN-05');
    }
    this.estado = EstadoTutoria.CONFIRMADA;
  }

  cancelar() {
    this.asegurarActiva('cancelar');
    this.estado = EstadoTutoria.CANCELADA;
  }

  completar(ahoraMs) {
    if (this.estado !== EstadoTutoria.CONFIRMADA) {
      throw new ReglaNegocioError(`Solo se completan tutorías confirmadas (estado actual: "${this.estado}")`, 'RN-05');
    }
    if (ahoraMs < this.rango.inicioMs) {
      throw new ReglaNegocioError('No se puede marcar como realizada una tutoría que aún no ha comenzado', 'RN-06');
    }
    this.estado = EstadoTutoria.COMPLETADA;
  }

  /** Reprogramación / edición. Las validaciones que dependen de otras tutorías se hacen ANTES, en el caso de uso. */
  reprogramar({ rango, asignatura, modalidad, observaciones }) {
    this.asegurarActiva('modificar');
    // Se reconstruye para reutilizar las validaciones del constructor (DRY).
    const validada = new Tutoria({ ...this, rango, asignatura, modalidad, observaciones });
    this.rango = validada.rango;
    this.asignatura = validada.asignatura;
    this.modalidad = validada.modalidad;
    this.observaciones = validada.observaciones;
  }
}

module.exports = { Tutoria };
