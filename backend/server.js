require('dotenv').config();
const app = require('./src/app');

// Inicializar la base de datos SQLite (crea tablas si no existen)
const { migrar } = require('./src/config/migrate');
migrar();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 ConectaProfe backend corriendo en http://localhost:${PORT}`);
  console.log(`   Google OAuth: http://localhost:${PORT}/api/auth/google`);
  console.log(`   Swagger:      http://localhost:${PORT}/api/docs`);
  console.log(`   Estado:       http://localhost:${PORT}/api/ping\n`);
});
