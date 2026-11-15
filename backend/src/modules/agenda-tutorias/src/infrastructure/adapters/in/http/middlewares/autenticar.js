'use strict';
// INFRAESTRUCTURA · Middleware de autenticación con Bearer JWT (mismo formato de ConectaProfe: { id, correo, rol }).
// Responde 401 si falta/expira el token. Qué PUEDE hacer cada rol (403) lo deciden los casos de uso, no el middleware.
const jwt = require('jsonwebtoken');
const { valores, Rol } = require('../../../../../domain/value-objects/Catalogos');

function crearAutenticar({ jwtSecret }) {
  return function autenticar(req, res, next) {
    const cabecera = req.headers.authorization || '';
    if (!cabecera.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token requerido (header Authorization: Bearer <token>)', codigo: 'NO_AUTENTICADO' });
    }
    try {
      const payload = jwt.verify(cabecera.slice(7), jwtSecret, { algorithms: ['HS256'] });
      if (!Number.isInteger(payload.id) || !valores(Rol).includes(payload.rol)) {
        return res.status(401).json({ error: 'Token con datos inválidos', codigo: 'NO_AUTENTICADO' });
      }
      req.actor = { id: payload.id, correo: payload.correo, rol: payload.rol };
      return next();
    } catch {
      return res.status(401).json({ error: 'Token inválido o expirado', codigo: 'NO_AUTENTICADO' });
    }
  };
}
module.exports = { crearAutenticar };
