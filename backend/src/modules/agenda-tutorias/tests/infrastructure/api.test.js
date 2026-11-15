'use strict';
// Prueba de INTEGRACIÓN extremo a extremo: Express + SQLite (:memory:) + JWT reales, sin dobles.
const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { cargarConfig } = require('../../src/infrastructure/config/env');
const { construirAplicacion } = require('../../src/infrastructure/composition/contenedor');

const config = cargarConfig({ DB_PATH: ':memory:', JWT_SECRET: 'secreto-de-prueba' });
const { app, db } = construirAplicacion(config);
let servidor; let base;

const insertar = db.prepare('INSERT INTO usuarios (nombres, apellidos, correo, rol, activo) VALUES (?,?,?,?,1)');
const ids = {};
for (const [clave, rol] of [['admin', 'admin'], ['docente', 'docente'], ['docente2', 'docente'], ['estudiante', 'estudiante'], ['estudiante2', 'estudiante']]) {
  ids[clave] = Number(insertar.run(clave, 'Prueba', `${clave}@amigo.edu.co`, rol).lastInsertRowid);
}
const token = (clave, opciones = { expiresIn: '1h' }) => jwt.sign({ id: ids[clave], correo: `${clave}@amigo.edu.co`, rol: clave.replace(/\d/, '') }, config.jwtSecret, opciones);
const T = Object.fromEntries(Object.keys(ids).map((k) => [k, token(k)]));

// Fecha futura en hora de Colombia (UTC-5), para que las reglas de tiempo se cumplan con el reloj real
const enDias = (n) => new Date(Date.now() - 5 * 3600_000 + n * 86_400_000).toISOString().slice(0, 10);

async function llamar(metodo, ruta, { tk, cuerpo, crudo } = {}) {
  const res = await fetch(base + ruta, {
    method: metodo,
    headers: { ...(tk ? { Authorization: `Bearer ${tk}` } : {}), ...(cuerpo || crudo ? { 'Content-Type': 'application/json' } : {}) },
    body: crudo ?? (cuerpo ? JSON.stringify(cuerpo) : undefined),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}
const solicitud = (extra = {}) => ({ docente_id: ids.docente, asignatura: 'Cálculo Diferencial', modalidad: 'Virtual', fecha: enDias(10), hora: '10:00', ...extra });

db.prepare('INSERT INTO perfiles_estudiante (usuario_id, codigo) VALUES (?,?)').run(ids.estudiante2, '2024001234');

test.before(async () => { servidor = app.listen(0); await new Promise((r) => servidor.once('listening', r)); base = `http://127.0.0.1:${servidor.address().port}`; });
test.after(() => { servidor.close(); db.close(); });

test('401: sin token, token basura y token expirado', async () => {
  assert.equal((await llamar('GET', '/api/tutorias')).status, 401);
  assert.equal((await llamar('GET', '/api/tutorias', { tk: 'basura' })).status, 401);
  const expirado = jwt.sign({ id: ids.estudiante, rol: 'estudiante' }, config.jwtSecret, { expiresIn: -10 });
  assert.equal((await llamar('GET', '/api/tutorias', { tk: expirado })).status, 401);
  const otroSecreto = jwt.sign({ id: ids.estudiante, rol: 'estudiante' }, 'otro-secreto');
  assert.equal((await llamar('GET', '/api/tutorias', { tk: otroSecreto })).status, 401);
});

test('Swagger: /api/docs.json expone la especificación y /api/ping responde sin token', async () => {
  const spec = await llamar('GET', '/api/docs.json');
  assert.equal(spec.status, 200);
  assert.ok(spec.json.paths['/api/tutorias/{id}/cancelar']);
  assert.equal((await llamar('GET', '/api/ping')).status, 200);
});

test('400: validación estricta con detalle por campo y JSON malformado', async () => {
  const r = await llamar('POST', '/api/tutorias', { tk: T.estudiante, cuerpo: { asignatura: 'x', modalidad: 'Zoom', fecha: '2030-02-30', hora: '25:00', duracion_min: 20 } });
  assert.equal(r.status, 400);
  assert.deepEqual(r.json.detalles.map((d) => d.campo).sort(), ['asignatura', 'duracion_min', 'fecha', 'hora', 'modalidad']);
  assert.equal((await llamar('POST', '/api/tutorias', { tk: T.estudiante, crudo: '{no es json' })).status, 400);
  assert.equal((await llamar('GET', '/api/tutorias/abc', { tk: T.estudiante })).status, 400);
  assert.equal((await llamar('GET', '/api/tutorias?estado=raro', { tk: T.estudiante })).status, 400);
});

test('Flujo CRUD completo + endpoints de negocio', async () => {
  // POST → 201 (estudiante: pendiente)
  const creada = await llamar('POST', '/api/tutorias', { tk: T.estudiante, cuerpo: solicitud() });
  assert.equal(creada.status, 201);
  const id = creada.json.tutoria.id;
  assert.equal(creada.json.tutoria.estado, 'pendiente');
  assert.equal(creada.json.tutoria.estudiante_id, ids.estudiante);

  // GET lista / por id
  assert.equal((await llamar('GET', '/api/tutorias', { tk: T.estudiante })).json.length, 1);
  assert.equal((await llamar('GET', `/api/tutorias/${id}`, { tk: T.docente })).status, 200);
  assert.equal((await llamar('GET', '/api/tutorias', { tk: T.estudiante2 })).json.length, 0, 've solo lo suyo');
  assert.equal((await llamar('GET', `/api/tutorias/${id}`, { tk: T.estudiante2 })).status, 403);
  assert.equal((await llamar('GET', '/api/tutorias/99999', { tk: T.admin })).status, 404);

  // 409 por RN-01 (solape con el docente)
  const choque = await llamar('POST', '/api/tutorias', { tk: T.estudiante2, cuerpo: solicitud({ hora: '10:30' }) });
  assert.equal(choque.status, 409);
  assert.equal(choque.json.codigo, 'RN-01');

  // 409 por RN-02 (pasado) y RN-04 (fuera de horario)
  assert.equal((await llamar('POST', '/api/tutorias', { tk: T.estudiante2, cuerpo: solicitud({ fecha: '2020-01-01' }) })).json.codigo, 'RN-02');
  assert.equal((await llamar('POST', '/api/tutorias', { tk: T.estudiante2, cuerpo: solicitud({ hora: '05:00' }) })).json.codigo, 'RN-04');

  // Disponibilidad refleja el choque
  const disp = await llamar('GET', `/api/tutorias/disponibilidad?docente_id=${ids.docente}&fecha=${enDias(10)}`, { tk: T.estudiante2 });
  assert.equal(disp.status, 200);
  assert.ok(disp.json.horarios_libres.includes('09:00') && !disp.json.horarios_libres.includes('10:30'));

  // Confirmar: estudiante 403 → docente 200 → repetir 409
  assert.equal((await llamar('PATCH', `/api/tutorias/${id}/confirmar`, { tk: T.estudiante })).status, 403);
  assert.equal((await llamar('PATCH', `/api/tutorias/${id}/confirmar`, { tk: T.docente })).json.tutoria.estado, 'confirmada');
  assert.equal((await llamar('PATCH', `/api/tutorias/${id}/confirmar`, { tk: T.docente })).status, 409);

  // Realizar antes de empezar → 409 RN-06
  assert.equal((await llamar('PATCH', `/api/tutorias/${id}/realizar`, { tk: T.docente })).json.codigo, 'RN-06');

  // PUT: reprogramar (200) y chocar con otra (409)
  const otra = await llamar('POST', '/api/tutorias', { tk: T.estudiante2, cuerpo: solicitud({ hora: '14:00' }) });
  assert.equal(otra.status, 201);
  const put = await llamar('PUT', `/api/tutorias/${id}`, { tk: T.estudiante, cuerpo: solicitud({ hora: '11:00', duracion_min: 90 }) });
  assert.equal(put.status, 200);
  assert.equal(put.json.tutoria.hora_fin, '12:30');
  assert.equal((await llamar('PUT', `/api/tutorias/${id}`, { tk: T.estudiante, cuerpo: solicitud({ hora: '13:30' }) })).json.codigo, 'RN-01');

  // Cancelar (>24 h → 200) y repetir (409 RN-05)
  assert.equal((await llamar('PATCH', `/api/tutorias/${id}/cancelar`, { tk: T.estudiante })).json.tutoria.estado, 'cancelada');
  assert.equal((await llamar('PATCH', `/api/tutorias/${id}/cancelar`, { tk: T.estudiante })).json.codigo, 'RN-05');
  assert.equal((await llamar('PUT', `/api/tutorias/${id}`, { tk: T.estudiante, cuerpo: solicitud() })).json.codigo, 'RN-05');

  // DELETE: estudiante 403, admin 200, luego 404
  assert.equal((await llamar('DELETE', `/api/tutorias/${otra.json.tutoria.id}`, { tk: T.estudiante2 })).status, 403);
  assert.equal((await llamar('DELETE', `/api/tutorias/${otra.json.tutoria.id}`, { tk: T.admin })).status, 200);
  assert.equal((await llamar('DELETE', `/api/tutorias/${otra.json.tutoria.id}`, { tk: T.admin })).status, 404);

  // Efecto en el adaptador de notificaciones
  const avisos = db.prepare('SELECT COUNT(*) AS n FROM notificaciones WHERE usuario_id=?').get(ids.docente).n;
  assert.ok(avisos >= 2);
});

test('RN-03 vía HTTP: cancelar con <24 h → 409; el admin sí puede', async (ctx) => {
  const ahoraBogota = Date.now() - 5 * 3600_000;
  const manana = new Date(ahoraBogota + 20 * 3600_000); // dentro de 20 h
  const fecha = manana.toISOString().slice(0, 10);
  const hora = manana.toISOString().slice(11, 16);
  const minutos = Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3));
  if (minutos < 6 * 60 || minutos + 60 > 22 * 60) return ctx.skip('Escenario no armable a esta hora del día (cae fuera del horario institucional)');
  const t = await llamar('POST', '/api/tutorias', { tk: T.admin, cuerpo: { ...solicitud({ fecha, hora }), estudiante_id: ids.estudiante2, docente_id: ids.docente2 } });
  assert.equal(t.status, 201);
  assert.equal(t.json.tutoria.estado, 'confirmada');
  const r = await llamar('PATCH', `/api/tutorias/${t.json.tutoria.id}/cancelar`, { tk: T.estudiante2 });
  assert.equal(r.status, 409);
  assert.equal(r.json.codigo, 'RN-03');
  assert.equal((await llamar('PATCH', `/api/tutorias/${t.json.tutoria.id}/cancelar`, { tk: T.admin })).status, 200);
});

test('Suplantación: el body no puede forzar otro estudiante', async () => {
  const r = await llamar('POST', '/api/tutorias', { tk: T.estudiante, cuerpo: { ...solicitud({ hora: '16:00' }), estudiante_id: ids.estudiante2 } });
  assert.equal(r.status, 403);
});

test('Ruta inexistente → 404 JSON', async () => {
  const r = await llamar('GET', '/api/nada', { tk: T.admin });
  assert.equal(r.status, 404);
});

test('Docentes para el selector + el docente programa por código de estudiante + nombres en el listado', async () => {
  const docs = await llamar('GET', '/api/tutorias/docentes', { tk: T.estudiante });
  assert.equal(docs.status, 200);
  assert.deepEqual(docs.json.map((d) => d.id).sort(), [ids.docente, ids.docente2].sort());

  const creada = await llamar('POST', '/api/tutorias', { tk: T.docente2, cuerpo: {
    asignatura: 'Física Mecánica', modalidad: 'Presencial', fecha: enDias(12), hora: '08:00', estudiante_codigo: '2024001234' } });
  assert.equal(creada.status, 201);
  assert.equal(creada.json.tutoria.estudiante_id, ids.estudiante2);
  assert.equal(creada.json.tutoria.estado, 'confirmada');

  const lista = await llamar('GET', '/api/tutorias', { tk: T.docente2 });
  assert.equal(lista.json[0].nombre_estudiante, 'estudiante2 Prueba');
  assert.equal(lista.json[0].nombre_docente, 'docente2 Prueba');

  const noExiste = await llamar('POST', '/api/tutorias', { tk: T.docente2, cuerpo: {
    asignatura: 'Física Mecánica', modalidad: 'Presencial', fecha: enDias(12), hora: '08:00', estudiante_codigo: '999' } });
  assert.equal(noExiste.status, 404);
});

test('El mensaje de error 400 es legible por el frontend (campo + motivo)', async () => {
  const r = await llamar('POST', '/api/tutorias', { tk: T.estudiante, cuerpo: { asignatura: 'Cálculo', modalidad: 'Zoom', fecha: enDias(10), hora: '10:00' } });
  assert.equal(r.status, 400);
  assert.match(r.json.error, /modalidad/);
});
