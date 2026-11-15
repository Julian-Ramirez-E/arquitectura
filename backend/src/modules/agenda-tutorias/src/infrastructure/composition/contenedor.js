'use strict';
// INFRAESTRUCTURA · RAÍZ DE COMPOSICIÓN: el ÚNICO archivo que conoce a la vez los puertos y sus implementaciones.
// Cambiar SQLite por PostgreSQL = cambiar UNA línea de aquí; dominio y aplicación no se tocan (DIP).
const { crearConexion, migrar } = require('../adapters/out/persistence/SqliteConexion');
const { SqliteTutoriaRepository } = require('../adapters/out/persistence/SqliteTutoriaRepository');
const { SqliteUsuarioRepository } = require('../adapters/out/persistence/SqliteUsuarioRepository');
const { SqliteNotificador } = require('../adapters/out/notifications/SqliteNotificador');
const { RelojSistema } = require('../adapters/out/clock/RelojSistema');
const { crearApp } = require('../adapters/in/http/crearApp');

const { PoliticaPorAnticipacion, PoliticaSinRestriccion, SelectorPoliticaCancelacion } = require('../../domain/policies/PoliticasCancelacion');
const { Rol } = require('../../domain/value-objects/Catalogos');

const { ProgramarTutoria } = require('../../application/use-cases/ProgramarTutoria');
const { ListarDocentes } = require('../../application/use-cases/ListarDocentes');
const { ListarTutorias } = require('../../application/use-cases/ListarTutorias');
const { ObtenerTutoria } = require('../../application/use-cases/ObtenerTutoria');
const { ActualizarTutoria } = require('../../application/use-cases/ActualizarTutoria');
const { EliminarTutoria } = require('../../application/use-cases/EliminarTutoria');
const { CancelarTutoria } = require('../../application/use-cases/CancelarTutoria');
const { ConfirmarTutoria } = require('../../application/use-cases/ConfirmarTutoria');
const { RealizarTutoria } = require('../../application/use-cases/RealizarTutoria');
const { ConsultarDisponibilidad } = require('../../application/use-cases/ConsultarDisponibilidad');

/** Arma los casos de uso sobre una conexión SQLite ya abierta (la reutiliza ConectaProfe: misma BD). */
function construirCasosDeUso(db, reglas) {
  const tutoriaRepo = new SqliteTutoriaRepository(db);
  const usuarioRepo = new SqliteUsuarioRepository(db);
  const notificador = new SqliteNotificador(db);
  const reloj = new RelojSistema();

  // Estrategias de cancelación (RN-03) registradas por rol
  const selectorPolitica = new SelectorPoliticaCancelacion({
    [Rol.ESTUDIANTE]: new PoliticaPorAnticipacion(reglas.horasCancelacionEstudiante),
    [Rol.DOCENTE]: new PoliticaPorAnticipacion(reglas.horasCancelacionDocente),
    [Rol.ADMIN]: new PoliticaSinRestriccion(),
  });

  const { horasAnticipacionMin } = reglas;
  return {
    programar: new ProgramarTutoria({ tutoriaRepo, usuarioRepo, notificador, reloj, horasAnticipacionMin }),
    listar: new ListarTutorias({ tutoriaRepo, usuarioRepo }),
    obtener: new ObtenerTutoria({ tutoriaRepo }),
    actualizar: new ActualizarTutoria({ tutoriaRepo, notificador, reloj, selectorPolitica, horasAnticipacionMin }),
    eliminar: new EliminarTutoria({ tutoriaRepo }),
    cancelar: new CancelarTutoria({ tutoriaRepo, notificador, reloj, selectorPolitica }),
    confirmar: new ConfirmarTutoria({ tutoriaRepo, notificador }),
    realizar: new RealizarTutoria({ tutoriaRepo, reloj }),
    disponibilidad: new ConsultarDisponibilidad({ tutoriaRepo, usuarioRepo, reloj, horasAnticipacionMin }),
    docentes: new ListarDocentes({ usuarioRepo }),
  };
}

/** Modo independiente (módulo solo): abre su propia BD y levanta su propio Express. */
function construirAplicacion(config) {
  const db = crearConexion(config.dbPath);
  migrar(db);
  const casosDeUso = construirCasosDeUso(db, config.reglas);
  const app = crearApp({ casosDeUso, config });
  return { app, db };
}

module.exports = { construirAplicacion, construirCasosDeUso };
