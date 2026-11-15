'use strict';
// Dobles de prueba: implementan los MISMOS puertos que SQLite, pero en memoria.
// Poder cambiarlos sin tocar el núcleo es la prueba viva del Principio de Inversión de Dependencias.
const { TutoriaRepositoryPort } = require('../../src/application/ports/out/TutoriaRepositoryPort');
const { UsuarioRepositoryPort } = require('../../src/application/ports/out/UsuarioRepositoryPort');
const { NotificadorPort } = require('../../src/application/ports/out/NotificadorPort');
const { RelojPort } = require('../../src/application/ports/out/RelojPort');
const { Tutoria } = require('../../src/domain/entities/Tutoria');
const { RangoHorario } = require('../../src/domain/value-objects/RangoHorario');
const { EstadoTutoria, Modalidad, Rol } = require('../../src/domain/value-objects/Catalogos');
const { PoliticaPorAnticipacion, PoliticaSinRestriccion, SelectorPoliticaCancelacion } = require('../../src/domain/policies/PoliticasCancelacion');
const { ProgramarTutoria } = require('../../src/application/use-cases/ProgramarTutoria');
const { ActualizarTutoria } = require('../../src/application/use-cases/ActualizarTutoria');
const { CancelarTutoria } = require('../../src/application/use-cases/CancelarTutoria');
const { ConfirmarTutoria } = require('../../src/application/use-cases/ConfirmarTutoria');
const { RealizarTutoria } = require('../../src/application/use-cases/RealizarTutoria');
const { ListarTutorias } = require('../../src/application/use-cases/ListarTutorias');
const { ListarDocentes } = require('../../src/application/use-cases/ListarDocentes');
const { ConsultarDisponibilidad } = require('../../src/application/use-cases/ConsultarDisponibilidad');

const AHORA = Date.parse('2030-03-01T08:00:00-05:00');

class RelojFijo extends RelojPort {
  constructor(ms = AHORA) { super(); this.ms = ms; }
  ahoraMs() { return this.ms; }
}

class TutoriaRepoMemoria extends TutoriaRepositoryPort {
  constructor() { super(); this.filas = new Map(); this.siguiente = 1; }
  #clonar(t) { return new Tutoria({ ...t }); } // evita compartir referencias, como haría una BD real
  async guardar(t) {
    const id = t.id ?? this.siguiente++;
    this.filas.set(id, this.#clonar(Object.assign(this.#clonar(t), { id })));
    return this.#clonar(this.filas.get(id));
  }
  async buscarPorId(id) { return this.filas.has(id) ? this.#clonar(this.filas.get(id)) : null; }
  async listar({ estudianteId, docenteId, estado, fecha } = {}) {
    return [...this.filas.values()].filter((t) => (estudianteId == null || t.estudianteId === estudianteId)
      && (docenteId == null || t.docenteId === docenteId) && (!estado || t.estado === estado)
      && (!fecha || t.rango.fecha === fecha)).map((t) => this.#clonar(t));
  }
  async buscarActivasDeDocenteEnFecha(id, f) { return (await this.listar({ docenteId: id, fecha: f })).filter((t) => t.estaActiva()); }
  async buscarActivasDeEstudianteEnFecha(id, f) { return (await this.listar({ estudianteId: id, fecha: f })).filter((t) => t.estaActiva()); }
  async eliminar(id) { return this.filas.delete(id); }
}

class UsuarioRepoMemoria extends UsuarioRepositoryPort {
  constructor(usuarios) { super(); this.usuarios = new Map(usuarios.map((u) => [u.id, u])); }
  async buscarPorId(id) { return this.usuarios.get(id) ?? null; }
  async listarDocentesActivos() {
    return [...this.usuarios.values()].filter((u) => u.rol === Rol.DOCENTE && u.activo).map((u) => ({ id: u.id, nombre: u.nombre }));
  }
  async buscarEstudiantePorCodigo(codigo) {
    return [...this.usuarios.values()].find((u) => u.rol === Rol.ESTUDIANTE && u.codigo === codigo) ?? null;
  }
}

class NotificadorEspia extends NotificadorPort {
  constructor() { super(); this.enviadas = []; }
  async notificar(usuarioId, aviso) { this.enviadas.push({ usuarioId, ...aviso }); }
}

const USUARIOS = [
  { id: 1, rol: Rol.ADMIN, activo: true, nombre: 'Ana Admin' },
  { id: 2, rol: Rol.DOCENTE, activo: true, nombre: 'Diego Docente' },
  { id: 3, rol: Rol.ESTUDIANTE, activo: true, nombre: 'Sara Estudiante', codigo: '2024003' },
  { id: 4, rol: Rol.ESTUDIANTE, activo: true, nombre: 'Mateo Estudiante', codigo: '2024004' },
  { id: 5, rol: Rol.DOCENTE, activo: true, nombre: 'Laura Docente' },
  { id: 6, rol: Rol.ESTUDIANTE, activo: false, nombre: 'Inactivo' },
];
const actor = (id) => { const u = USUARIOS.find((x) => x.id === id); return { id: u.id, rol: u.rol, correo: `${u.id}@amigo.edu.co` }; };

function crearEscenario({ ahoraMs = AHORA } = {}) {
  const tutoriaRepo = new TutoriaRepoMemoria();
  const usuarioRepo = new UsuarioRepoMemoria(USUARIOS);
  const notificador = new NotificadorEspia();
  const reloj = new RelojFijo(ahoraMs);
  const selectorPolitica = new SelectorPoliticaCancelacion({
    [Rol.ESTUDIANTE]: new PoliticaPorAnticipacion(24),
    [Rol.DOCENTE]: new PoliticaPorAnticipacion(12),
    [Rol.ADMIN]: new PoliticaSinRestriccion(),
  });
  const horasAnticipacionMin = 2;
  return {
    tutoriaRepo, usuarioRepo, notificador, reloj,
    uc: {
      programar: new ProgramarTutoria({ tutoriaRepo, usuarioRepo, notificador, reloj, horasAnticipacionMin }),
      actualizar: new ActualizarTutoria({ tutoriaRepo, notificador, reloj, selectorPolitica, horasAnticipacionMin }),
      cancelar: new CancelarTutoria({ tutoriaRepo, notificador, reloj, selectorPolitica }),
      confirmar: new ConfirmarTutoria({ tutoriaRepo, notificador }),
      realizar: new RealizarTutoria({ tutoriaRepo, reloj }),
      listar: new ListarTutorias({ tutoriaRepo, usuarioRepo }),
      docentes: new ListarDocentes({ usuarioRepo }),
      disponibilidad: new ConsultarDisponibilidad({ tutoriaRepo, usuarioRepo, reloj, horasAnticipacionMin }),
    },
  };
}

function tutoriaDe({ id = null, estudianteId = 3, docenteId = 2, fecha = '2030-03-10', hora = '10:00', duracionMin = 60,
  estado = EstadoTutoria.CONFIRMADA, asignatura = 'Cálculo', modalidad = Modalidad.VIRTUAL } = {}) {
  return new Tutoria({ id, estudianteId, docenteId, asignatura, modalidad, estado, rango: new RangoHorario({ fecha, hora, duracionMin }) });
}

const datosSolicitud = (extra = {}) => ({
  docenteId: 2, asignatura: 'Cálculo', modalidad: 'Virtual', fecha: '2030-03-10', hora: '10:00', duracionMin: 60, ...extra,
});

module.exports = { AHORA, RelojFijo, crearEscenario, tutoriaDe, datosSolicitud, actor, USUARIOS };
