

### 3. Arrancar el backend
```bash
cd backend
npm run dev
# o: npm start
```
El servidor queda en http://localhost:3000
La base de datos SQLite se crea automáticamente en `backend/data/conectaprofe.db`



## 📅 V19 — Módulo Agenda de Tutorías (Arquitectura Hexagonal)

La lógica de tutorías salió del controlador y ahora vive en `backend/src/modules/agenda-tutorias/` bajo **Arquitectura Hexagonal** (dominio → aplicación → infraestructura). `tutoriasController.js` y `tutorias.routes.js` fueron **eliminados**; `app.js` monta el módulo con la misma BD y el mismo secreto JWT.

```bash
cd backend
npm install
npm run dev          # Swagger del módulo: http://localhost:3000/api/docs
npm test             # 41 pruebas (dominio, casos de uso, API, arquitectura)
```

### Endpoints (`/api/tutorias`, todos con `Authorization: Bearer <token>`)
`POST /` · `GET /` · `GET /:id` · `PUT /:id` · `DELETE /:id` (solo admin) · `PATCH /:id/cancelar` · `PATCH /:id/confirmar` · `PATCH /:id/realizar` · `GET /disponibilidad` · `GET /docentes`

### Reglas de negocio 
RN-01 sin solape de horario (docente y estudiante) · RN-02 anticipación mínima 2 h · RN-03 plazo para cancelar/reprogramar (estudiante 24 h, docente 12 h, admin sin límite) · RN-04 horario 06:00–22:00 · RN-05 estados válidos · RN-06 no completar antes de empezar.



