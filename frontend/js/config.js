// Configuración central del frontend

const API_URL = "http://localhost:3000/api";

const CONFIG = {
  MODO_DEMO: false,

  // ── Reglas de negocio ───────────────────────────────
  PROMEDIO_MINIMO: 3.0,
  MAX_INTENTOS: 5,
  MINUTOS_BLOQUEO: 5,
  HORAS_CANCELACION: 24,
  MINUTOS_INACTIVIDAD: 120,

  // Dominio institucional permitido
  DOMINIO_CORREO: "@amigo.edu.co",
};
