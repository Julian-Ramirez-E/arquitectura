'use strict';
const { Router } = require('express');
const { envolver } = require('../middlewares/manejadorErrores');

function crearRutasTutorias({ controller, autenticar }) {
  const r = Router();
  r.use(autenticar); // todo el módulo requiere Bearer JWT

  // Orden importa: /docentes y /disponibilidad deben declararse ANTES de /:id
  r.get('/docentes', envolver(controller.docentes));
  r.get('/disponibilidad', envolver(controller.disponibilidad));
  r.get('/', envolver(controller.listar));
  r.post('/', envolver(controller.crear));
  r.get('/:id', envolver(controller.obtener));
  r.put('/:id', envolver(controller.actualizar));
  r.delete('/:id', envolver(controller.eliminar));
  r.patch('/:id/cancelar', envolver(controller.cancelar));
  r.patch('/:id/confirmar', envolver(controller.confirmar));
  r.patch('/:id/realizar', envolver(controller.realizar));
  return r;
}
module.exports = { crearRutasTutorias };
