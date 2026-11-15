'use strict';

const { ProhibidoError, ValidacionError } = require('../errors/ErroresDominio');
const { Tutoria } = require('../entities/Tutoria');
const { RangoHorario } = require('../value-objects/RangoHorario');
const { Rol, EstadoTutoria } = require('../value-objects/Catalogos');

class TutoriaFactory {
  static crear({ actor, estudianteId, docenteId, asignatura, modalidad, fecha, hora, duracionMin = 60, observaciones = '' }) {
    let idEstudiante;
    let idDocente;
    let estado;

    switch (actor.rol) {
      case Rol.ESTUDIANTE:
        if (estudianteId != null && estudianteId !== actor.id) {
          throw new ProhibidoError('Un estudiante solo puede solicitar tutorías para sí mismo');
        }
        idEstudiante = actor.id;
        idDocente = docenteId;
        estado = EstadoTutoria.PENDIENTE;
        break;
      case Rol.DOCENTE:
        if (docenteId != null && docenteId !== actor.id) {
          throw new ProhibidoError('Un docente solo puede programar tutorías propias');
        }
        idDocente = actor.id;
        idEstudiante = estudianteId;
        estado = EstadoTutoria.CONFIRMADA;
        break;
      case Rol.ADMIN:
        idEstudiante = estudianteId;
        idDocente = docenteId;
        estado = EstadoTutoria.CONFIRMADA;
        break;
      default:
        throw new ProhibidoError(`El rol "${actor.rol}" no puede crear tutorías`);
    }

    const faltantes = [];
    if (!idEstudiante) faltantes.push({ campo: 'estudiante_id', mensaje: 'Es obligatorio para este rol' });
    if (!idDocente) faltantes.push({ campo: 'docente_id', mensaje: 'Es obligatorio para este rol' });
    if (faltantes.length) throw new ValidacionError('Falta el estudiante o el docente', faltantes);

    return new Tutoria({
      estudianteId: idEstudiante,
      docenteId: idDocente,
      asignatura,
      modalidad,
      rango: new RangoHorario({ fecha, hora, duracionMin }),
      estado,
      observaciones,
    });
  }
}

module.exports = { TutoriaFactory };
