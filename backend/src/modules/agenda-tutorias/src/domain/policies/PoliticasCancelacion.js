'use strict';
// DOMINIO · PATRÓN STRATEGY. RN-03: cuánta anticipación exige cancelar/reprogramar depende del rol.
// Cada política es intercambiable; el caso de uso solo conoce la interfaz `verificar()` (DIP + OCP):
// para un rol nuevo (ej. "coordinador") se agrega una clase y se registra, SIN tocar CancelarTutoria.
const { ReglaNegocioError, ProhibidoError } = require('../errors/ErroresDominio');

const MS_HORA = 3_600_000;

/** Interfaz de la estrategia. */
class PoliticaCancelacion {
  // eslint-disable-next-line no-unused-vars
  verificar(tutoria, ahoraMs) { throw new Error('PoliticaCancelacion.verificar() no implementado'); }
}

class PoliticaPorAnticipacion extends PoliticaCancelacion {
  constructor(horasMinimas) { super(); this.horasMinimas = horasMinimas; }
  verificar(tutoria, ahoraMs) {
    const faltan = (tutoria.rango.inicioMs - ahoraMs) / MS_HORA;
    if (faltan < this.horasMinimas) {
      throw new ReglaNegocioError(
        `Solo se puede cancelar o reprogramar con ${this.horasMinimas} h de anticipación `
        + `(faltan ${Math.max(0, faltan).toFixed(1)} h)`,
        'RN-03',
      );
    }
  }
}

class PoliticaSinRestriccion extends PoliticaCancelacion {
  verificar() { /* el administrador puede cancelar en cualquier momento */ }
}

/** Resuelve la estrategia según el rol del actor. */
class SelectorPoliticaCancelacion {
  constructor(politicasPorRol) { this.politicasPorRol = politicasPorRol; }
  para(rol) {
    const politica = this.politicasPorRol[rol];
    if (!politica) throw new ProhibidoError(`El rol "${rol}" no puede cancelar tutorías`);
    return politica;
  }
}

module.exports = { PoliticaCancelacion, PoliticaPorAnticipacion, PoliticaSinRestriccion, SelectorPoliticaCancelacion };
