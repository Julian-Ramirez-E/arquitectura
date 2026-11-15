'use strict';
// INFRAESTRUCTURA · ÚNICO lugar que traduce excepciones de dominio a códigos HTTP (SRP).
// Los controladores no tienen try/catch: lanzan y este middleware responde.
const { ValidacionError, ProhibidoError, NoEncontradoError, ReglaNegocioError } = require('../../../../../domain/errors/ErroresDominio');

const envolver = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next); // Express 4 no captura async

// eslint-disable-next-line no-unused-vars
function manejadorErrores(err, req, res, next) {
  if (err instanceof ValidacionError) {
    // El frontend de ConectaProfe solo muestra `error`; se incluye el primer detalle para que el mensaje sea útil.
    const primero = err.detalles?.[0];
    const mensaje = primero ? `${err.message}: ${primero.campo} — ${primero.mensaje}` : err.message;
    return res.status(400).json({ error: mensaje, codigo: err.codigo, detalles: err.detalles });
  }
  if (err instanceof ProhibidoError) return res.status(403).json({ error: err.message, codigo: err.codigo });
  if (err instanceof NoEncontradoError) return res.status(404).json({ error: err.message, codigo: err.codigo });
  if (err instanceof ReglaNegocioError) return res.status(409).json({ error: err.message, codigo: err.codigo });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'El cuerpo no es un JSON válido', codigo: 'VALIDACION' });
  console.error('Error no controlado:', err);
  return res.status(500).json({ error: 'Error interno del servidor', codigo: 'ERROR_INTERNO' });
}

module.exports = { manejadorErrores, envolver };
