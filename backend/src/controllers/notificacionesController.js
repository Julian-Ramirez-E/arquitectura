const { db } = require('../config/db');

function listar(req, res) {
  const notifs = db.prepare(
    'SELECT * FROM notificaciones WHERE usuario_id=? ORDER BY creada_en DESC LIMIT 50'
  ).all(req.usuario.id);
  res.json(notifs);
}

function marcarLeida(req, res) {
  db.prepare('UPDATE notificaciones SET leida=1 WHERE id=? AND usuario_id=?')
    .run(req.params.id, req.usuario.id);
  res.json({ mensaje: 'Notificación leída' });
}

function marcarTodasLeidas(req, res) {
  db.prepare('UPDATE notificaciones SET leida=1 WHERE usuario_id=?').run(req.usuario.id);
  res.json({ mensaje: 'Todas leídas' });
}

module.exports = { listar, marcarLeida, marcarTodasLeidas };
