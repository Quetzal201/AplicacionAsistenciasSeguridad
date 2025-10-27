const express = require('express');
const router = express.Router();
const controller = require('../controllers/usuarios.controller');
const { verifyToken, requireAdmin } = require('../middlewares/auth.middleware');

router.get('/', verifyToken, controller.listUsuarios);
router.post('/', verifyToken, requireAdmin, controller.createUsuario);
router.get('/:id', verifyToken, controller.getUsuario);
router.patch('/:id', verifyToken, controller.updateUsuario);
router.delete('/:id', verifyToken, requireAdmin, controller.deleteUsuario);

module.exports = router;
