'use strict';
// INFRAESTRUCTURA · Conexión y migración idempotente. Las tablas `usuarios`, `tutorias` y `notificaciones`
// son idénticas a las de ConectaProfe, por lo que este módulo puede apuntar a SU MISMO archivo .db.
const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');

function crearConexion(dbPath) {
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

function migrar(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombres TEXT NOT NULL, apellidos TEXT NOT NULL,
      correo TEXT UNIQUE NOT NULL, contrasena TEXT,
      rol TEXT NOT NULL CHECK(rol IN ('estudiante','docente','admin')),
      google_id TEXT, activo INTEGER DEFAULT 1, creado_en TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS perfiles_estudiante (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER UNIQUE NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      codigo TEXT, documento TEXT, programa TEXT, semestre TEXT, telefono TEXT,
      promedio REAL DEFAULT 0, en_alerta INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS tutorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      estudiante_id INTEGER REFERENCES usuarios(id),
      docente_id INTEGER REFERENCES usuarios(id),
      asignatura TEXT NOT NULL, fecha TEXT NOT NULL, hora TEXT NOT NULL,
      modalidad TEXT NOT NULL CHECK(modalidad IN ('Virtual','Presencial')),
      estado TEXT DEFAULT 'pendiente' CHECK(estado IN ('pendiente','confirmada','cancelada','completada')),
      observaciones TEXT, creada_en TEXT DEFAULT (datetime('now')),
      duracion_min INTEGER NOT NULL DEFAULT 60
    );
    CREATE TABLE IF NOT EXISTS notificaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      icono TEXT DEFAULT '🔔', titulo TEXT NOT NULL, descripcion TEXT,
      leida INTEGER DEFAULT 0, creada_en TEXT DEFAULT (datetime('now'))
    );
  `);
  // Si la tabla `tutorias` ya existía (viene de ConectaProfe) no tiene la duración: se agrega sin perder datos.
  const columnas = db.prepare('PRAGMA table_info(tutorias)').all().map((c) => c.name);
  if (!columnas.includes('duracion_min')) {
    db.exec('ALTER TABLE tutorias ADD COLUMN duracion_min INTEGER NOT NULL DEFAULT 60');
  }
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tutorias_docente_fecha ON tutorias(docente_id, fecha);
    CREATE INDEX IF NOT EXISTS idx_tutorias_estudiante_fecha ON tutorias(estudiante_id, fecha);
  `);
}

module.exports = { crearConexion, migrar };
