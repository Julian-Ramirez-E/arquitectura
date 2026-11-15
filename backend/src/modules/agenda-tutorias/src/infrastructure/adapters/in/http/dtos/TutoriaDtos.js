'use strict';
// INFRAESTRUCTURA · DTOs: validan la FORMA de lo que llega por HTTP y lo convierten a un comando camelCase.
// (La validación de NEGOCIO —solapes, plazos— NO está aquí: es del dominio.) Mensajes en español, por campo.
const { ValidacionError } = require('../../../../../domain/errors/ErroresDominio');
const { RangoHorario } = require('../../../../../domain/value-objects/RangoHorario');
const { Modalidad, EstadoTutoria, valores } = require('../../../../../domain/value-objects/Catalogos');

const entero = (v) => (typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v);
const esObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function idOpcional(body, campo, errores) {
  if (body[campo] === undefined || body[campo] === null) return undefined;
  if (!Number.isInteger(body[campo]) || body[campo] <= 0) {
    errores.push({ campo, mensaje: 'Debe ser un entero positivo' });
    return undefined;
  }
  return body[campo];
}

function camposComunes(body, errores) {
  const { asignatura, modalidad, observaciones } = body;
  if (typeof asignatura !== 'string' || asignatura.trim().length < 3 || asignatura.trim().length > 100) {
    errores.push({ campo: 'asignatura', mensaje: 'Obligatoria: texto de 3 a 100 caracteres' });
  }
  if (!valores(Modalidad).includes(modalidad)) {
    errores.push({ campo: 'modalidad', mensaje: `Obligatoria: ${valores(Modalidad).join(' o ')}` });
  }
  if (observaciones !== undefined && (typeof observaciones !== 'string' || observaciones.length > 500)) {
    errores.push({ campo: 'observaciones', mensaje: 'Debe ser texto de máximo 500 caracteres' });
  }
  const duracionMin = body.duracion_min === undefined ? undefined : body.duracion_min;
  const faltaRango = RangoHorario.errores({ fecha: body.fecha, hora: body.hora, duracionMin: duracionMin ?? 60 });
  errores.push(...faltaRango);
  return { asignatura, modalidad, fecha: body.fecha, hora: body.hora, duracionMin, observaciones };
}

function finalizar(errores, valor) {
  if (errores.length) throw new ValidacionError('Hay datos inválidos en la solicitud', errores);
  return valor;
}

/** POST /api/tutorias — mismos nombres de campo que ya envía el frontend de ConectaProfe. */
function validarCrear(body) {
  if (!esObjeto(body)) throw new ValidacionError('El cuerpo debe ser un objeto JSON');
  const errores = [];
  const estudianteId = idOpcional(body, 'estudiante_id', errores);
  const docenteId = idOpcional(body, 'docente_id', errores);
  let estudianteCodigo;
  if (body.estudiante_codigo !== undefined && body.estudiante_codigo !== null && body.estudiante_codigo !== '') {
    if (typeof body.estudiante_codigo !== 'string' || body.estudiante_codigo.trim().length > 30) {
      errores.push({ campo: 'estudiante_codigo', mensaje: 'Debe ser un texto de máximo 30 caracteres' });
    } else estudianteCodigo = body.estudiante_codigo.trim();
  }
  const comunes = camposComunes(body, errores);
  return finalizar(errores, { ...comunes, estudianteId, estudianteCodigo, docenteId });
}

/** PUT /api/tutorias/:id */
function validarActualizar(body) {
  if (!esObjeto(body)) throw new ValidacionError('El cuerpo debe ser un objeto JSON');
  const errores = [];
  const comunes = camposComunes(body, errores);
  return finalizar(errores, comunes);
}

/** GET /api/tutorias?estado=&fecha= */
function validarFiltros(query) {
  const errores = [];
  const filtros = {};
  if (query.estado !== undefined) {
    if (!valores(EstadoTutoria).includes(query.estado)) errores.push({ campo: 'estado', mensaje: `Debe ser: ${valores(EstadoTutoria).join(', ')}` });
    else filtros.estado = query.estado;
  }
  if (query.fecha !== undefined) {
    if (RangoHorario.errores({ fecha: query.fecha, hora: '08:00', duracionMin: 60 }).some((e) => e.campo === 'fecha')) {
      errores.push({ campo: 'fecha', mensaje: 'Debe ser una fecha real con formato YYYY-MM-DD' });
    } else filtros.fecha = query.fecha;
  }
  return finalizar(errores, filtros);
}

/** GET /api/tutorias/disponibilidad?docente_id=&fecha=&duracion_min= */
function validarDisponibilidad(query) {
  const errores = [];
  const docenteId = entero(query.docente_id);
  if (!Number.isInteger(docenteId) || docenteId <= 0) errores.push({ campo: 'docente_id', mensaje: 'Obligatorio: entero positivo' });
  const duracionMin = query.duracion_min === undefined ? 60 : entero(query.duracion_min);
  const errRango = RangoHorario.errores({ fecha: query.fecha, hora: '08:00', duracionMin }).filter((e) => e.campo !== 'hora');
  errores.push(...errRango);
  return finalizar(errores, { docenteId, fecha: query.fecha, duracionMin });
}

function validarId(valor) {
  const id = entero(valor);
  if (!Number.isInteger(id) || id <= 0) throw new ValidacionError('El id debe ser un entero positivo', [{ campo: 'id', mensaje: 'Entero positivo' }]);
  return id;
}

/** Presentador: entidad de dominio → JSON (snake_case, igual que el resto de ConectaProfe). */
function aRespuesta(t) {
  return {
    id: t.id,
    estudiante_id: t.estudianteId,
    docente_id: t.docenteId,
    asignatura: t.asignatura,
    modalidad: t.modalidad,
    fecha: t.rango.fecha,
    hora: t.rango.hora,
    hora_fin: t.rango.horaFin,
    duracion_min: t.rango.duracionMin,
    estado: t.estado,
    observaciones: t.observaciones,
    creada_en: t.creadaEn,
  };
}

/** Entidad + nombres de ambas partes (los consume el frontend en las tarjetas del panel). */
function aRespuestaConNombres({ tutoria, nombreDocente, nombreEstudiante }) {
  return { ...aRespuesta(tutoria), nombre_docente: nombreDocente, nombre_estudiante: nombreEstudiante };
}

module.exports = { aRespuestaConNombres, validarCrear, validarActualizar, validarFiltros, validarDisponibilidad, validarId, aRespuesta };
