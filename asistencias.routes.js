const express = require('express');
const router = express.Router();
const controller = require('../controllers/asistencias.controller');
const { verifyToken, requireAdmin } = require('../middlewares/auth.middleware');

router.get('/', verifyToken, controller.listAsistencias);
router.post('/', verifyToken, controller.createAsistencia);
router.patch('/:id', verifyToken, controller.updateAsistencia);
router.delete('/:id', verifyToken, requireAdmin, controller.deleteAsistencia);

module.exports = router;
