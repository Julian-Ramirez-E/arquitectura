'use strict';
require('dotenv').config();
const { cargarConfig } = require('./infrastructure/config/env');
const { construirAplicacion } = require('./infrastructure/composition/contenedor');

const config = cargarConfig();
const { app } = construirAplicacion(config);

app.listen(config.puerto, () => {
  console.log(`\n🚀 Agenda de Tutorías escuchando en http://localhost:${config.puerto}`);
  console.log(`📚 Swagger UI:  http://localhost:${config.puerto}/api/docs`);
  console.log(`❤️  Estado:      http://localhost:${config.puerto}/api/ping\n`);
});
