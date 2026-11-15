// Base de datos SQLite — no requiere instalación de servidor
// El archivo se crea automáticamente en data/conectaprofe.db

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Crear carpeta data/ si no existe
const carpetaData = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(carpetaData)) {
  fs.mkdirSync(carpetaData, { recursive: true });
}

const rutaDB = path.join(carpetaData, 'conectaprofe.db');
const db = new Database(rutaDB);

// WAL mejora el rendimiento en operaciones concurrentes
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('✅ SQLite conectado:', rutaDB);

module.exports = { db };
