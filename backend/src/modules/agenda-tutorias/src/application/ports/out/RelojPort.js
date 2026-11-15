'use strict';
// APLICACIÓN · PUERTO DE SALIDA. Inyectar el reloj hace las reglas dependientes del tiempo (RN-02, RN-03)
// DETERMINISTAS en las pruebas: nadie tiene que esperar 24 horas para probar una cancelación.
class RelojPort {
  ahoraMs() { throw new Error('no implementado'); }
}
module.exports = { RelojPort };
