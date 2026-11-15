'use strict';
// INFRAESTRUCTURA · Lectura y validación de variables de entorno en UN solo lugar.
// Las reglas de negocio configurables (horas) llegan al núcleo por inyección, nunca leyendo process.env desde el dominio.

function entero(valor, porDefecto, nombre) {
  if (valor === undefined || valor === '') return porDefecto;
  const n = Number(valor);
  if (!Number.isFinite(n) || n < 0) throw new Error(`Variable ${nombre} inválida: "${valor}"`);
  return n;
}

function cargarConfig(env = process.env) {
  const produccion = env.NODE_ENV === 'production';
  if (produccion && !env.JWT_SECRET) throw new Error('JWT_SECRET es obligatorio cuando NODE_ENV=production');

  return Object.freeze({
    puerto: entero(env.PORT, 3000, 'PORT'),
    dbPath: env.DB_PATH || './data/agenda.db',
    // Mismo valor por defecto que ConectaProfe: los tokens de su login funcionan aquí sin tocar nada (solo desarrollo).
    jwtSecret: env.JWT_SECRET || 'conectaprofe-dev-secret-cambiar-en-produccion',
    corsOrigin: env.CORS_ORIGIN || true,
    reglas: Object.freeze({
      horasAnticipacionMin: entero(env.RN_HORAS_ANTICIPACION_MIN, 2, 'RN_HORAS_ANTICIPACION_MIN'),        // RN-02
      horasCancelacionEstudiante: entero(env.RN_HORAS_CANCELACION, 24, 'RN_HORAS_CANCELACION'),            // RN-03
      horasCancelacionDocente: entero(env.RN_HORAS_CANCELACION_DOCENTE, 12, 'RN_HORAS_CANCELACION_DOCENTE'),
    }),
  });
}

module.exports = { cargarConfig };
