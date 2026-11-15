'use strict';
// INFRAESTRUCTURA · Adaptador de salida: guarda el aviso en la tabla `notificaciones` que ya lee ConectaProfe.
const { NotificadorPort } = require('../../../../application/ports/out/NotificadorPort');

class SqliteNotificador extends NotificadorPort {
  constructor(db) { super(); this.db = db; }
  async notificar(usuarioId, { icono = '🔔', titulo, descripcion = '' }) {
    this.db.prepare('INSERT INTO notificaciones (usuario_id, icono, titulo, descripcion) VALUES (?,?,?,?)')
      .run(usuarioId, icono, titulo, descripcion);
  }
}
module.exports = { SqliteNotificador };
