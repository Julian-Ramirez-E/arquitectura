// Crea todas las tablas si no existen
// Ejecutar con: node src/config/migrate.js  (o se llama automático en server.js)

const { db } = require('./db');

function migrar() {
  db.exec(`
    -- Usuarios principales
    CREATE TABLE IF NOT EXISTS usuarios (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      nombres    TEXT NOT NULL,
      apellidos  TEXT NOT NULL,
      correo     TEXT UNIQUE NOT NULL,
      contrasena TEXT,
      rol        TEXT NOT NULL CHECK(rol IN ('estudiante','docente','admin')),
      google_id  TEXT,
      activo     INTEGER DEFAULT 1,
      creado_en  TEXT DEFAULT (datetime('now'))
    );

    -- Perfil adicional del estudiante
    CREATE TABLE IF NOT EXISTS perfiles_estudiante (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id  INTEGER UNIQUE NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      codigo      TEXT,
      documento   TEXT,
      programa    TEXT,
      semestre    TEXT,
      telefono    TEXT,
      promedio    REAL DEFAULT 0,
      en_alerta   INTEGER DEFAULT 0
    );

    -- Perfil adicional del docente
    CREATE TABLE IF NOT EXISTS perfiles_docente (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id     INTEGER UNIQUE NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      cedula         TEXT,
      codigo_docente TEXT,
      facultad       TEXT,
      telefono       TEXT
    );

    -- Asignaturas del docente (relación 1:N)
    CREATE TABLE IF NOT EXISTS docente_asignaturas (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      docente_id INTEGER NOT NULL REFERENCES perfiles_docente(id) ON DELETE CASCADE,
      asignatura TEXT NOT NULL
    );

    -- Perfil del administrador
    CREATE TABLE IF NOT EXISTS perfiles_admin (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id  INTEGER UNIQUE NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      cedula      TEXT,
      cargo       TEXT,
      dependencia TEXT,
      telefono    TEXT
    );

    -- Fotos de perfil y portada (base64)
    CREATE TABLE IF NOT EXISTS fotos_usuario (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id   INTEGER UNIQUE NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      foto_perfil  TEXT,
      foto_portada TEXT
    );

    -- Tutorías
    CREATE TABLE IF NOT EXISTS tutorias (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      estudiante_id    INTEGER REFERENCES usuarios(id),
      docente_id       INTEGER REFERENCES usuarios(id),
      asignatura       TEXT NOT NULL,
      fecha            TEXT NOT NULL,
      hora             TEXT NOT NULL,
      modalidad        TEXT NOT NULL CHECK(modalidad IN ('Virtual','Presencial')),
      estado           TEXT DEFAULT 'pendiente' CHECK(estado IN ('pendiente','confirmada','cancelada','completada')),
      observaciones    TEXT,
      creada_en        TEXT DEFAULT (datetime('now')),
      duracion_min     INTEGER NOT NULL DEFAULT 60
    );

    -- Notificaciones
    CREATE TABLE IF NOT EXISTS notificaciones (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      icono       TEXT DEFAULT '🔔',
      titulo      TEXT NOT NULL,
      descripcion TEXT,
      leida       INTEGER DEFAULT 0,
      creada_en   TEXT DEFAULT (datetime('now'))
    );

    -- Intentos de login fallidos (para bloqueo temporal)
    CREATE TABLE IF NOT EXISTS intentos_login (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      correo     TEXT NOT NULL,
      ip         TEXT,
      creado_en  TEXT DEFAULT (datetime('now'))
    );

    -- Auditoría de eventos
    CREATE TABLE IF NOT EXISTS auditoria (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id  INTEGER REFERENCES usuarios(id),
      evento      TEXT NOT NULL,
      detalle     TEXT,
      ip          TEXT,
      user_agent  TEXT,
      creado_en   TEXT DEFAULT (datetime('now'))
    );
  `);

  console.log('✅ Tablas creadas / verificadas correctamente');
}

migrar();
module.exports = { migrar };
