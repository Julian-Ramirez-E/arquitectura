'use strict';
// Pruebas de los CASOS DE USO con repositorios en memoria: sin Express, sin SQLite, sin red. Corren en milisegundos.
const test = require('node:test');
const assert = require('node:assert/strict');
const { crearEscenario, datosSolicitud, actor, tutoriaDe, AHORA } = require('../helpers/fakes');
const { EstadoTutoria } = require('../../src/domain/value-objects/Catalogos');

const rechaza = (promesa, codigo) => assert.rejects(promesa, (e) => { assert.equal(e.codigo, codigo, e.message); return true; });

test('programar: estudiante solicita → pendiente y notifica a ambos', async () => {
  const { uc, notificador } = crearEscenario();
  const t = await uc.programar.ejecutar({ actor: actor(3), datos: datosSolicitud() });
  assert.equal(t.id, 1);
  assert.equal(t.estado, EstadoTutoria.PENDIENTE);
  assert.deepEqual(notificador.enviadas.map((n) => n.usuarioId).sort(), [2, 3]);
});

test('programar: RN-01 bloquea solape del docente Y del estudiante', async () => {
  const { uc } = crearEscenario();
  await uc.programar.ejecutar({ actor: actor(3), datos: datosSolicitud() });
  await rechaza(uc.programar.ejecutar({ actor: actor(4), datos: datosSolicitud({ hora: '10:30' }) }), 'RN-01'); // mismo docente
  await rechaza(uc.programar.ejecutar({ actor: actor(3), datos: datosSolicitud({ docenteId: 5, hora: '10:30' }) }), 'RN-01'); // mismo estudiante
  const ok = await uc.programar.ejecutar({ actor: actor(4), datos: datosSolicitud({ hora: '11:00' }) }); // contigua: permitida
  assert.equal(ok.rango.hora, '11:00');
});

test('programar: una tutoría cancelada libera el horario', async () => {
  const { uc } = crearEscenario();
  const t = await uc.programar.ejecutar({ actor: actor(3), datos: datosSolicitud() });
  await uc.cancelar.ejecutar({ actor: actor(3), id: t.id });
  const nueva = await uc.programar.ejecutar({ actor: actor(4), datos: datosSolicitud() });
  assert.equal(nueva.estado, EstadoTutoria.PENDIENTE);
});

test('programar: RN-02 (menos de 2 h) y RN-04 (fuera de horario)', async () => {
  const { uc } = crearEscenario();
  await rechaza(uc.programar.ejecutar({ actor: actor(3), datos: datosSolicitud({ fecha: '2030-03-01', hora: '09:59' }) }), 'RN-02');
  const ok = await uc.programar.ejecutar({ actor: actor(3), datos: datosSolicitud({ fecha: '2030-03-01', hora: '10:00' }) });
  assert.ok(ok.id);
  await rechaza(uc.programar.ejecutar({ actor: actor(4), datos: datosSolicitud({ hora: '05:00' }) }), 'RN-04');
});

test('programar: valida que docente/estudiante existan, tengan el rol correcto y estén activos', async () => {
  const { uc } = crearEscenario();
  await rechaza(uc.programar.ejecutar({ actor: actor(3), datos: datosSolicitud({ docenteId: 999 }) }), 'NO_ENCONTRADO');
  await rechaza(uc.programar.ejecutar({ actor: actor(3), datos: datosSolicitud({ docenteId: 4 }) }), 'VALIDACION'); // 4 es estudiante
  await rechaza(uc.programar.ejecutar({ actor: actor(1), datos: datosSolicitud({ estudianteId: 6 }) }), 'VALIDACION'); // inactivo
});

test('programar: docente programa → queda confirmada', async () => {
  const { uc } = crearEscenario();
  const t = await uc.programar.ejecutar({ actor: actor(2), datos: datosSolicitud({ docenteId: undefined, estudianteId: 3 }) });
  assert.equal(t.estado, EstadoTutoria.CONFIRMADA);
});

test('cancelar: RN-03 con plazos distintos por rol (Strategy en acción)', async () => {
  const sc = crearEscenario();
  const t = await sc.tutoriaRepo.guardar(tutoriaDe({ fecha: '2030-03-02', hora: '02:00'.replace('02', '06') })); // 2030-03-02 06:00 → faltan 22 h
  await rechaza(sc.uc.cancelar.ejecutar({ actor: actor(3), id: t.id }), 'RN-03');      // estudiante exige 24 h
  const cancelada = await sc.uc.cancelar.ejecutar({ actor: actor(2), id: t.id });      // docente exige 12 h
  assert.equal(cancelada.estado, EstadoTutoria.CANCELADA);
  assert.equal(sc.notificador.enviadas.at(-1).usuarioId, 3, 'avisa a la contraparte');

  const t2 = await sc.tutoriaRepo.guardar(tutoriaDe({ fecha: '2030-03-01', hora: '09:00' })); // faltan 1 h
  await rechaza(sc.uc.cancelar.ejecutar({ actor: actor(2), id: t2.id }), 'RN-03');
  const porAdmin = await sc.uc.cancelar.ejecutar({ actor: actor(1), id: t2.id });
  assert.equal(porAdmin.estado, EstadoTutoria.CANCELADA, 'admin sin restricción');
});

test('cancelar/obtener: 404 si no existe, 403 si no es participante, 409 si ya está cancelada', async () => {
  const sc = crearEscenario();
  const t = await sc.tutoriaRepo.guardar(tutoriaDe());
  await rechaza(sc.uc.cancelar.ejecutar({ actor: actor(3), id: 999 }), 'NO_ENCONTRADO');
  await rechaza(sc.uc.cancelar.ejecutar({ actor: actor(4), id: t.id }), 'PROHIBIDO');
  await sc.uc.cancelar.ejecutar({ actor: actor(3), id: t.id });
  await rechaza(sc.uc.cancelar.ejecutar({ actor: actor(3), id: t.id }), 'RN-05');
});

test('confirmar/realizar: solo el docente asignado; respeta estados y RN-06', async () => {
  const sc = crearEscenario();
  const t = await sc.uc.programar.ejecutar({ actor: actor(3), datos: datosSolicitud() });
  await rechaza(sc.uc.confirmar.ejecutar({ actor: actor(3), id: t.id }), 'PROHIBIDO');   // el estudiante no confirma
  await rechaza(sc.uc.confirmar.ejecutar({ actor: actor(5), id: t.id }), 'PROHIBIDO');   // otro docente tampoco
  await sc.uc.confirmar.ejecutar({ actor: actor(2), id: t.id });
  await rechaza(sc.uc.realizar.ejecutar({ actor: actor(2), id: t.id }), 'RN-06');        // aún no empieza
  sc.reloj.ms = Date.parse('2030-03-10T12:00:00-05:00');
  const hecha = await sc.uc.realizar.ejecutar({ actor: actor(2), id: t.id });
  assert.equal(hecha.estado, EstadoTutoria.COMPLETADA);
});

test('actualizar: reprograma validando RN-01/02/03/04 y sin chocar consigo misma', async () => {
  const sc = crearEscenario();
  const a = await sc.uc.programar.ejecutar({ actor: actor(3), datos: datosSolicitud() });                     // 10:00
  await sc.uc.programar.ejecutar({ actor: actor(4), datos: datosSolicitud({ hora: '14:00' }) });               // 14:00
  const movida = await sc.uc.actualizar.ejecutar({ actor: actor(3), id: a.id, cambios: { ...datosSolicitud(), hora: '10:30' } });
  assert.equal(movida.rango.hora, '10:30', 'puede solaparse con su propio horario anterior');
  await rechaza(sc.uc.actualizar.ejecutar({ actor: actor(3), id: a.id, cambios: { ...datosSolicitud(), hora: '14:30' } }), 'RN-01');
  await rechaza(sc.uc.actualizar.ejecutar({ actor: actor(3), id: a.id, cambios: { ...datosSolicitud(), hora: '05:00' } }), 'RN-04');
  sc.reloj.ms = Date.parse('2030-03-10T08:00:00-05:00'); // faltan 2 h < 24 h
  await rechaza(sc.uc.actualizar.ejecutar({ actor: actor(3), id: a.id, cambios: { ...datosSolicitud(), hora: '11:00' } }), 'RN-03');
});

test('listar: cada rol ve solo lo suyo; el filtro no puede ampliar el alcance', async () => {
  const sc = crearEscenario();
  await sc.uc.programar.ejecutar({ actor: actor(3), datos: datosSolicitud() });
  await sc.uc.programar.ejecutar({ actor: actor(4), datos: datosSolicitud({ docenteId: 5, hora: '12:00' }) });
  assert.equal((await sc.uc.listar.ejecutar({ actor: actor(3) })).length, 1);
  assert.equal((await sc.uc.listar.ejecutar({ actor: actor(2) })).length, 1);
  assert.equal((await sc.uc.listar.ejecutar({ actor: actor(1) })).length, 2);
  assert.equal((await sc.uc.listar.ejecutar({ actor: actor(3), filtros: { estudianteId: 4 } })).length, 1, 'el alcance del token manda');
});

test('disponibilidad: 404 si no es docente; 400 si parámetros inválidos', async () => {
  const sc = crearEscenario();
  await rechaza(sc.uc.disponibilidad.ejecutar({ docenteId: 3, fecha: '2030-03-10', duracionMin: 60 }), 'NO_ENCONTRADO');
  await rechaza(sc.uc.disponibilidad.ejecutar({ docenteId: 2, fecha: 'mañana', duracionMin: 60 }), 'VALIDACION');
  const r = await sc.uc.disponibilidad.ejecutar({ docenteId: 2, fecha: '2030-03-10', duracionMin: 60 });
  assert.ok(r.horariosLibres.length > 0);
});

test('el reloj es inyectable: AHORA fijo hace las reglas deterministas', () => {
  assert.equal(crearEscenario().reloj.ahoraMs(), AHORA);
});

test('programar: el docente identifica al estudiante por CÓDIGO institucional', async () => {
  const { uc } = crearEscenario();
  const t = await uc.programar.ejecutar({ actor: actor(2), datos: datosSolicitud({ docenteId: undefined, estudianteCodigo: '2024004' }) });
  assert.equal(t.estudianteId, 4);
  await rechaza(uc.programar.ejecutar({ actor: actor(2), datos: datosSolicitud({ docenteId: undefined, estudianteCodigo: 'no-existe' }) }), 'NO_ENCONTRADO');
});

test('listar: incluye el nombre de ambas partes (lo muestra el frontend)', async () => {
  const { uc } = crearEscenario();
  await uc.programar.ejecutar({ actor: actor(3), datos: datosSolicitud() });
  const [fila] = await uc.listar.ejecutar({ actor: actor(3) });
  assert.equal(fila.nombreDocente, 'Diego Docente');
  assert.equal(fila.nombreEstudiante, 'Sara Estudiante');
});

test('docentes: lista solo docentes activos', async () => {
  const { uc } = crearEscenario();
  assert.deepEqual((await uc.docentes.ejecutar()).map((d) => d.id), [2, 5]);
});
