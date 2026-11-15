'use strict';

const { ReglaNegocioError } = require('../errors/ErroresDominio');
const { RangoHorario, aHora } = require('../value-objects/RangoHorario');

const APERTURA_MIN = 6 * 60;
const CIERRE_MIN = 22 * 60;
const MS_HORA = 3_600_000;

/** Devuelve la tutoría activa que choca con el rango, o null. `ignorarId` permite reprogramar sin chocar consigo misma. */
function buscarChoque(rango, existentes, ignorarId = null) {
  // Solo se ignora una tutoría si SE PIDIÓ ignorarla; `null !== null` nunca debe descartar un choque real.
  const esLaIgnorada = (t) => ignorarId !== null && t.id === ignorarId;
  return existentes.find((t) => !esLaIgnorada(t) && t.estaActiva() && t.rango.solapaCon(rango)) ?? null;
}

function verificarSinSolapamiento(rango, existentes, sujeto, ignorarId = null) {
  const choque = buscarChoque(rango, existentes, ignorarId);
  if (choque) {
    throw new ReglaNegocioError(
      `${sujeto} ya tiene una tutoría de ${choque.rango.hora} a ${choque.rango.horaFin} que se cruza con la solicitada`,
      'RN-01',
    );
  }
}

function cumpleAnticipacion(rango, ahoraMs, horasMinimas) {
  return rango.inicioMs - ahoraMs >= horasMinimas * MS_HORA;
}

function verificarAnticipacion(rango, ahoraMs, horasMinimas) {
  if (!cumpleAnticipacion(rango, ahoraMs, horasMinimas)) {
    throw new ReglaNegocioError(
      `La tutoría debe programarse con al menos ${horasMinimas} h de anticipación (y no en el pasado)`,
      'RN-02',
    );
  }
}

function dentroDeHorarioInstitucional(rango) {
  return rango.minutoInicio >= APERTURA_MIN && rango.minutoFin <= CIERRE_MIN;
}

function verificarHorarioInstitucional(rango) {
  if (!dentroDeHorarioInstitucional(rango)) {
    throw new ReglaNegocioError(
      `La tutoría debe quedar entre ${aHora(APERTURA_MIN)} y ${aHora(CIERRE_MIN)} (horario institucional)`,
      'RN-04',
    );
  }
}

/** Horas de inicio libres para un docente en una fecha. Reusa EXACTAMENTE las mismas reglas (sin duplicarlas). */
function calcularHuecosLibres({ fecha, duracionMin, tutoriasDelDia, ahoraMs, horasAnticipacion, pasoMin = 30 }) {
  const libres = [];
  for (let m = APERTURA_MIN; m + duracionMin <= CIERRE_MIN; m += pasoMin) {
    const rango = new RangoHorario({ fecha, hora: aHora(m), duracionMin });
    if (cumpleAnticipacion(rango, ahoraMs, horasAnticipacion) && !buscarChoque(rango, tutoriasDelDia)) {
      libres.push(rango.hora);
    }
  }
  return libres;
}

module.exports = {
  buscarChoque, verificarSinSolapamiento, cumpleAnticipacion, verificarAnticipacion,
  verificarHorarioInstitucional, calcularHuecosLibres, APERTURA_MIN, CIERRE_MIN,
};
