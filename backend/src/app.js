const express  = require('express');
const cors     = require('cors');
const morgan   = require('morgan');
const session  = require('express-session');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

// Inicializar passport (carga la estrategia de Google)
require('./config/passport');
const passport = require('passport');

// Módulo Agenda de Tutorías (Arquitectura Hexagonal): comparte BD y secreto JWT con el resto del backend
const { db }                         = require('./config/db');
const { SECRETO }                    = require('./config/jwt');
const { crearRouterAgenda }          = require('./modules/agenda-tutorias/src');
const { openapi }                    = require('./modules/agenda-tutorias/src/infrastructure/adapters/in/http/docs/openapi');

const app = express();

// ── Middlewares globales ────────────────────────────────
app.use(cors({
  origin: true,        // permite cualquier origen en desarrollo
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// Sesión mínima para que passport-google-oauth20 funcione en el callback
app.use(session({
  secret:            process.env.SESSION_SECRET || 'secreto-local-dev',
  resave:            false,
  saveUninitialized: false,
  cookie:            { secure: false } // true solo con HTTPS en producción
}));

app.use(passport.initialize());
app.use(passport.session());

// ── Rutas ───────────────────────────────────────────────
app.use('/api/auth',           require('./routes/auth.routes'));
app.use('/api/perfil',         require('./routes/perfil.routes'));
app.use('/api/tutorias',       crearRouterAgenda({ db, jwtSecret: SECRETO })); // ← módulo hexagonal
app.use('/api/docs',           swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: 'ConectaProfe — Agenda de Tutorías' }));
app.use('/api/admin',          require('./routes/admin.routes'));
app.use('/api/notificaciones', require('./routes/notificaciones.routes'));

// Ruta de estado
app.get('/api/ping', (req, res) => res.json({ estado: 'ok', hora: new Date().toISOString() }));

// 404
app.use((req, res) => res.status(404).json({ error: `${req.method} ${req.url} no existe` }));

// Error global
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;
