const { db } = require('../config/db');

const PROMEDIO_MINIMO = parseFloat(process.env.RN_PROMEDIO_MINIMO || 3.0);

// ── POST /api/perfil/estudiante ─────────────────────────
function guardarPerfilEstudiante(req, res) {
  const { codigo, documento, programa, semestre, telefono, promedio } = req.body;
  const usuario_id = req.usuario.id;

  if (!codigo || !documento || !programa || !semestre) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  const promedioNum = parseFloat(promedio) || 0;
  

  db.prepare(`
    INSERT INTO perfiles_estudiante (usuario_id, codigo, documento, programa, semestre, telefono, promedio)
    VALUES (?,?,?,?,?,?,?)
    ON CONFLICT(usuario_id) DO UPDATE SET
      codigo=excluded.codigo, documento=excluded.documento, programa=excluded.programa,
      semestre=excluded.semestre, telefono=excluded.telefono, promedio=excluded.promedio
  `).run(usuario_id, codigo, documento, programa, semestre, telefono || '', promedioNum);
  res.json({ mensaje: 'Perfil guardado' });
}

// ── POST /api/perfil/docente ────────────────────────────
function guardarPerfilDocente(req, res) {
  const { cedula, codigo_docente, facultad, telefono, asignaturas } = req.body;
  const usuario_id = req.usuario.id;

  if (!cedula || !facultad) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  db.prepare(`
    INSERT INTO perfiles_docente (usuario_id, cedula, codigo_docente, facultad, telefono)
    VALUES (?,?,?,?,?)
    ON CONFLICT(usuario_id) DO UPDATE SET
      cedula=excluded.cedula, codigo_docente=excluded.codigo_docente,
      facultad=excluded.facultad, telefono=excluded.telefono
  `).run(usuario_id, cedula, codigo_docente || '', facultad, telefono || '');

  const perfil = db.prepare('SELECT id FROM perfiles_docente WHERE usuario_id = ?').get(usuario_id);

  db.prepare('DELETE FROM docente_asignaturas WHERE docente_id = ?').run(perfil.id);

  if (Array.isArray(asignaturas) && asignaturas.length > 0) {
    const insertar = db.prepare('INSERT INTO docente_asignaturas (docente_id, asignatura) VALUES (?,?)');
    asignaturas.forEach(a => insertar.run(perfil.id, a));
  }

  res.json({ mensaje: 'Perfil guardado' });
}

// ── POST /api/perfil/admin ──────────────────────────────
function guardarPerfilAdmin(req, res) {
  const { cedula, cargo, dependencia, telefono } = req.body;
  const usuario_id = req.usuario.id;

  if (!cedula || !cargo) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  db.prepare(`
    INSERT INTO perfiles_admin (usuario_id, cedula, cargo, dependencia, telefono)
    VALUES (?,?,?,?,?)
    ON CONFLICT(usuario_id) DO UPDATE SET
      cedula=excluded.cedula, cargo=excluded.cargo,
      dependencia=excluded.dependencia, telefono=excluded.telefono
  `).run(usuario_id, cedula, cargo, dependencia || '', telefono || '');

  res.json({ mensaje: 'Perfil guardado' });
}

// ── GET /api/perfil ─────────────────────────────────────
function obtenerPerfil(req, res) {
  const { id, rol } = req.usuario;

  const usuario = db.prepare(
    'SELECT id, nombres, apellidos, correo, rol, creado_en FROM usuarios WHERE id = ?'
  ).get(id);

  if (!usuario) return res.status(404).json({ error: 'No encontrado' });

  if (rol === 'estudiante') {
    usuario.perfil = db.prepare('SELECT * FROM perfiles_estudiante WHERE usuario_id = ?').get(id) || null;

  } else if (rol === 'docente') {
    const perfil = db.prepare('SELECT * FROM perfiles_docente WHERE usuario_id = ?').get(id);
    if (perfil) {
      const asignaturas = db.prepare('SELECT asignatura FROM docente_asignaturas WHERE docente_id = ?').all(perfil.id);
      perfil.asignaturas = asignaturas.map(a => a.asignatura);
    }
    usuario.perfil = perfil || null;

  } else if (rol === 'admin') {
    usuario.perfil = db.prepare('SELECT * FROM perfiles_admin WHERE usuario_id = ?').get(id) || null;
  }

  usuario.fotos = db.prepare('SELECT foto_perfil, foto_portada FROM fotos_usuario WHERE usuario_id = ?').get(id) || {};

  res.json(usuario);
}

// ── POST /api/perfil/foto ───────────────────────────────
function subirFoto(req, res) {
  const { foto_base64, tipo } = req.body;
  const usuario_id = req.usuario.id;

  if (!foto_base64) return res.status(400).json({ error: 'No se recibió foto' });

  const campo = tipo === 'portada' ? 'foto_portada' : 'foto_perfil';

  db.prepare(`
    INSERT INTO fotos_usuario (usuario_id, ${campo}) VALUES (?,?)
    ON CONFLICT(usuario_id) DO UPDATE SET ${campo}=excluded.${campo}
  `).run(usuario_id, foto_base64);

  res.json({ mensaje: 'Foto guardada' });
}

module.exports = { guardarPerfilEstudiante, guardarPerfilDocente, guardarPerfilAdmin, obtenerPerfil, subirFoto };
