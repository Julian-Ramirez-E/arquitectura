const { db } = require('../config/db');

const MAX_POR_TUTOR = parseInt(process.env.RN_MAX_ESTUDIANTES_POR_TUTOR || 15);

function listarUsuarios(req, res) {
  const { rol, estado, q } = req.query;

  let sql = `
    SELECT u.id, u.nombres, u.apellidos, u.correo, u.rol, u.activo, u.creado_en,
           pe.programa, pe.semestre, pe.promedio, pe.en_alerta, pd.facultad
    FROM usuarios u
    LEFT JOIN perfiles_estudiante pe ON pe.usuario_id=u.id
    LEFT JOIN perfiles_docente pd ON pd.usuario_id=u.id
    WHERE 1=1
  `;
  const params = [];

  if (rol)                 { sql += ' AND u.rol=?';         params.push(rol); }
  if (estado === 'activo')   sql += ' AND u.activo=1';
  if (estado === 'inactivo') sql += ' AND u.activo=0';
  if (estado === 'alerta')   sql += ' AND pe.en_alerta=1';

  if (q) {
    sql += ' AND (u.nombres LIKE ? OR u.apellidos LIKE ? OR u.correo LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like, like);
  }

  sql += ' ORDER BY u.creado_en DESC';

  res.json(db.prepare(sql).all(...params));
}

function cambiarEstado(req, res) {
  const { activo } = req.body;
  if (typeof activo !== 'boolean') return res.status(400).json({ error: 'activo debe ser boolean' });
  db.prepare('UPDATE usuarios SET activo=? WHERE id=?').run(activo ? 1 : 0, req.params.id);
  res.json({ mensaje: `Usuario ${activo ? 'activado' : 'desactivado'}` });
}

function estadisticas(req, res) {
  const mesActual = new Date().toISOString().slice(0, 7); // YYYY-MM

  const totales     = db.prepare("SELECT COUNT(*) AS n FROM usuarios WHERE activo=1").get().n;
  const estudiantes = db.prepare("SELECT COUNT(*) AS n FROM usuarios WHERE rol='estudiante' AND activo=1").get().n;
  const docentes    = db.prepare("SELECT COUNT(*) AS n FROM usuarios WHERE rol='docente' AND activo=1").get().n;
  const alertas     = db.prepare("SELECT COUNT(*) AS n FROM perfiles_estudiante WHERE en_alerta=1").get().n;
  const tutMes      = db.prepare("SELECT COUNT(*) AS n FROM tutorias WHERE fecha LIKE ? AND estado!='cancelada'").get(`${mesActual}%`).n;
  const realizadas  = db.prepare("SELECT COUNT(*) AS n FROM tutorias WHERE estado='completada'").get().n;
  const totalTut    = db.prepare("SELECT COUNT(*) AS n FROM tutorias").get().n;

  res.json({
    total_usuarios:    totales,
    total_estudiantes: estudiantes,
    total_docentes:    docentes,
    alertas_activas:   alertas,
    tutorias_este_mes: tutMes,
    tasa_recuperacion: totalTut > 0 ? `${Math.round(realizadas/totalTut*100)}%` : '0%'
  });
}

function enviarNotificacion(req, res) {
  const { destinatario, titulo, descripcion, icono } = req.body;
  if (!titulo || !descripcion) return res.status(400).json({ error: 'Faltan título o descripción' });

  let usuarios = [];
  if (destinatario === 'alertas') {
    usuarios = db.prepare('SELECT usuario_id AS id FROM perfiles_estudiante WHERE en_alerta=1').all();
  } else if (destinatario === 'docentes') {
    usuarios = db.prepare("SELECT id FROM usuarios WHERE rol='docente' AND activo=1").all();
  } else {
    usuarios = db.prepare("SELECT id FROM usuarios WHERE activo=1").all();
  }

  if (usuarios.length === 0) return res.status(404).json({ error: 'Sin destinatarios' });

  const insertar = db.prepare('INSERT INTO notificaciones (usuario_id, icono, titulo, descripcion) VALUES (?,?,?,?)');
  usuarios.forEach(u => insertar.run(u.id, icono || '📢', titulo, descripcion));

  res.json({ mensaje: `Enviado a ${usuarios.length} usuarios` });
}

function verAuditoria(req, res) {
  const { tipo, fecha } = req.query;
  let sql = `
    SELECT a.*, u.nombres||' '||u.apellidos AS nombre_usuario
    FROM auditoria a LEFT JOIN usuarios u ON u.id=a.usuario_id WHERE 1=1
  `;
  const params = [];

  if (tipo)  { sql += ' AND a.evento LIKE ?'; params.push(`%${tipo}%`); }
  if (fecha) { sql += ' AND date(a.creado_en)=?'; params.push(fecha); }

  sql += ' ORDER BY a.creado_en DESC LIMIT 500';
  res.json(db.prepare(sql).all(...params));
}

module.exports = { listarUsuarios, cambiarEstado, estadisticas, enviarNotificacion, verAuditoria };
