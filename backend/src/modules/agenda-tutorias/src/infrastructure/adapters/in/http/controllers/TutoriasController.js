'use strict';
// INFRAESTRUCTURA · ADAPTADOR DE ENTRADA. El controlador es "tonto" a propósito:
//   1) valida la forma (DTO)  2) llama al PUERTO de entrada  3) formatea la respuesta.
// No hay reglas de negocio, ni SQL, ni `if (rol === ...)`.
const dto = require('../dtos/TutoriaDtos');

class TutoriasController {
  constructor(casosDeUso) { this.uc = casosDeUso; }

  crear = async (req, res) => {
    const tutoria = await this.uc.programar.ejecutar({ actor: req.actor, datos: dto.validarCrear(req.body) });
    res.status(201).json({ mensaje: 'Tutoría registrada', tutoria: dto.aRespuesta(tutoria) });
  };

  listar = async (req, res) => {
    const tutorias = await this.uc.listar.ejecutar({ actor: req.actor, filtros: dto.validarFiltros(req.query) });
    res.status(200).json(tutorias.map(dto.aRespuestaConNombres));
  };

  obtener = async (req, res) => {
    const tutoria = await this.uc.obtener.ejecutar({ actor: req.actor, id: dto.validarId(req.params.id) });
    res.status(200).json(dto.aRespuesta(tutoria));
  };

  actualizar = async (req, res) => {
    const tutoria = await this.uc.actualizar.ejecutar({
      actor: req.actor, id: dto.validarId(req.params.id), cambios: dto.validarActualizar(req.body),
    });
    res.status(200).json({ mensaje: 'Tutoría actualizada', tutoria: dto.aRespuesta(tutoria) });
  };

  eliminar = async (req, res) => {
    await this.uc.eliminar.ejecutar({ actor: req.actor, id: dto.validarId(req.params.id) });
    res.status(200).json({ mensaje: 'Tutoría eliminada' });
  };

  cancelar = async (req, res) => {
    const tutoria = await this.uc.cancelar.ejecutar({ actor: req.actor, id: dto.validarId(req.params.id) });
    res.status(200).json({ mensaje: 'Tutoría cancelada', tutoria: dto.aRespuesta(tutoria) });
  };

  confirmar = async (req, res) => {
    const tutoria = await this.uc.confirmar.ejecutar({ actor: req.actor, id: dto.validarId(req.params.id) });
    res.status(200).json({ mensaje: 'Tutoría confirmada', tutoria: dto.aRespuesta(tutoria) });
  };

  realizar = async (req, res) => {
    const tutoria = await this.uc.realizar.ejecutar({ actor: req.actor, id: dto.validarId(req.params.id) });
    res.status(200).json({ mensaje: 'Tutoría completada', tutoria: dto.aRespuesta(tutoria) });
  };

  docentes = async (req, res) => {
    res.status(200).json(await this.uc.docentes.ejecutar());
  };

  disponibilidad = async (req, res) => {
    const resultado = await this.uc.disponibilidad.ejecutar(dto.validarDisponibilidad(req.query));
    res.status(200).json({
      docente_id: resultado.docenteId, fecha: resultado.fecha,
      duracion_min: resultado.duracionMin, horarios_libres: resultado.horariosLibres,
    });
  };
}

module.exports = { TutoriasController };
