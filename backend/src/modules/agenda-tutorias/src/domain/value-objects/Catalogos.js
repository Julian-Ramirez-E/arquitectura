'use strict';
// DOMINIO · Catálogos cerrados. Congelados para que nadie los mute en tiempo de ejecución.

const Rol = Object.freeze({ ESTUDIANTE: 'estudiante', DOCENTE: 'docente', ADMIN: 'admin' });

const EstadoTutoria = Object.freeze({
  PENDIENTE: 'pendiente',
  CONFIRMADA: 'confirmada',
  CANCELADA: 'cancelada',
  COMPLETADA: 'completada',
});

// Estados que "ocupan" agenda. Una tutoría cancelada o completada libera el espacio.
const ESTADOS_ACTIVOS = Object.freeze([EstadoTutoria.PENDIENTE, EstadoTutoria.CONFIRMADA]);

const Modalidad = Object.freeze({ VIRTUAL: 'Virtual', PRESENCIAL: 'Presencial' });

const valores = (catalogo) => Object.values(catalogo);

module.exports = { Rol, EstadoTutoria, ESTADOS_ACTIVOS, Modalidad, valores };
