'use strict';
// API PÚBLICA del módulo cuando se monta DENTRO de otro backend Express (p. ej. ConectaProfe).
// Uso:  app.use('/api/tutorias', crearRouterAgenda({ db, jwtSecret, reglas }));
const { Router } = require('express');
const { migrar } = require('./infrastructure/adapters/out/persistence/SqliteConexion');
const { construirCasosDeUso } = require('./infrastructure/composition/contenedor');
const { crearAutenticar } = require('./infrastructure/adapters/in/http/middlewares/autenticar');
const { manejadorErrores } = require('./infrastructure/adapters/in/http/middlewares/manejadorErrores');
const { TutoriasController } = require('./infrastructure/adapters/in/http/controllers/TutoriasController');
const { crearRutasTutorias } = require('./infrastructure/adapters/in/http/routes/tutorias.routes');
const { cargarConfig } = require('./infrastructure/config/env');

function crearRouterAgenda({ db, jwtSecret, reglas = cargarConfig().reglas }) {
  migrar(db); // idempotente: agrega duracion_min si la tabla `tutorias` ya existía
  const casosDeUso = construirCasosDeUso(db, reglas);
  const router = Router();
  router.use(crearRutasTutorias({ controller: new TutoriasController(casosDeUso), autenticar: crearAutenticar({ jwtSecret }) }));
  router.use(manejadorErrores); // errores de dominio → códigos HTTP, también dentro del router montado
  return router;
}

module.exports = { crearRouterAgenda };
