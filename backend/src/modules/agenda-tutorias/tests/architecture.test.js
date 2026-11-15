'use strict';
// PRUEBA DE ARQUITECTURA: hace CUMPLIR la regla de dependencias de la Arquitectura Hexagonal.
//   domain/          → no importa nada de application/ ni infrastructure/ ni librerías externas.
//   application/     → solo importa domain/ (y sí misma). Jamás infrastructure/ ni frameworks.
//   infrastructure/  → puede importar hacia adentro (application, domain).
// Si alguien, por prisa, mete `require('express')` en un caso de uso, ESTA prueba falla.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SRC = path.join(__dirname, '..', 'src');
const PAQUETES_PROHIBIDOS = /^(express|cors|better-sqlite3|jsonwebtoken|dotenv|swagger-ui-express|node:fs|node:path|fs|path|http)$/;

function archivos(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const ruta = path.join(dir, e.name);
    return e.isDirectory() ? archivos(ruta) : ruta.endsWith('.js') ? [ruta] : [];
  });
}
function importsDe(archivo) {
  return [...fs.readFileSync(archivo, 'utf8').matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]);
}
function capaDestino(archivo, importado) {
  const abs = path.resolve(path.dirname(archivo), importado);
  return path.relative(SRC, abs).split(path.sep)[0];
}

for (const capa of ['domain', 'application']) {
  test(`${capa}/ no depende de frameworks ni de librerías de infraestructura`, () => {
    for (const f of archivos(path.join(SRC, capa))) {
      for (const imp of importsDe(f).filter((i) => !i.startsWith('.'))) {
        assert.doesNotMatch(imp, PAQUETES_PROHIBIDOS, `${path.relative(SRC, f)} importa "${imp}"`);
      }
    }
  });
}

test('domain/ no importa application/ ni infrastructure/', () => {
  for (const f of archivos(path.join(SRC, 'domain'))) {
    for (const imp of importsDe(f).filter((i) => i.startsWith('.'))) {
      assert.equal(capaDestino(f, imp), 'domain', `${path.relative(SRC, f)} → ${imp}`);
    }
  }
});

test('application/ solo importa domain/ y application/ (nunca infrastructure/)', () => {
  for (const f of archivos(path.join(SRC, 'application'))) {
    for (const imp of importsDe(f).filter((i) => i.startsWith('.'))) {
      assert.ok(['domain', 'application'].includes(capaDestino(f, imp)), `${path.relative(SRC, f)} → ${imp}`);
    }
  }
});

test('los repositorios y controladores no contienen reglas de negocio (no importan ReglasAgenda ni políticas)', () => {
  const prohibidos = /ReglasAgenda|PoliticasCancelacion/;
  const ruta = path.join(SRC, 'infrastructure', 'adapters');
  for (const f of archivos(ruta)) {
    for (const imp of importsDe(f)) assert.doesNotMatch(imp, prohibidos, `${path.relative(SRC, f)} importa "${imp}"`);
  }
});
