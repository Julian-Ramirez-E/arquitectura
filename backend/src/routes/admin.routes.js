const router = require('express').Router();
const { autenticar } = require('../middlewares/autenticar');
const { soloRol }    = require('../middlewares/soloRol');
const ctrl = require('../controllers/adminController');

router.use(autenticar, soloRol('admin'));

router.get('/usuarios',              ctrl.listarUsuarios);
router.patch('/usuarios/:id/estado', ctrl.cambiarEstado);
router.get('/estadisticas',          ctrl.estadisticas);
router.post('/notificaciones',       ctrl.enviarNotificacion);
router.get('/auditoria',             ctrl.verAuditoria);

module.exports = router;
