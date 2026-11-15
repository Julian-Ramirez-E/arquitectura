'use strict';
// DOMINIO · Value Object inmutable: una fecha + hora de inicio + duración.
// Concentra TODA la aritmética de tiempo (DRY): ningún otro archivo calcula solapes con Date.
const { ValidacionError } = require('../errors/ErroresDominio');

// La institución está en Colombia (UTC-5, sin horario de verano). Se fija en el dominio para que
// el comportamiento NO dependa de la zona horaria del servidor/contenedor (Docker corre en UTC).
const OFFSET_INSTITUCIONAL = '-05:00';
const DURACION_MIN = 30;
const DURACION_MAX = 180;
const PASO_MIN = 15;

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const RE_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

function esFechaReal(fecha) {
  const [y, m, d] = fecha.split('-').map(Number);
  const f = new Date(Date.UTC(y, m - 1, d));
  return f.getUTCFullYear() === y && f.getUTCMonth() === m - 1 && f.getUTCDate() === d;
}

const pad = (n) => String(n).padStart(2, '0');
const aMinutos = (hora) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5));
const aHora = (min) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

class RangoHorario {
  /** Devuelve la lista de errores de formato sin lanzar (la reutiliza el DTO: DRY). */
  static errores({ fecha, hora, duracionMin }) {
    const errores = [];
    if (typeof fecha !== 'string' || !RE_FECHA.test(fecha) || !esFechaReal(fecha)) {
      errores.push({ campo: 'fecha', mensaje: 'Debe ser una fecha real con formato YYYY-MM-DD' });
    }
    if (typeof hora !== 'string' || !RE_HORA.test(hora)) {
      errores.push({ campo: 'hora', mensaje: 'Debe tener formato HH:mm (24 horas)' });
    }
    if (!Number.isInteger(duracionMin) || duracionMin < DURACION_MIN || duracionMin > DURACION_MAX
        || duracionMin % PASO_MIN !== 0) {
      errores.push({
        campo: 'duracion_min',
        mensaje: `Debe ser un entero entre ${DURACION_MIN} y ${DURACION_MAX}, múltiplo de ${PASO_MIN}`,
      });
    }
    return errores;
  }

  constructor({ fecha, hora, duracionMin = 60 }) {
    const errores = RangoHorario.errores({ fecha, hora, duracionMin });
    if (errores.length) throw new ValidacionError('Rango horario inválido', errores);

    this.fecha = fecha;
    this.hora = hora;
    this.duracionMin = duracionMin;
    this.inicioMs = Date.parse(`${fecha}T${hora}:00${OFFSET_INSTITUCIONAL}`);
    this.finMs = this.inicioMs + duracionMin * 60_000;
    this.minutoInicio = aMinutos(hora);
    this.minutoFin = this.minutoInicio + duracionMin;
    this.horaFin = aHora(this.minutoFin % (24 * 60));
    Object.freeze(this);
  }

  /** Intervalos semiabiertos [inicio, fin): una tutoría que termina a las 10:00 NO choca con una que empieza a las 10:00. */
  solapaCon(otro) {
    return this.inicioMs < otro.finMs && otro.inicioMs < this.finMs;
  }
}

module.exports = { RangoHorario, aHora, aMinutos, OFFSET_INSTITUCIONAL };
