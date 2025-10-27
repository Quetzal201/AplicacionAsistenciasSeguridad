const express = require('express');
const router = express.Router();
const controller = require('../controllers/turnos.controller');
const { verifyToken, requireAdmin } = require('../middlewares/auth.middleware');

router.get('/', verifyToken, controller.listTurnos);
router.post('/', verifyToken, requireAdmin, controller.createTurno);
router.patch('/:id', verifyToken, requireAdmin, controller.updateTurno);
router.delete('/:id', verifyToken, requireAdmin, controller.deleteTurno);

module.exports = router;
