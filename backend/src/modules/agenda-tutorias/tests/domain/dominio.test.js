'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { RangoHorario } = require('../../src/domain/value-objects/RangoHorario');
const { Tutoria } = require('../../src/domain/entities/Tutoria');
const { EstadoTutoria } = require('../../src/domain/value-objects/Catalogos');
const reglas = require('../../src/domain/services/ReglasAgenda');
const { TutoriaFactory } = require('../../src/domain/factories/TutoriaFactory');
const { PoliticaPorAnticipacion, PoliticaSinRestriccion, SelectorPoliticaCancelacion } = require('../../src/domain/policies/PoliticasCancelacion');
const { ValidacionError, ReglaNegocioError, ProhibidoError } = require('../../src/domain/errors/ErroresDominio');
const { tutoriaDe, AHORA, actor } = require('../helpers/fakes');

const rango = (hora, duracionMin = 60, fecha = '2030-03-10') => new RangoHorario({ fecha, hora, duracionMin });

test('RangoHorario: rechaza fechas inexistentes, horas y duraciones inválidas', () => {
  assert.throws(() => rango('25:00'), ValidacionError);
  assert.throws(() => new RangoHorario({ fecha: '2030-02-30', hora: '10:00', duracionMin: 60 }), ValidacionError);
  assert.throws(() => rango('10:00', 20), ValidacionError);
  assert.throws(() => rango('10:00', 50), ValidacionError); // no múltiplo de 15
  assert.equal(rango('10:00', 90).horaFin, '11:30');
});

test('RangoHorario: el solape usa intervalos semiabiertos [inicio, fin)', () => {
  assert.equal(rango('10:00').solapaCon(rango('10:30')), true);
  assert.equal(rango('10:00').solapaCon(rango('09:30')), true);
  assert.equal(rango('10:00').solapaCon(rango('11:00')), false, 'tutorías contiguas NO chocan');
  assert.equal(rango('10:00').solapaCon(rango('09:00')), false);
  assert.equal(rango('10:00', 180).solapaCon(rango('11:00', 30)), true, 'una contenida en otra');
  assert.equal(rango('10:00').solapaCon(rango('10:00', 60, '2030-03-11')), false, 'otro día');
});

test('RangoHorario: no depende de la zona horaria del servidor (siempre UTC-5)', () => {
  assert.equal(new Date(rango('10:00').inicioMs).toISOString(), '2030-03-10T15:00:00.000Z');
});

test('RN-01: detecta choque con tutorías activas e ignora canceladas y la propia', () => {
  const existentes = [tutoriaDe({ id: 1, hora: '10:00' }), tutoriaDe({ id: 2, hora: '14:00', estado: EstadoTutoria.CANCELADA })];
  assert.throws(() => reglas.verificarSinSolapamiento(rango('10:30'), existentes, 'El docente'), (e) => e.codigo === 'RN-01');
  assert.doesNotThrow(() => reglas.verificarSinSolapamiento(rango('14:00'), existentes, 'El docente'), 'la cancelada libera el espacio');
  assert.doesNotThrow(() => reglas.verificarSinSolapamiento(rango('10:30'), existentes, 'El docente', 1), 'puede moverse sobre sí misma');
});

test('RN-02: exige 2 h de anticipación (exactamente 2 h sí pasa; 1 h 59 no)', () => {
  const justo = rango('10:00', 60, '2030-03-01'); // AHORA = 08:00 → faltan 2 h
  assert.doesNotThrow(() => reglas.verificarAnticipacion(justo, AHORA, 2));
  assert.throws(() => reglas.verificarAnticipacion(justo, AHORA + 60_000, 2), (e) => e.codigo === 'RN-02');
  assert.throws(() => reglas.verificarAnticipacion(rango('10:00', 60, '2030-02-01'), AHORA, 2), (e) => e.codigo === 'RN-02', 'pasado');
});

test('RN-04: horario institucional 06:00–22:00', () => {
  assert.doesNotThrow(() => reglas.verificarHorarioInstitucional(rango('06:00')));
  assert.doesNotThrow(() => reglas.verificarHorarioInstitucional(rango('21:00')));
  assert.throws(() => reglas.verificarHorarioInstitucional(rango('05:30')), (e) => e.codigo === 'RN-04');
  assert.throws(() => reglas.verificarHorarioInstitucional(rango('21:30')), (e) => e.codigo === 'RN-04');
});

test('calcularHuecosLibres reutiliza las reglas: excluye choques', () => {
  const libres = reglas.calcularHuecosLibres({
    fecha: '2030-03-10', duracionMin: 60, tutoriasDelDia: [tutoriaDe({ hora: '10:00' })], ahoraMs: AHORA, horasAnticipacion: 2,
  });
  assert.ok(libres.includes('09:00') && libres.includes('11:00'));
  assert.ok(!libres.includes('09:30') && !libres.includes('10:00') && !libres.includes('10:30'));
  assert.equal(libres.at(-1), '21:00');
});

test('Tutoria: máquina de estados', () => {
  const t = tutoriaDe({ estado: EstadoTutoria.PENDIENTE });
  assert.throws(() => t.completar(Date.parse('2030-03-11T00:00:00-05:00')), (e) => e.codigo === 'RN-05', 'pendiente no se completa');
  t.confirmar();
  assert.throws(() => t.confirmar(), (e) => e.codigo === 'RN-05');
  assert.throws(() => t.completar(AHORA), (e) => e.codigo === 'RN-06', 'aún no empieza');
  t.completar(Date.parse('2030-03-10T12:00:00-05:00'));
  assert.equal(t.estado, EstadoTutoria.COMPLETADA);
  assert.throws(() => t.cancelar(), (e) => e.codigo === 'RN-05');
});

test('Tutoria: docente y estudiante no pueden ser la misma persona', () => {
  assert.throws(() => tutoriaDe({ estudianteId: 2, docenteId: 2 }), ValidacionError);
});

test('Factory: el actor define las partes y el estado inicial', () => {
  const base = { asignatura: 'Cálculo', modalidad: 'Virtual', fecha: '2030-03-10', hora: '10:00' };
  const porEstudiante = TutoriaFactory.crear({ actor: actor(3), docenteId: 2, ...base });
  assert.equal(porEstudiante.estudianteId, 3);
  assert.equal(porEstudiante.estado, EstadoTutoria.PENDIENTE);
  const porDocente = TutoriaFactory.crear({ actor: actor(2), estudianteId: 3, ...base });
  assert.equal(porDocente.docenteId, 2);
  assert.equal(porDocente.estado, EstadoTutoria.CONFIRMADA);
  assert.throws(() => TutoriaFactory.crear({ actor: actor(3), estudianteId: 4, docenteId: 2, ...base }), ProhibidoError, 'suplantación');
  assert.throws(() => TutoriaFactory.crear({ actor: actor(3), ...base }), ValidacionError, 'falta docente');
});

test('Strategy: cada rol tiene su política; admin sin restricción', () => {
  const t = tutoriaDe({ fecha: '2030-03-02', hora: '08:00' }); // faltan 24 h exactos desde AHORA
  assert.doesNotThrow(() => new PoliticaPorAnticipacion(24).verificar(t, AHORA));
  assert.throws(() => new PoliticaPorAnticipacion(24).verificar(t, AHORA + 1000), (e) => e instanceof ReglaNegocioError && e.codigo === 'RN-03');
  assert.doesNotThrow(() => new PoliticaSinRestriccion().verificar(t, AHORA + 999_999_999));
  const selector = new SelectorPoliticaCancelacion({ docente: new PoliticaSinRestriccion() });
  assert.throws(() => selector.para('visitante'), ProhibidoError);
});
