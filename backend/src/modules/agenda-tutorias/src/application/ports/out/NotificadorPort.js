'use strict';
// APLICACIÓN · PUERTO DE SALIDA. Hoy se implementa con la tabla `notificaciones`; mañana puede ser correo o push.
class NotificadorPort {
  // eslint-disable-next-line no-unused-vars
  async notificar(usuarioId, { icono, titulo, descripcion }) { throw new Error('no implementado'); }
}
module.exports = { NotificadorPort };
