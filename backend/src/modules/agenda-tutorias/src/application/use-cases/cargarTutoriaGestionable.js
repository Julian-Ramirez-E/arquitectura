'use strict';
// APLICACIÓN · Helper compartido (DRY): cargar + verificar que el actor puede gestionar la tutoría.
// Lo usan 6 casos de uso; sin él, cada uno repetiría el mismo bloque 404/403.
const { NoEncontradoError, ProhibidoError } = require('../../domain/errors/ErroresDominio');

async function cargarTutoriaGestionable(tutoriaRepo, id, actor) {
  const tutoria = await tutoriaRepo.buscarPorId(id);
  if (!tutoria) throw new NoEncontradoError(`La tutoría ${id} no existe`);
  if (!tutoria.puedeSerGestionadaPor(actor)) throw new ProhibidoError('Esta tutoría no te pertenece');
  return tutoria;
}

module.exports = { cargarTutoriaGestionable };
