'use strict';
// APLICACIÓN · Caso de uso: listar. La regla "cada quien ve lo suyo" es de negocio, por eso vive AQUÍ
// y no en el SQL del repositorio ni en el controlador. Devuelve además los nombres de ambas partes
// (el frontend de ConectaProfe los muestra en las tarjetas).
const { CasoDeUsoPort } = require('../ports/in/CasoDeUsoPort');
const { Rol } = require('../../domain/value-objects/Catalogos');

class ListarTutorias extends CasoDeUsoPort {
  constructor({ tutoriaRepo, usuarioRepo }) { super(); Object.assign(this, { tutoriaRepo, usuarioRepo }); }

  async ejecutar({ actor, filtros = {} }) {
    const alcance = {
      [Rol.ESTUDIANTE]: { estudianteId: actor.id },
      [Rol.DOCENTE]: { docenteId: actor.id },
      [Rol.ADMIN]: {},
    }[actor.rol];
    const tutorias = await this.tutoriaRepo.listar({ ...filtros, ...alcance }); // el alcance NUNCA se puede sobreescribir

    const nombres = new Map(); // caché por petición: evita consultar 200 veces al mismo usuario
    const nombreDe = async (id) => {
      if (!nombres.has(id)) nombres.set(id, (await this.usuarioRepo.buscarPorId(id))?.nombre ?? null);
      return nombres.get(id);
    };
    const resultado = [];
    for (const tutoria of tutorias) {
      resultado.push({ tutoria, nombreDocente: await nombreDe(tutoria.docenteId), nombreEstudiante: await nombreDe(tutoria.estudianteId) });
    }
    return resultado;
  }
}
module.exports = { ListarTutorias };
