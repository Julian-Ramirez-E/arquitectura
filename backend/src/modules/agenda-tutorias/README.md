> **Nota:** este README describe el módulo en modo **independiente**. Dentro de ConectaProfe se monta desde `backend/src/app.js` (misma BD, mismo JWT); ver el README raíz, sección *V19*. Su `src/main.js` sigue permitiendo ejecutarlo solo.

# 📅 Agenda de Tutorías — ConectaProfe

Módulo de **Agenda de Tutorías** del sistema ConectaProfe (Universidad Católica Luis Amigó), construido con **Arquitectura Hexagonal (Puertos y Adaptadores)**.
Reemplaza la lógica que antes vivía dentro de `tutoriasController.js` por un núcleo de negocio puro, testeable y desacoplado de Express y SQLite.

| | |
|---|---|
| **Lenguaje / Framework** | Node.js 20+ · Express 4 |
| **Base de datos** | SQLite (`better-sqlite3`) — la misma que usa ConectaProfe |
| **Seguridad** | Bearer **JWT** (mismo formato que el login de ConectaProfe) |
| **Documentación** | Swagger UI / OpenAPI 3 |
| **Pruebas** | `node:test` — 41 pruebas (dominio, casos de uso, API, arquitectura) |

## ✅ Reglas de negocio

| Código | Regla | Respuesta |
|---|---|---|
| **RN-01** | El docente **ni** el estudiante pueden tener dos tutorías activas con horarios que se crucen | `409` |
| **RN-02** | Programar con al menos **2 h** de anticipación (y nunca en el pasado) | `409` |
| **RN-03** | Cancelar/reprogramar con anticipación según rol: estudiante **24 h**, docente **12 h**, admin sin límite | `409` |
| **RN-04** | Solo dentro del horario institucional **06:00–22:00** (hora de Colombia, UTC-5) | `409` |
| **RN-05** | Transiciones de estado válidas (`pendiente → confirmada → completada`; `cancelada` desde activas) | `409` |
| **RN-06** | No se marca como realizada una tutoría que aún no ha comenzado | `409` |

Las horas son configurables por variables de entorno (ver abajo).

## 🚀 Requisitos

- **Node.js 20 o superior** (probado en Node 22) y npm
- *(Opcional)* Docker y Docker Compose

## ⚙️ Instalación y ejecución local

```bash
npm install
cp .env.example .env        # en Windows: copy .env.example .env
npm run seed                # crea usuarios de prueba e IMPRIME tokens JWT listos para usar
npm run dev                 # o: npm start
```

Servidor: <http://localhost:3000> · **Swagger UI: <http://localhost:3000/api/docs>** · Estado: <http://localhost:3000/api/ping>

### Probarlo en Swagger
1. Ejecuta `npm run seed` y copia el token del rol que quieras (admin / docente / estudiante).
2. En Swagger pulsa **Authorize** y pega el token **sin** la palabra `Bearer`.
3. Usa `POST /api/tutorias` con el cuerpo de ejemplo (cambia `fecha` por una fecha futura).

### Con Docker
```bash
docker compose up --build -d
docker compose exec api npm run seed     # imprime los tokens de prueba
```
> La imagen no pudo ejecutarse en el entorno donde se generó este proyecto; el `Dockerfile` sigue el patrón estándar de Node + `better-sqlite3`. Si el build falla en tu máquina, usa la ejecución local.

## 🔧 Variables de entorno

| Variable | Defecto | Descripción |
|---|---|---|
| `PORT` | `3000` | Puerto HTTP |
| `DB_PATH` | `./data/agenda.db` | Archivo SQLite |
| `JWT_SECRET` | *(secreto de desarrollo)* | **Obligatorio si `NODE_ENV=production`**. Debe ser el mismo con que ConectaProfe firma tokens |
| `CORS_ORIGIN` | cualquiera | Origen permitido (ej. `http://localhost:5500`) |
| `RN_HORAS_ANTICIPACION_MIN` | `2` | RN-02 |
| `RN_HORAS_CANCELACION` | `24` | RN-03 estudiante |
| `RN_HORAS_CANCELACION_DOCENTE` | `12` | RN-03 docente |

## 🌐 Endpoints

Todos exigen `Authorization: Bearer <token>`.

| Método | Ruta | Descripción | Códigos |
|---|---|---|---|
| `POST` | `/api/tutorias` | Programar/solicitar (estudiante → `pendiente`; docente/admin → `confirmada`) | 201 · 400 · 401 · 403 · 404 · **409** |
| `GET` | `/api/tutorias` | Listar (cada rol ve lo suyo). Filtros: `?estado=&fecha=` | 200 · 400 · 401 |
| `GET` | `/api/tutorias/:id` | Obtener una | 200 · 400 · 401 · 403 · 404 |
| `PUT` | `/api/tutorias/:id` | Reprogramar/editar | 200 · 400 · 401 · 403 · 404 · **409** |
| `DELETE` | `/api/tutorias/:id` | Eliminar (solo admin; los usuarios *cancelan*) | 200 · 401 · 403 · 404 |
| `PATCH` | `/api/tutorias/:id/cancelar` | Cancelar (RN-03 por rol) | 200 · 401 · 403 · 404 · **409** |
| `PATCH` | `/api/tutorias/:id/confirmar` | Confirmar (docente asignado/admin) | 200 · 401 · 403 · 404 · **409** |
| `PATCH` | `/api/tutorias/:id/realizar` | Marcar realizada (docente asignado/admin) | 200 · 401 · 403 · 404 · **409** |
| `GET` | `/api/tutorias/docentes` | Docentes activos (selector de tutor) | 200 · 401 |
| `GET` | `/api/tutorias/disponibilidad?docente_id=&fecha=&duracion_min=` | Horas libres de un docente | 200 · 400 · 401 · 404 |

### Ejemplos

```bash
# Crear (como estudiante)
curl -X POST http://localhost:3000/api/tutorias \
  -H "Authorization: Bearer $TOKEN_ESTUDIANTE" -H "Content-Type: application/json" \
  -d '{"docente_id":2,"asignatura":"Cálculo Diferencial","modalidad":"Virtual","fecha":"2030-03-18","hora":"10:00","duracion_min":60}'
```
`201`
```json
{ "mensaje": "Tutoría registrada",
  "tutoria": { "id": 1, "estudiante_id": 4, "docente_id": 2, "asignatura": "Cálculo Diferencial",
    "modalidad": "Virtual", "fecha": "2030-03-18", "hora": "10:00", "hora_fin": "11:00",
    "duracion_min": 60, "estado": "pendiente", "observaciones": "", "creada_en": "2030-03-10 15:04:05" } }
```
Solape → `409`
```json
{ "error": "El docente ya tiene una tutoría de 10:00 a 11:00 que se cruza con la solicitada", "codigo": "RN-01" }
```
Datos inválidos → `400`
```json
{ "error": "Hay datos inválidos en la solicitud", "codigo": "VALIDACION",
  "detalles": [ { "campo": "modalidad", "mensaje": "Obligatoria: Virtual o Presencial" },
                { "campo": "fecha", "mensaje": "Debe ser una fecha real con formato YYYY-MM-DD" } ] }
```

## 🗂️ Estructura (resumen)

```
src/
├── domain/            Entidades, Value Objects, reglas, Strategy, Factory  (0 dependencias externas)
├── application/       Casos de uso + puertos de entrada/salida              (solo depende de domain)
└── infrastructure/    Adaptadores REST/JWT/Swagger y SQLite + composición   (conoce todo lo demás)
tests/                 Dominio · casos de uso (con dobles en memoria) · API E2E · arquitectura
docs/                  ARQUITECTURA.md · SUSTENTACION.md
```
Detalle completo y justificación en [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md).

## 🧪 Pruebas

```bash
npm test
```
41 pruebas: reglas de dominio, casos de uso con repositorios **en memoria**, API completa sobre SQLite real, y una **prueba de arquitectura** que falla si el dominio o la aplicación importan Express/SQLite/infraestructura.

## 🔌 Integración con ConectaProfe

- **Misma BD:** `DB_PATH=../conectaprofe/backend/data/conectaprofe.db`. La migración es idempotente y agrega la columna `duracion_min` (por defecto 60) a la tabla `tutorias` existente sin perder datos. Las notificaciones se escriben en la tabla `notificaciones` que ya consume su frontend.
- **Mismo login:** configura el mismo `JWT_SECRET`; los tokens de `/api/auth` funcionan aquí (`{ id, correo, rol }`).
- **Mismo contrato:** el frontend ya envía `docente_id, estudiante_id, asignatura, modalidad, fecha, hora, observaciones` y usa `PATCH /tutorias/:id/cancelar`; ambos son compatibles. Los errores usan la clave `error`, como el resto del backend.
- **Cómo montarlo:** ejecútalo en otro puerto (p. ej. `PORT=3001`) y apunta allí las llamadas de tutorías, o reemplaza `routes/tutorias.routes.js` de ConectaProfe por este módulo.
- Diferencia visible: la lista devuelve `estudiante_id`/`docente_id` (no `nombre_docente`/`nombre_estudiante` como el controlador anterior).

## ⚠️ Limitaciones conocidas

- **Concurrencia:** la verificación de solape y el `INSERT` no son una operación atómica a nivel de base de datos. Con un solo proceso Node + SQLite síncrono no se intercalan, pero con varias instancias o un motor remoto habría que agregar una restricción en BD (ver `docs/ARQUITECTURA.md` §6).
- No incluye *rate limiting*, `helmet`, revocación de tokens ni emisión de JWT (el login pertenece a ConectaProfe).
- `GET /api/tutorias` devuelve máximo 200 registros, sin paginación.
