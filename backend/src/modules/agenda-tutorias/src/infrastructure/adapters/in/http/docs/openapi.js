'use strict';
// INFRAESTRUCTURA · Especificación OpenAPI 3.0 servida en /api/docs (Swagger UI) y /api/docs.json.
const ejemploTutoria = {
  id: 12, estudiante_id: 3, docente_id: 2, asignatura: 'Cálculo Diferencial', modalidad: 'Virtual',
  fecha: '2030-03-18', hora: '10:00', hora_fin: '11:00', duracion_min: 60, estado: 'pendiente',
  observaciones: 'Repasar límites', creada_en: '2030-03-10 15:04:05',
};

const ref = (n) => ({ $ref: `#/components/schemas/${n}` });
const json = (schema, example) => ({ content: { 'application/json': { schema, ...(example ? { example } : {}) } } });
const err = (descripcion, codigo, mensaje) => ({
  description: descripcion, ...json(ref('Error'), { error: mensaje, codigo }),
});
const R401 = err('Token ausente, inválido o expirado', 'NO_AUTENTICADO', 'Token requerido (header Authorization: Bearer <token>)');
const R403 = err('El rol/usuario no tiene permiso', 'PROHIBIDO', 'Esta tutoría no te pertenece');
const R404 = err('No existe', 'NO_ENCONTRADO', 'La tutoría 99 no existe');
const R400 = err('Datos de entrada inválidos', 'VALIDACION', 'Hay datos inválidos en la solicitud');
const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 }, example: 12 };
const seguro = [{ bearerAuth: [] }];

const cuerpoTutoria = (requeridos) => ({
  required: true,
  ...json({ type: 'object', required: requeridos, properties: {
    estudiante_id: { type: 'integer', description: 'Para docente/admin: id del estudiante (o usa estudiante_codigo)' },
    estudiante_codigo: { type: 'string', maxLength: 30, description: 'Para docente/admin: código institucional del estudiante, ej. 2024001234' },
    docente_id: { type: 'integer', description: 'Obligatorio si quien crea es estudiante o admin' },
    asignatura: { type: 'string', minLength: 3, maxLength: 100 },
    modalidad: { type: 'string', enum: ['Virtual', 'Presencial'] },
    fecha: { type: 'string', example: '2030-03-18', description: 'YYYY-MM-DD' },
    hora: { type: 'string', example: '10:00', description: 'HH:mm, entre 06:00 y 22:00' },
    duracion_min: { type: 'integer', minimum: 30, maximum: 180, multipleOf: 15, default: 60 },
    observaciones: { type: 'string', maxLength: 500 },
  } }, { docente_id: 2, asignatura: 'Cálculo Diferencial', modalidad: 'Virtual', fecha: '2030-03-18', hora: '10:00', duracion_min: 60, observaciones: 'Repasar límites' }),
});

const accion = (resumen, descripcion, okMensaje, extra = {}) => ({
  patch: {
    tags: ['Tutorías'], summary: resumen, description: descripcion, security: seguro, parameters: [idParam],
    responses: {
      200: { description: okMensaje, ...json({ type: 'object', properties: { mensaje: { type: 'string' }, tutoria: ref('Tutoria') } }) },
      401: R401, 403: R403, 404: R404,
      409: err('Regla de negocio violada', extra.codigo, extra.mensaje),
    },
  },
});

const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Agenda de Tutorías — ConectaProfe',
    version: '1.0.0',
    description: [
      'API del módulo **Agenda de Tutorías** (Arquitectura Hexagonal).',
      '',
      '**Autenticación:** botón *Authorize* → pega el JWT (sin la palabra Bearer). `npm run seed` imprime tokens de prueba.',
      '',
      '**Reglas de negocio (responden 409 con su código):**',
      '- **RN-01** Sin solapamiento de horario para el docente ni para el estudiante.',
      '- **RN-02** Anticipación mínima al programar (2 h por defecto).',
      '- **RN-03** Plazo para cancelar/reprogramar según rol (estudiante 24 h, docente 12 h, admin sin límite).',
      '- **RN-04** Horario institucional 06:00–22:00 (hora de Colombia).',
      '- **RN-05** Transiciones de estado válidas.',
      '- **RN-06** No se marca realizada una tutoría que aún no empieza.',
    ].join('\n'),
  },
  servers: [{ url: '/', description: 'Servidor actual' }],
  tags: [{ name: 'Tutorías' }, { name: 'Sistema' }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Tutoria: { type: 'object', example: ejemploTutoria, properties: {
        id: { type: 'integer' }, estudiante_id: { type: 'integer' }, docente_id: { type: 'integer' },
        asignatura: { type: 'string' }, modalidad: { type: 'string', enum: ['Virtual', 'Presencial'] },
        fecha: { type: 'string' }, hora: { type: 'string' }, hora_fin: { type: 'string' }, duracion_min: { type: 'integer' },
        estado: { type: 'string', enum: ['pendiente', 'confirmada', 'cancelada', 'completada'] },
        observaciones: { type: 'string' }, creada_en: { type: 'string' },
      } },
      Error: { type: 'object', properties: {
        error: { type: 'string' }, codigo: { type: 'string', example: 'RN-01' },
        detalles: { type: 'array', items: { type: 'object', properties: { campo: { type: 'string' }, mensaje: { type: 'string' } } } },
      } },
    },
  },
  paths: {
    '/api/ping': { get: { tags: ['Sistema'], summary: 'Estado del servicio', responses: { 200: { description: 'OK', ...json({ type: 'object' }, { estado: 'ok' }) } } } },
    '/api/tutorias': {
      get: {
        tags: ['Tutorías'], summary: 'Listar tutorías', security: seguro,
        description: 'Estudiante y docente ven solo las suyas; el administrador ve todas (máx. 200).',
        parameters: [
          { name: 'estado', in: 'query', schema: { type: 'string', enum: ['pendiente', 'confirmada', 'cancelada', 'completada'] } },
          { name: 'fecha', in: 'query', schema: { type: 'string' }, example: '2030-03-18' },
        ],
        responses: { 200: { description: 'Lista', ...json({ type: 'array', items: ref('Tutoria') }) }, 400: R400, 401: R401 },
      },
      post: {
        tags: ['Tutorías'], summary: 'Programar / solicitar una tutoría',
        description: 'Estudiante → queda **pendiente** (solicitud). Docente/admin → queda **confirmada**. Aplica RN-01, RN-02 y RN-04.',
        security: seguro, requestBody: cuerpoTutoria(['asignatura', 'modalidad', 'fecha', 'hora']),
        responses: {
          201: { description: 'Creada', ...json({ type: 'object', properties: { mensaje: { type: 'string' }, tutoria: ref('Tutoria') } }, { mensaje: 'Tutoría registrada', tutoria: ejemploTutoria }) },
          400: R400, 401: R401, 403: R403, 404: R404,
          409: err('Regla de negocio violada', 'RN-01', 'El docente ya tiene una tutoría de 10:00 a 11:00 que se cruza con la solicitada'),
        },
      },
    },
    '/api/tutorias/docentes': {
      get: { tags: ['Tutorías'], summary: 'Docentes activos (para el selector de tutor)', security: seguro,
        responses: { 200: { description: 'Lista', ...json({ type: 'array', items: { type: 'object' } }, [{ id: 2, nombre: 'Diego Docente' }]) }, 401: R401 } },
    },
    '/api/tutorias/disponibilidad': {
      get: {
        tags: ['Tutorías'], summary: 'Horarios libres de un docente en una fecha', security: seguro,
        parameters: [
          { name: 'docente_id', in: 'query', required: true, schema: { type: 'integer' }, example: 2 },
          { name: 'fecha', in: 'query', required: true, schema: { type: 'string' }, example: '2030-03-18' },
          { name: 'duracion_min', in: 'query', schema: { type: 'integer', default: 60 } },
        ],
        responses: { 200: { description: 'Horas de inicio disponibles', ...json({ type: 'object' }, { docente_id: 2, fecha: '2030-03-18', duracion_min: 60, horarios_libres: ['06:00', '06:30', '07:00'] }) }, 400: R400, 401: R401, 404: R404 },
      },
    },
    '/api/tutorias/{id}': {
      get: { tags: ['Tutorías'], summary: 'Obtener una tutoría', security: seguro, parameters: [idParam],
        responses: { 200: { description: 'Tutoría', ...json(ref('Tutoria')) }, 400: R400, 401: R401, 403: R403, 404: R404 } },
      put: { tags: ['Tutorías'], summary: 'Reprogramar / editar', security: seguro, parameters: [idParam],
        description: 'Reaplica RN-01, RN-02, RN-04 y exige el plazo RN-03 sobre la tutoría actual.',
        requestBody: cuerpoTutoria(['asignatura', 'modalidad', 'fecha', 'hora']),
        responses: { 200: { description: 'Actualizada', ...json({ type: 'object', properties: { mensaje: { type: 'string' }, tutoria: ref('Tutoria') } }) }, 400: R400, 401: R401, 403: R403, 404: R404,
          409: err('Regla de negocio violada', 'RN-03', 'Solo se puede cancelar o reprogramar con 24 h de anticipación (faltan 3.0 h)') } },
      delete: { tags: ['Tutorías'], summary: 'Eliminar (solo administrador)', security: seguro, parameters: [idParam],
        responses: { 200: { description: 'Eliminada', ...json({ type: 'object' }, { mensaje: 'Tutoría eliminada' }) }, 400: R400, 401: R401, 403: R403, 404: R404 } },
    },
    '/api/tutorias/{id}/cancelar': accion('Cancelar tutoría', 'Regla **RN-03** resuelta con el patrón Strategy según el rol.', 'Cancelada', { codigo: 'RN-03', mensaje: 'Solo se puede cancelar o reprogramar con 24 h de anticipación (faltan 3.0 h)' }),
    '/api/tutorias/{id}/confirmar': accion('Confirmar tutoría (docente asignado o admin)', 'Solo desde el estado `pendiente`.', 'Confirmada', { codigo: 'RN-05', mensaje: 'Solo se confirman tutorías pendientes (estado actual: "cancelada")' }),
    '/api/tutorias/{id}/realizar': accion('Marcar como realizada (docente asignado o admin)', 'Solo desde `confirmada` y una vez iniciada.', 'Completada', { codigo: 'RN-06', mensaje: 'No se puede marcar como realizada una tutoría que aún no ha comenzado' }),
  },
};

module.exports = { openapi };
