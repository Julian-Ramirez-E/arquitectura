'use strict';
// INFRAESTRUCTURA · Ensambla Express. Recibe los casos de uso ya construidos (no sabe cómo se crean).
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const { crearAutenticar } = require('./middlewares/autenticar');
const { manejadorErrores } = require('./middlewares/manejadorErrores');
const { TutoriasController } = require('./controllers/TutoriasController');
const { crearRutasTutorias } = require('./routes/tutorias.routes');
const { openapi } = require('./docs/openapi');

function crearApp({ casosDeUso, config }) {
  const app = express();
  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/ping', (req, res) => res.json({ estado: 'ok', hora: new Date().toISOString() }));
  app.get('/api/docs.json', (req, res) => res.json(openapi));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: 'Agenda de Tutorías — API' }));

  const autenticar = crearAutenticar({ jwtSecret: config.jwtSecret });
  app.use('/api/tutorias', crearRutasTutorias({ controller: new TutoriasController(casosDeUso), autenticar }));

  app.use((req, res) => res.status(404).json({ error: `${req.method} ${req.originalUrl} no existe`, codigo: 'NO_ENCONTRADO' }));
  app.use(manejadorErrores);
  return app;
}
module.exports = { crearApp };
